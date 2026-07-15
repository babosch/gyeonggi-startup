'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cityTheme } from '@/lib/types'
import {
  REFLECTION_TABS, type ReflectionTabId,
  CHECKLIST_ITEMS, CHECKLIST_CHOICES, CHECKLIST_SUMMARY_LABEL,
  CONSUMER_DEEP_QUESTIONS, PRODUCER_DEEP_QUESTIONS, DEEP_OPINION_PLACEHOLDER,
  PRODUCER_SCARCITY_FIELDS,
  CONCEPT_ROWS, CONCEPT_CELL_LABEL, CORE_SENTENCE_LABEL, CORE_SENTENCE_EXAMPLE,
  SELF_EVAL_ITEMS, SELF_EVAL_CHOICES,
} from '@/lib/reflection'
import type { PurchaseRow, SalesRow } from './page'

interface Props {
  userId: string
  classId: string
  cityName: string
  color: string
  number: number
  nickname: string | null
  companyName: string | null
  purchases: PurchaseRow[]
  totals: { totalHad: number; totalSpent: number; balance: number }
  sales: SalesRow[]
  savedValues: Record<string, unknown>
  submitted: Record<string, boolean>
}

type PurchaseEntry = { transaction_id: string | null; product: string; price: number; place: string; reason: string; auto: boolean; multi?: boolean }
type SalesEntry = { product: string; price: number; count: number; income: number; cost: number; profit: number }

