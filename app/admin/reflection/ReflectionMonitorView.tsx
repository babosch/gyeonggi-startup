'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  REFLECTION_TABS, type ReflectionTabId, TAB_FIELD_IDS,
  CHECKLIST_ITEMS, SELF_EVAL_ITEMS, CONCEPT_ROWS, PRODUCER_SCARCITY_FIELDS,
  CONSUMER_DEEP_QUESTIONS, PRODUCER_DEEP_QUESTIONS,
} from '@/lib/reflection'
import type { MonitorStudent, MonitorResponse } from './page'

interface Props {
  cityName: string
  classId: string
  students: MonitorStudent[]
  initialResponses: MonitorResponse[]
  initialSubmitted: Record<string, Record<string, boolean>>
}

const FIELD_LABEL: Record<string, string> = {
  purchase_reasons: '구매 내역·산 까닭', checklist: '합리적 선택 체크리스트', checklist_summary: '나의 소비 한 문장 평가',
  selected_question: '선택한 질문', my_opinion: '토의 후 나의 생각',
  sales_data: '판매 내역', scarcity: '한정된 것(희소성)', choice_made: '우리 모둠의 선택', customer_criteria: '손님의 선택 기준',
  concept_scarcity: '희소성 경험', concept_rational: '합리적 선택 경험', concept_prod_cons: '생산·소비 경험', concept_exchange: '교류·상호 의존 경험',
  core_sentence: '나만의 핵심 문장', self_eval: '자기 평가',
}

function fmt(tab: string, field: string, value: unknown): string {
  if (value === undefined || value === null || value === '') return ''
  if (field === 'checklist' && typeof value === 'object') {
    const v = value as Record<string, string>
    return CHECKLIST_ITEMS.map((it, i) => `${i + 1}. ${v[it.key] ?? '-'}`).join(' / ')
  }
  if (field === 'self_eval' && typeof value === 'object') {
    const v = value as Record<string, string>
    return SELF_EVAL_ITEMS.map(it => `${it.area}: ${v[it.key] ?? '-'}`).join(' / ')
  }
  if (field === 'selected_question') {
    return `${value}번`
  }
  if (field === 'purchase_reasons' && Array.isArray(value)) {
    return value.map((r) => {
      const x = r as { product?: string; price?: number; place?: string; reason?: string }
      return `${x.product ?? ''}(${(x.price ?? 0).toLocaleString()}원, ${x.place ?? ''}) → ${x.reason ?? ''}`
    }).join('\n')
  }
  if (field === 'sales_data' && Array.isArray(value)) {
    return value.map((r) => {
      const x = r as { product?: string; price?: number; count?: number; cost?: number; profit?: number }
      return `${x.product ?? ''} 판매가 ${(x.price ?? 0).toLocaleString()} · 재료비 ${(x.cost ?? 0).toLocaleString()} · ${x.count ?? 0}개 · 이익 ${(x.profit ?? 0).toLocaleString()}`
    }).join('\n')
  }
  if (typeof value === 'string') return value
  return JSON.stringify(value)
}

export default function ReflectionMonitorView({ cityName, classId, students, initialResponses, initialSubmitted }: Props) {
  const router = useRouter()
  const supabase = useRef(createClient()).current

  const [responses, setResponses] = useState<MonitorResponse[]>(initialResponses)
  const [submitted, setSubmitted] = useState<Record<string, Record<string, boolean>>>(initialSubmitted)
  const [flash, setFlash] = useState<Record<string, boolean>>({})
  const [selected, setSelected] = useState<MonitorStudent | null>(null)
  const [filterTab, setFilterTab] = useState<ReflectionTabId | null>(null)
  const [mirror, setMirror] = useState<Record<string, unknown>>({}) // 열어둔 학생의 실시간 필드
  const selectedRef = useRef<MonitorStudent | null>(null)
  selectedRef.current = selected

  // value 조회: 열어둔 학생이면 mirror(broadcast) 우선, 없으면 DB
  const valueMap = useMemo(() => {
    const m: Record<string, unknown> = {}
    for (const r of responses) m[`${r.user_id}:${r.tab_id}:${r.field_id}`] = r.value
    return m
  }, [responses])

  // 학생별 탭 상태
  function tabState(userId: string, tab: ReflectionTabId): '○' | '●' | '✓' {
    if (submitted[userId]?.[tab]) return '✓'
    const has = TAB_FIELD_IDS[tab].some(f => {
      const v = valueMap[`${userId}:${tab}:${f}`]
      return v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0)
    })
    return has ? '●' : '○'
  }
  function submittedCount(userId: string): number {
    return REFLECTION_TABS.filter(t => submitted[userId]?.[t.id]).length
  }

  // ── Realtime ──
  useEffect(() => {
    const dataCh = supabase.channel(`refl-monitor:${classId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reflection_responses', filter: `class_id=eq.${classId}` }, (payload) => {
        const row = payload.new as MonitorResponse
        if (!row?.user_id) return
        setResponses(prev => {
          const i = prev.findIndex(r => r.user_id === row.user_id && r.tab_id === row.tab_id && r.field_id === row.field_id)
          if (i >= 0) { const next = [...prev]; next[i] = row; return next }
          return [...prev, row]
        })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reflection_tab_status', filter: `class_id=eq.${classId}` }, (payload) => {
        const row = payload.new as { user_id: string; tab_id: string; submitted: boolean }
        if (!row?.user_id) return
        setSubmitted(prev => ({ ...prev, [row.user_id]: { ...prev[row.user_id], [row.tab_id]: row.submitted } }))
        if (row.submitted) {
          setFlash(f => ({ ...f, [row.user_id]: true }))
          setTimeout(() => setFlash(f => ({ ...f, [row.user_id]: false })), 1500)
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(dataCh) }
  }, [classId, supabase])

  // ── Broadcast 미러링 (개별 뷰 열었을 때만) ──
  useEffect(() => {
    if (!selected) { setMirror({}); return }
    const ch = supabase.channel(`reflection:${classId}`, { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'field' }, ({ payload }) => {
        const p = payload as { user_id: string; tab_id: string; field_id: string; value: unknown }
        if (p.user_id !== selectedRef.current?.id) return
        setMirror(prev => ({ ...prev, [`${p.tab_id}:${p.field_id}`]: p.value }))
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [selected, classId, supabase])

  // ESC 닫기
  useEffect(() => {
    if (!selected) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelected(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected])

  const getStudentValue = useCallback((student: MonitorStudent, tab: string, field: string): unknown => {
    if (selectedRef.current?.id === student.id && mirror[`${tab}:${field}`] !== undefined) return mirror[`${tab}:${field}`]
    return valueMap[`${student.id}:${tab}:${field}`]
  }, [mirror, valueMap])

  // ── CSV ──
  function exportCsv() {
    const header = ['번호', '닉네임', '소속 기업', '탭', '필드', '답변 내용']
    const lines = [header.join(',')]
    for (const s of students) {
      for (const tab of REFLECTION_TABS) {
        for (const field of TAB_FIELD_IDS[tab.id]) {
          const raw = valueMap[`${s.id}:${tab.id}:${field}`]
          const text = fmt(tab.id, field, raw).replace(/"/g, '""').replace(/\n/g, ' / ')
          if (!text) continue
          lines.push([s.number, `"${s.nickname ?? ''}"`, `"${s.companyName ?? ''}"`, `"${tab.name}"`, `"${FIELD_LABEL[field] ?? field}"`, `"${text}"`].join(','))
        }
      }
    }
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `성찰_${cityName}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <button onClick={() => router.push('/home')}
          className="flex items-center gap-1.5 text-red-500 font-bold text-lg mb-4 active:scale-95 transition-all">
          <span className="text-2xl leading-none font-black">←</span><span>이전으로</span>
        </button>

        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">🪞 성찰 모니터링</h1>
            <p className="text-sm text-gray-400">{cityName} · 학생 카드를 누르면 답변을 크게 봐요</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setFilterTab(filterTab ? null : 'consumer_review')}
              className="text-sm border-2 border-gray-200 rounded-xl px-3 py-2 font-bold text-gray-600 active:scale-95">
              {filterTab ? '전체 현황' : '탭별 모아보기'}
            </button>
            <button onClick={exportCsv}
              className="text-sm bg-green-500 text-white rounded-xl px-3 py-2 font-bold active:scale-95">⬇ CSV</button>
          </div>
        </div>

        {filterTab ? (
          <FilterView
            filterTab={filterTab} setFilterTab={setFilterTab}
            students={students} valueMap={valueMap}
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {students.map(s => (
              <button key={s.id} onClick={() => setSelected(s)}
                className={`bg-white rounded-2xl p-3 shadow-sm text-left border-2 transition-all active:scale-[0.98]
                  ${flash[s.id] ? 'border-green-400' : 'border-transparent'}`}>
                <div className="font-bold text-gray-800 text-sm truncate">{s.nickname ?? `${s.number}번`}</div>
                <div className="text-xs text-gray-400 mb-2 truncate">{s.companyName ?? ROLE_KO[s.role] ?? ''}</div>
                <div className="flex gap-1">
                  {REFLECTION_TABS.map((t, i) => {
                    const st = tabState(s.id, t.id)
                    return (
                      <span key={t.id} title={t.name}
                        className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold
                          ${st === '✓' ? 'bg-green-100 text-green-600' : st === '●' ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-300'}`}>
                        {i + 1}
                      </span>
                    )
                  })}
                </div>
                <div className="text-[10px] text-gray-400 mt-1">{submittedCount(s.id)}/5 제출</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 개별 뷰 모달 */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-3xl w-full max-w-3xl h-[85vh] flex flex-col shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div>
                <div className="font-bold text-gray-800 text-lg">{selected.nickname ?? `${selected.number}번`}
                  <span className="text-sm text-gray-400 font-medium ml-2">{selected.companyName ?? ROLE_KO[selected.role] ?? ''}</span></div>
                <div className="text-sm text-gray-500">{submittedCount(selected.id)}/5 탭 제출 완료</div>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 text-2xl w-9 h-9 rounded-full hover:bg-gray-100">✕</button>
            </div>
            <div className="overflow-y-auto p-5 flex flex-col gap-4">
              {REFLECTION_TABS.map(tab => {
                const isSub = submitted[selected.id]?.[tab.id]
                return (
                  <div key={tab.id} className={`rounded-2xl p-4 ${isSub ? 'bg-green-50' : 'bg-gray-50'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-bold text-gray-800">{tab.emoji} {tab.name}</span>
                      <span className={`text-xs font-bold rounded-full px-2 py-0.5 ${isSub ? 'bg-green-200 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                        {isSub ? '✓ 제출 완료' : '● 작성 중'}
                      </span>
                    </div>
                    <div className="flex flex-col gap-2">
                      {TAB_FIELD_IDS[tab.id].map(field => {
                        const raw = getStudentValue(selected, tab.id, field)
                        const text = fmt(tab.id, field, raw)
                        return (
                          <div key={field}>
                            <div className="text-xs font-medium text-gray-400">{FIELD_LABEL[field] ?? field}
                              {field === 'selected_question' && text && questionText(tab.id, raw)}</div>
                            {text
                              ? <div className="text-sm text-gray-800 whitespace-pre-line">{text}</div>
                              : <div className="text-sm text-gray-400 italic">아직 작성하지 않았습니다</div>}
                          </div>
                        )
                      })}
                    </div>
                    {!isSub && TAB_FIELD_IDS[tab.id].some(f => fmt(tab.id, f, valueMap[`${selected.id}:${tab.id}:${f}`])) && (
                      <div className="text-xs text-gray-400 mt-2">(임시저장 — 아직 제출되지 않았습니다)</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const ROLE_KO: Record<string, string> = { applicant: '지원자', ceo: 'CEO', staff: '직원', officer: '공무원' }

function questionText(tab: string, no: unknown) {
  const list = tab === 'consumer_deep' ? CONSUMER_DEEP_QUESTIONS : tab === 'producer_deep' ? PRODUCER_DEEP_QUESTIONS : []
  const q = list.find(x => x.no === Number(no))
  return q ? <span className="text-gray-500 font-normal"> — {q.text}</span> : null
}

// ── 탭별 모아보기 ──
function FilterView({ filterTab, setFilterTab, students, valueMap }: {
  filterTab: ReflectionTabId
  setFilterTab: (t: ReflectionTabId) => void
  students: MonitorStudent[]
  valueMap: Record<string, unknown>
}) {
  const isDeep = filterTab === 'consumer_deep' || filterTab === 'producer_deep'
  const questions = filterTab === 'consumer_deep' ? CONSUMER_DEEP_QUESTIONS : filterTab === 'producer_deep' ? PRODUCER_DEEP_QUESTIONS : []

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
        {REFLECTION_TABS.map(t => (
          <button key={t.id} onClick={() => setFilterTab(t.id)}
            className={`shrink-0 rounded-2xl px-3 py-2 text-sm font-bold border-2 ${filterTab === t.id ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white border-gray-200 text-gray-500'}`}>
            {t.name}
          </button>
        ))}
      </div>

      {isDeep ? (
        <div className="flex flex-col gap-4">
          {questions.map(q => {
            const answered = students.filter(s => Number(valueMap[`${s.id}:${filterTab}:selected_question`]) === q.no)
            if (answered.length === 0) return null
            return (
              <div key={q.no} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="font-bold text-gray-800 mb-2"><span className="text-blue-500">{q.no}번</span> {q.text}</div>
                <div className="flex flex-col gap-2">
                  {answered.map(s => (
                    <div key={s.id} className="text-sm border-t border-gray-100 pt-2">
                      <span className="font-bold text-gray-600">{s.nickname ?? `${s.number}번`}</span>
                      <span className="text-gray-800 ml-2 whitespace-pre-line">{fmt(filterTab, 'my_opinion', valueMap[`${s.id}:${filterTab}:my_opinion`]) || '—'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {students.map(s => (
            <div key={s.id} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="font-bold text-gray-700 text-sm mb-1">{s.nickname ?? `${s.number}번`} <span className="text-gray-400 font-normal">{s.companyName ?? ''}</span></div>
              <div className="flex flex-col gap-1">
                {TAB_FIELD_IDS[filterTab].map(f => {
                  const text = fmt(filterTab, f, valueMap[`${s.id}:${filterTab}:${f}`])
                  if (!text) return null
                  return <div key={f} className="text-sm text-gray-800"><span className="text-gray-400 text-xs">{FIELD_LABEL[f] ?? f}: </span><span className="whitespace-pre-line">{text}</span></div>
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