export default function ReflectionView(props: Props) {
  const router = useRouter()
  const supabase = useRef(createClient()).current
  const theme = cityTheme(props.color)

  const [active, setActive] = useState<ReflectionTabId>('consumer_review')
  const [values, setValues] = useState<Record<string, unknown>>(props.savedValues)
  const [submitted, setSubmitted] = useState<Record<string, boolean>>(props.submitted)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  const dirty = useRef<Set<string>>(new Set())
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const throttleRef = useRef<Record<string, number>>({})
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const valuesRef = useRef(values)
  valuesRef.current = values

  const key = (tab: ReflectionTabId, field: string) => `${tab}:${field}`

  const getVal = useCallback(<T,>(tab: ReflectionTabId, field: string, dflt: T): T => {
    const v = values[key(tab, field)]
    return (v === undefined || v === null) ? dflt : (v as T)
  }, [values])

  // ── 저장 (dirty 필드 일괄 upsert) ──
  const flush = useCallback(async () => {
    if (dirty.current.size === 0) return
    const keys = [...dirty.current]
    dirty.current.clear()
    const rows = keys.map(k => {
      const [tab, field] = k.split(':')
      const v = valuesRef.current[k]
      return {
        user_id: props.userId, class_id: props.classId,
        tab_id: tab, field_id: field,
        value: v === undefined ? '' : v,
        updated_at: new Date().toISOString(),
      }
    })
    setSaveStatus('saving')
    const { error } = await supabase.from('reflection_responses').upsert(rows, { onConflict: 'user_id,tab_id,field_id' })
    if (error) { keys.forEach(k => dirty.current.add(k)); setSaveStatus('idle'); return }
    setSaveStatus('saved')
  }, [props.userId, props.classId, supabase])

  // ── 필드 변경 ──
  function change(tab: ReflectionTabId, field: string, value: unknown) {
    if (submitted[tab]) return
    setValues(prev => ({ ...prev, [key(tab, field)]: value }))
    dirty.current.add(key(tab, field))
    setSaveStatus('idle')
    // 5초 debounce 자동 저장
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { flush() }, 5000)
    // 3초 throttle broadcast (실시간 엿보기)
    const now = Date.now()
    if (!throttleRef.current[field] || now - throttleRef.current[field] > 3000) {
      throttleRef.current[field] = now
      channelRef.current?.send({
        type: 'broadcast', event: 'field',
        payload: { user_id: props.userId, tab_id: tab, field_id: field, value, timestamp: now },
      })
    }
  }

  // ── 탭 이동 시 저장 ──
  async function switchTab(tab: ReflectionTabId) {
    await flush()
    setActive(tab)
  }

  // ── 제출 / 수정 ──
  async function submitTab(tab: ReflectionTabId) {
    await flush()
    const { error } = await supabase.from('reflection_tab_status').upsert(
      { user_id: props.userId, class_id: props.classId, tab_id: tab, submitted: true, submitted_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { onConflict: 'user_id,tab_id' },
    )
    if (!error) setSubmitted(prev => ({ ...prev, [tab]: true }))
  }
  async function editTab(tab: ReflectionTabId) {
    const { error } = await supabase.from('reflection_tab_status').upsert(
      { user_id: props.userId, class_id: props.classId, tab_id: tab, submitted: false, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,tab_id' },
    )
    if (!error) setSubmitted(prev => ({ ...prev, [tab]: false }))
  }

  useEffect(() => {
    // broadcast 채널 구독
    const ch = supabase.channel(`reflection:${props.classId}`, { config: { broadcast: { self: false } } })
    ch.subscribe()
    channelRef.current = ch
    // 페이지 이탈 시 저장
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty.current.size > 0) { flush(); e.preventDefault(); e.returnValue = '' }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      flush()
      supabase.removeChannel(ch)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.classId])

  // 탭 상태 아이콘 계산: ✓ 제출 / ● 작성중(내용 있음) / ○ 미작성
  function tabState(tab: ReflectionTabId): '○' | '●' | '✓' {
    if (submitted[tab]) return '✓'
    const hasContent = Object.keys(values).some(k => k.startsWith(`${tab}:`) && !isEmpty(values[k]))
    return hasContent ? '●' : '○'
  }
  const allSubmitted = REFLECTION_TABS.every(t => submitted[t.id])

  const readOnly = submitted[active]

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-3xl mx-auto">
        <button onClick={() => router.push('/home')}
          className="flex items-center gap-1.5 text-red-500 font-bold text-lg mb-4 active:scale-95 transition-all">
          <span className="text-2xl leading-none font-black">←</span><span>이전으로</span>
        </button>

        <h1 className="text-2xl font-bold text-gray-800 mb-1 flex items-center gap-2">🪞 성찰</h1>
        <p className="text-sm text-gray-400 mb-3">{props.cityName} · {props.nickname ?? `${props.number}번`}{props.companyName ? ` · ${props.companyName}` : ''}</p>

        {allSubmitted && (
          <div className="bg-green-100 text-green-800 font-bold rounded-2xl px-4 py-3 text-center mb-3">
            🎉 모든 활동이 제출되었습니다
          </div>
        )}

        {/* 탭 바 (가로 스크롤) */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-3 -mx-1 px-1 sticky top-0 bg-gray-50 z-10">
          {REFLECTION_TABS.map((t, i) => {
            const st = tabState(t.id)
            const on = active === t.id
            return (
              <button key={t.id} onClick={() => switchTab(t.id)}
                className={`shrink-0 rounded-2xl px-3 py-2 text-sm font-bold border-2 flex items-center gap-1.5 transition-all
                  ${on ? `${theme.soft} ${theme.border} ${theme.accent}` : 'bg-white border-gray-200 text-gray-500'}`}>
                <span>{i + 1}. {t.name}</span>
                <span className={st === '✓' ? 'text-green-500' : st === '●' ? 'text-amber-500' : 'text-gray-300'}>{st}</span>
              </button>
            )
          })}
        </div>

        {/* 저장 상태 */}
        <div className="text-right text-xs text-gray-400 h-4 mb-1">
          {saveStatus === 'saving' ? '저장 중…' : saveStatus === 'saved' ? '저장 완료 ✓' : ''}
        </div>

        <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm">
          {active === 'consumer_review' && <ConsumerReview {...props} getVal={getVal} change={change} readOnly={readOnly} />}
          {active === 'consumer_deep' && <DeepTab tab="consumer_deep" questions={CONSUMER_DEEP_QUESTIONS} getVal={getVal} change={change} readOnly={readOnly} />}
          {active === 'producer_review' && <ProducerReview {...props} getVal={getVal} change={change} readOnly={readOnly} />}
          {active === 'producer_deep' && <DeepTab tab="producer_deep" questions={PRODUCER_DEEP_QUESTIONS} getVal={getVal} change={change} readOnly={readOnly} />}
          {active === 'concept_eval' && <ConceptEval getVal={getVal} change={change} readOnly={readOnly} />}

          {/* 제출 버튼 */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            {submitted[active] ? (
              <div className="flex items-center gap-3">
                <span className="flex-1 text-center text-green-600 font-bold py-3">제출 완료 ✓</span>
                <button onClick={() => editTab(active)}
                  className="px-5 py-3 rounded-2xl border-2 border-gray-200 text-gray-600 font-bold active:scale-95">
                  수정하기
                </button>
              </div>
            ) : (
              <button onClick={() => submitTab(active)}
                className={`w-full py-4 rounded-2xl text-white font-bold text-lg active:scale-95 transition-transform ${theme.solid}`}>
                제출하기
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function isEmpty(v: unknown): boolean {
  if (v === undefined || v === null || v === '') return true
  if (Array.isArray(v)) return v.length === 0 || v.every(x => isEmpty(typeof x === 'object' && x ? Object.values(x).filter(vv => vv !== null && typeof vv !== 'number' && typeof vv !== 'boolean') : x))
  if (typeof v === 'object') return Object.values(v).every(isEmpty)
  return false
}

// 공통 타입
type TabProps = {
  getVal: <T>(tab: ReflectionTabId, field: string, dflt: T) => T
  change: (tab: ReflectionTabId, field: string, value: unknown) => void
  readOnly: boolean
}

function Segmented({ choices, value, onChange, readOnly }: {
  choices: readonly string[]; value: string; onChange: (v: string) => void; readOnly: boolean
}) {
  return (
    <div className="flex gap-1.5">
      {choices.map(c => (
        <button key={c} disabled={readOnly} onClick={() => onChange(c)}
          className={`flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-all disabled:opacity-100
            ${value === c ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white border-gray-200 text-gray-500'}`}>
          {c}
        </button>
      ))}
    </div>
  )
}

function Area({ value, onChange, readOnly, rows = 3, placeholder }: {
  value: string; onChange: (v: string) => void; readOnly: boolean; rows?: number; placeholder?: string
}) {
  return (
    <textarea value={value} onChange={e => onChange(e.target.value)} readOnly={readOnly} rows={rows} placeholder={placeholder}
      className={`w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-gray-800 focus:border-blue-400 outline-none resize-y
        ${readOnly ? 'bg-gray-50' : 'bg-white'}`} />
  )
}

// ── 탭1: 소비자 돌아보기 ──
function ConsumerReview({ purchases, totals, getVal, change, readOnly }: Props & TabProps) {
  const rows = getVal<PurchaseEntry[]>('consumer_review', 'purchase_reasons',
    purchases.map(p => ({ transaction_id: p.transaction_id, product: p.product, price: p.price, place: p.place, reason: '', auto: true, multi: p.multi })))
  const checklist = getVal<Record<string, string>>('consumer_review', 'checklist', {})

  function setRows(next: PurchaseEntry[]) { change('consumer_review', 'purchase_reasons', next) }
  function updateRow(i: number, patch: Partial<PurchaseEntry>) { setRows(rows.map((r, idx) => idx === i ? { ...r, ...patch } : r)) }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="font-bold text-gray-800 mb-2">🛒 내 구매 내역</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[520px]">
            <thead><tr className="text-gray-400 text-xs">
              <th className="text-left font-medium pb-1">물건 이름</th>
              <th className="text-right font-medium pb-1 w-16">가격</th>
              <th className="text-left font-medium pb-1 w-28">산 곳</th>
              <th className="text-left font-medium pb-1">산 까닭</th>
            </tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-gray-100">
                  <td className="py-1.5 pr-1">
                    <input value={r.product} readOnly={readOnly || (r.auto && !r.multi)} onChange={e => updateRow(i, { product: e.target.value })}
                      className="w-full bg-transparent border border-gray-200 rounded px-1.5 py-1" />
                  </td>
                  <td className="py-1.5 pr-1">
                    <input type="number" value={r.price} readOnly={readOnly || r.auto} onChange={e => updateRow(i, { price: +e.target.value })}
                      className="w-full text-right bg-transparent border border-gray-200 rounded px-1 py-1" />
                  </td>
                  <td className="py-1.5 pr-1">
                    <input value={r.place} readOnly={readOnly || r.auto} onChange={e => updateRow(i, { place: e.target.value })}
                      className="w-full bg-transparent border border-gray-200 rounded px-1.5 py-1" />
                  </td>
                  <td className="py-1.5">
                    <input value={r.reason} readOnly={readOnly} onChange={e => updateRow(i, { reason: e.target.value })} placeholder="왜 샀나요?"
                      className="w-full bg-white border border-gray-200 rounded px-1.5 py-1" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!readOnly && (
          <button onClick={() => setRows([...rows, { transaction_id: null, product: '', price: 0, place: '', reason: '', auto: false }])}
            className="mt-2 text-sm text-blue-500 font-bold">+ 직접 추가</button>
        )}
        <div className="flex flex-wrap gap-3 mt-3 text-sm">
          <span className="bg-gray-50 rounded-xl px-3 py-1.5">번 돈: <b>{totals.totalHad.toLocaleString()}원</b></span>
          <span className="bg-gray-50 rounded-xl px-3 py-1.5">쓴 돈: <b>{totals.totalSpent.toLocaleString()}원</b></span>
          <span className="bg-gray-50 rounded-xl px-3 py-1.5">남은 돈: <b>{totals.balance.toLocaleString()}원</b></span>
        </div>
      </div>

      <div>
        <div className="font-bold text-gray-800 mb-2">✅ 합리적 선택 체크리스트</div>
        <div className="flex flex-col gap-3">
          {CHECKLIST_ITEMS.map((it, i) => (
            <div key={it.key}>
              <div className="text-sm text-gray-700 mb-1"><b>{i + 1}.</b> {it.text}</div>
              <Segmented choices={CHECKLIST_CHOICES} value={checklist[it.key] ?? ''} readOnly={readOnly}
                onChange={v => change('consumer_review', 'checklist', { ...checklist, [it.key]: v })} />
            </div>
          ))}
        </div>
        <div className="mt-4">
          <div className="text-sm font-medium text-gray-700 mb-1">{CHECKLIST_SUMMARY_LABEL}</div>
          <Area value={getVal('consumer_review', 'checklist_summary', '')} readOnly={readOnly} rows={2}
            onChange={v => change('consumer_review', 'checklist_summary', v)} />
        </div>
      </div>
    </div>
  )
}

// ── 탭2·4 공통: 심화질문 ──
function DeepTab({ tab, questions, getVal, change, readOnly }: TabProps & {
  tab: ReflectionTabId; questions: { no: number; text: string; tag: string }[]
}) {
  const selected = getVal<number | null>(tab, 'selected_question', null)
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        {questions.map(q => (
          <div key={q.no} className={`rounded-2xl p-3 border-2 ${selected === q.no ? 'border-blue-300 bg-blue-50' : 'border-gray-100 bg-gray-50'}`}>
            <div className="flex items-start gap-2">
              <span className="shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center">{q.no}</span>
              <div>
                <div className="text-sm text-gray-800">{q.text}</div>
                <span className="inline-block mt-1 text-xs bg-white border border-gray-200 rounded-full px-2 py-0.5 text-gray-500">{q.tag}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div>
        <label className="text-sm font-bold text-gray-700 mr-2">우리 모둠이 선택한 질문:</label>
        <select value={selected ?? ''} disabled={readOnly} onChange={e => change(tab, 'selected_question', e.target.value ? +e.target.value : null)}
          className="border-2 border-gray-200 rounded-xl px-3 py-1.5 font-bold">
          <option value="">선택</option>
          {questions.map(q => <option key={q.no} value={q.no}>{q.no}번</option>)}
        </select>
      </div>
      <div>
        <div className="text-sm font-bold text-gray-700 mb-1">토의 후 나의 생각</div>
        <Area value={getVal(tab, 'my_opinion', '')} readOnly={readOnly} rows={5} placeholder={DEEP_OPINION_PLACEHOLDER}
          onChange={v => change(tab, 'my_opinion', v)} />
      </div>
    </div>
  )
}

// ── 탭3: 생산 단계 돌아보기 ──
function ProducerReview({ sales, companyName, getVal, change, readOnly }: Props & TabProps) {
  const rows = getVal<SalesEntry[]>('producer_review', 'sales_data',
    sales.map(s => ({ product: s.product, price: s.price, count: s.count, income: s.income, cost: 0, profit: 0 })))
  function setRows(next: SalesEntry[]) { change('producer_review', 'sales_data', next) }
  function updateRow(i: number, patch: Partial<SalesEntry>) {
    setRows(rows.map((r, idx) => idx === i ? { ...r, ...patch } : r))
  }
  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="font-bold text-gray-800 mb-2">🏭 우리 모둠 판매 내역{companyName ? ` (${companyName})` : ''}</div>
        {rows.length === 0 && (
          <p className="text-sm text-gray-400 mb-2">판매 데이터가 없어요. 우리 반 생산 활동을 지켜본 입장에서 아래 질문에 답해 보세요. (직접 추가도 가능)</p>
        )}
        {rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead><tr className="text-gray-400 text-xs">
                <th className="text-left font-medium pb-1">상품 이름</th>
                <th className="text-right font-medium pb-1 w-16">판매가</th>
                <th className="text-right font-medium pb-1 w-16">재료비</th>
                <th className="text-right font-medium pb-1 w-14">개수</th>
                <th className="text-right font-medium pb-1 w-20">총 수입</th>
                <th className="text-right font-medium pb-1 w-20">남은 이익</th>
              </tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="py-1.5 pr-1"><input value={r.product} readOnly={readOnly} onChange={e => updateRow(i, { product: e.target.value })} className="w-full bg-transparent border border-gray-200 rounded px-1.5 py-1" /></td>
                    <td className="py-1.5 pr-1"><input type="number" value={r.price} readOnly={readOnly} onChange={e => updateRow(i, { price: +e.target.value })} className="w-full text-right bg-transparent border border-gray-200 rounded px-1 py-1" /></td>
                    <td className="py-1.5 pr-1"><input type="number" value={r.cost} readOnly={readOnly} onChange={e => updateRow(i, { cost: +e.target.value })} className="w-full text-right bg-white border border-gray-200 rounded px-1 py-1" /></td>
                    <td className="py-1.5 pr-1"><input type="number" value={r.count} readOnly={readOnly} onChange={e => updateRow(i, { count: +e.target.value })} className="w-full text-right bg-transparent border border-gray-200 rounded px-1 py-1" /></td>
                    <td className="py-1.5 pr-1 text-right font-medium">{(r.income || r.price * r.count).toLocaleString()}</td>
                    <td className="py-1.5 pr-1"><input type="number" value={r.profit} readOnly={readOnly} onChange={e => updateRow(i, { profit: +e.target.value })} className="w-full text-right bg-white border border-gray-200 rounded px-1 py-1" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!readOnly && (
          <button onClick={() => setRows([...rows, { product: '', price: 0, count: 0, income: 0, cost: 0, profit: 0 }])}
            className="mt-2 text-sm text-blue-500 font-bold">+ 직접 추가</button>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {PRODUCER_SCARCITY_FIELDS.map(f => (
          <div key={f.key}>
            <div className="text-sm font-medium text-gray-700 mb-1">
              {f.label}{f.emphasis && <b className="text-blue-600"> {f.emphasis}</b>}
            </div>
            <Area value={getVal('producer_review', f.key, '')} readOnly={readOnly} rows={2}
              onChange={v => change('producer_review', f.key, v)} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── 탭5: 개념 연결 · 평가 ──
function ConceptEval({ getVal, change, readOnly }: TabProps) {
  const selfEval = getVal<Record<string, string>>('concept_eval', 'self_eval', {})
  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="font-bold text-gray-800 mb-2">🧩 개념 - 경험 연결</div>
        <div className="flex flex-col gap-3">
          {CONCEPT_ROWS.map(row => (
            <div key={row.key} className="bg-gray-50 rounded-2xl p-3">
              <div className="text-sm mb-1"><b className="text-blue-700">{row.concept}</b> <span className="text-gray-500">— {row.meaning}</span></div>
              <div className="text-xs text-gray-400 mb-1">{CONCEPT_CELL_LABEL}</div>
              <Area value={getVal('concept_eval', row.key, '')} readOnly={readOnly} rows={2}
                onChange={v => change('concept_eval', row.key, v)} />
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="text-sm font-bold text-gray-700 mb-1">{CORE_SENTENCE_LABEL}</div>
        <Area value={getVal('concept_eval', 'core_sentence', '')} readOnly={readOnly} rows={2}
          onChange={v => change('concept_eval', 'core_sentence', v)} />
        <p className="text-xs mt-1" style={{ color: '#999' }}>{CORE_SENTENCE_EXAMPLE}</p>
      </div>

      <div>
        <div className="font-bold text-gray-800 mb-2">📋 자기 평가</div>
        <div className="flex flex-col gap-3">
          {SELF_EVAL_ITEMS.map(it => (
            <div key={it.key}>
              <div className="text-sm text-gray-700 mb-1"><b>{it.area}</b> — {it.text}</div>
              <Segmented choices={SELF_EVAL_CHOICES} value={selfEval[it.key] ?? ''} readOnly={readOnly}
                onChange={v => change('concept_eval', 'self_eval', { ...selfEval, [it.key]: v })} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
