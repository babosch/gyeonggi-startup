'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PageShell from '@/components/PageShell'
import ConceptPopup from '@/components/ConceptPopup'
import FeedbackBanner from '@/components/FeedbackBanner'
import type { Stage } from '@/lib/types'

// 경기도 지도용 도시 정의
const MAP_CITIES = [
  { name: '파주시',  cx: 118, cy: 68,  rx: 95, ry: 50, light: '#bbf7d0', active: '#22c55e', stroke: '#86efac', textColor: '#14532d' },
  { name: '고양시',  cx: 195, cy: 148, rx: 82, ry: 48, light: '#fbcfe8', active: '#ec4899', stroke: '#f9a8d4', textColor: '#831843' },
  { name: '부천시',  cx: 93,  cy: 208, rx: 72, ry: 46, light: '#ddd6fe', active: '#a855f7', stroke: '#c4b5fd', textColor: '#4c1d95' },
  { name: '수원시',  cx: 222, cy: 268, rx: 92, ry: 48, light: '#fde68a', active: '#f59e0b', stroke: '#fcd34d', textColor: '#78350f' },
  { name: '이천시',  cx: 370, cy: 262, rx: 78, ry: 48, light: '#bfdbfe', active: '#3b82f6', stroke: '#93c5fd', textColor: '#1e3a8a' },
]

function padArr(arr: string[], min: number): string[] {
  const r = [...arr]
  while (r.length < min) r.push('')
  return r
}

function parseSpecialties(raw: string | null): { s: string[]; r: string[] } {
  if (!raw) return { s: ['', '', ''], r: ['', '', ''] }
  try {
    const p = JSON.parse(raw)
    if (p && typeof p === 'object' && Array.isArray(p.s)) {
      return { s: padArr(p.s, 3), r: padArr(p.r ?? [], 3) }
    }
  } catch {}
  return { s: padArr([raw], 3), r: ['', '', ''] }
}

function parseStrengths(raw: string | null): string[] {
  if (!raw) return ['', '', '']
  try {
    const p = JSON.parse(raw)
    if (Array.isArray(p)) return padArr(p, 3)
  } catch {}
  return padArr([raw], 3)
}

interface Research {
  map_selected: boolean
  specialties: string | null
  strengths: string | null
  oneliner: string | null
  feedback?: string | null
}

export default function ExploreForm({
  classCode, cityName, color, stage, existing,
}: {
  classCode: string; cityName: string; color: string; stage: Stage; existing: Research | null
}) {
  const router = useRouter()
  const supabase = createClient()
  const readOnly = false

  const [mapDone, setMapDone] = useState(existing?.map_selected ?? false)
  const [wrongAt, setWrongAt] = useState<string | null>(null)

  const initSp = parseSpecialties(existing?.specialties ?? null)
  const initSt = parseStrengths(existing?.strengths ?? null)

  const [specialties, setSpecialties] = useState<string[]>(initSp.s)
  const [resources, setResources]     = useState<string[]>(initSp.r)
  const [strengths, setStrengths]     = useState<string[]>(initSt)
  const [oneliner, setOneliner]       = useState(existing?.oneliner ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showConcept, setShowConcept] = useState(false)

  function pickCity(name: string) {
    if (readOnly || mapDone) return
    if (name === cityName) {
      setMapDone(true)
      setWrongAt(null)
    } else {
      setWrongAt(name)
      setTimeout(() => setWrongAt(null), 1500)
    }
  }

  function updateList(list: string[], setList: (v: string[]) => void, i: number, val: string) {
    const next = [...list]; next[i] = val; setList(next)
  }
  function addRow(list: string[], setList: (v: string[]) => void) {
    setList([...list, ''])
  }
  function removeRow(list: string[], setList: (v: string[]) => void, i: number) {
    if (list.length <= 3) return
    setList(list.filter((_, idx) => idx !== i))
  }

  async function submit() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: me } = await supabase.from('users').select('class_id').eq('id', user!.id).single()
    const spJson = JSON.stringify({ s: specialties.filter(Boolean), r: resources.filter(Boolean) })
    const stJson = JSON.stringify(strengths.filter(Boolean))
    await supabase.from('city_research').upsert({
      user_id: user!.id,
      class_id: me!.class_id,
      map_selected: true,
      specialties: spJson,
      strengths: stJson,
      oneliner,
    }, { onConflict: 'user_id' })
    setSaving(false)
    setSaved(true)
    if (!existing) setShowConcept(true)
  }

  const hasContent = specialties.some(Boolean) || resources.some(Boolean) || strengths.some(Boolean) || oneliner

  return (
    <PageShell title="도시 탐구" emoji="🗺️">
      <div className="flex flex-col gap-4">

        <FeedbackBanner feedback={existing?.feedback} />

        {/* 1. 우리 도시 찾기 */}
        <div className="bg-white rounded-3xl p-6 shadow-sm">
          <div className="font-bold text-gray-800 mb-1">① 우리 도시를 찾아요</div>
          <p className="text-sm text-gray-500 mb-4">경기도 지도에서 <b>{cityName}</b>를 찾아 눌러보세요!</p>

          <div className="relative rounded-2xl overflow-hidden border-2 border-green-100" style={{ background: '#f0f9f0' }}>
            <svg viewBox="0 0 460 340" xmlns="http://www.w3.org/2000/svg" className="w-full">
              {/* 경기도 윤곽 */}
              <polygon
                points="45,22 130,4 230,0 360,18 440,95 448,218 392,308 228,328 82,302 28,198"
                fill="#dcfce7" stroke="#86efac" strokeWidth="2" />

              {/* 서울 */}
              <ellipse cx="216" cy="190" rx="50" ry="40" fill="#9ca3af" />
              <text x="216" y="187" textAnchor="middle" fontSize="13" fontWeight="bold" fill="white">서울</text>
              <text x="216" y="204" textAnchor="middle" fontSize="10" fill="#e5e7eb">(서울특별시)</text>

              {/* 5개 도시 클릭 영역 */}
              {MAP_CITIES.map(c => {
                const isMine = c.name === cityName
                const correct = mapDone && isMine
                const wrong = wrongAt === c.name
                const inactive = mapDone && !isMine
                const fill = correct ? c.active : wrong ? '#ef4444' : inactive ? '#e5e7eb' : c.light
                const stroke = correct ? c.active : wrong ? '#ef4444' : inactive ? '#d1d5db' : c.stroke
                const textFill = correct || wrong ? 'white' : inactive ? '#9ca3af' : c.textColor
                return (
                  <g key={c.name} onClick={() => pickCity(c.name)}
                    style={{ cursor: mapDone ? 'default' : 'pointer' }}>
                    <ellipse cx={c.cx} cy={c.cy} rx={c.rx} ry={c.ry}
                      fill={fill} stroke={stroke} strokeWidth="2.5"
                      style={{ transition: 'fill 0.3s, stroke 0.3s' }} />
                    <text x={c.cx} y={c.cy + (correct ? -6 : 5)} textAnchor="middle"
                      fontSize="15" fontWeight="bold" fill={textFill}>
                      {inactive ? '?' : c.name}
                    </text>
                    {correct && (
                      <text x={c.cx} y={c.cy + 14} textAnchor="middle" fontSize="12" fill="white">
                        ✓ 찾았어요!
                      </text>
                    )}
                  </g>
                )
              })}
            </svg>
          </div>

          {wrongAt && (
            <p className="text-red-500 text-sm text-center mt-2 font-medium">
              다시 생각해 봐요! 🤔
            </p>
          )}
          {mapDone && (
            <p className="text-green-600 text-sm text-center mt-2 font-medium">
              🎉 {cityName}를 찾았어요! 아래에서 도시를 조사해 봐요.
            </p>
          )}
        </div>

        {/* 2. 조사 입력 */}
        {mapDone && (
          <div className="bg-white rounded-3xl p-6 shadow-sm flex flex-col gap-6">
            <div className="font-bold text-gray-800">② 우리 도시를 조사해요</div>

            <ListSection
              label="🍙 우리 도시의 특산품"
              items={specialties}
              onChange={(i, v) => updateList(specialties, setSpecialties, i, v)}
              onAdd={() => addRow(specialties, setSpecialties)}
              onRemove={i => removeRow(specialties, setSpecialties, i)}
              readOnly={readOnly}
            />

            <ListSection
              label="🌿 우리 도시의 자원"
              items={resources}
              onChange={(i, v) => updateList(resources, setResources, i, v)}
              onAdd={() => addRow(resources, setResources)}
              onRemove={i => removeRow(resources, setResources, i)}
              readOnly={readOnly}
            />

            <ListSection
              label="💪 우리 도시의 자랑·강점"
              items={strengths}
              onChange={(i, v) => updateList(strengths, setStrengths, i, v)}
              onAdd={() => addRow(strengths, setStrengths)}
              onRemove={i => removeRow(strengths, setStrengths, i)}
              readOnly={readOnly}
            />

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">✏️ 우리 도시 한 줄 소개</label>
              <textarea
                value={oneliner}
                onChange={e => setOneliner(e.target.value)}
                readOnly={readOnly}
                rows={2}
                maxLength={80}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-base
                  focus:border-green-400 outline-none resize-none read-only:bg-gray-50 read-only:text-gray-500"
              />
            </div>

            {!readOnly && (
              <button onClick={submit} disabled={saving || !hasContent}
                className="bg-green-500 text-white rounded-2xl py-4 font-bold text-lg disabled:opacity-40 active:scale-95 transition-transform">
                {saving ? '저장 중...' : saved ? '✓ 저장됐어요! 다시 저장' : '조사 내용 저장하기'}
              </button>
            )}
            {saved && !showConcept && (
              <p className="text-center text-green-600 font-medium">저장됐어요! 👍</p>
            )}
          </div>
        )}
      </div>

      {showConcept && (
        <ConceptPopup
          kind="formative_research"
          stage={0}
          prompt="특정 지역이 특히 잘 만들거나 많이 나는 것을 무엇이라고 할까요?"
          options={['특산품', '수입품', '공산품']}
          correct="특산품"
          explanation="맞아요! 지역마다 자연환경과 기술이 달라 특별히 잘 만드는 것이 있어요. 그것을 특산품이라고 해요."
          onClose={() => { setShowConcept(false); router.push('/home') }}
        />
      )}
    </PageShell>
  )
}

function ListSection({
  label, items, onChange, onAdd, onRemove, readOnly,
}: {
  label: string
  items: string[]
  onChange: (i: number, v: string) => void
  onAdd: () => void
  onRemove: (i: number) => void
  readOnly: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 mb-2">{label}</label>
      <div className="flex flex-col gap-2">
        {items.map((val, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input
              value={val}
              onChange={e => onChange(i, e.target.value)}
              readOnly={readOnly}
              maxLength={30}
              placeholder={`${i + 1}번째 항목`}
              className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-2.5 text-gray-800
                focus:border-green-400 outline-none read-only:bg-gray-50 read-only:text-gray-500"
            />
            {!readOnly && items.length > 3 && (
              <button onClick={() => onRemove(i)}
                className="text-gray-300 hover:text-red-400 text-xl px-1 transition-colors">✕</button>
            )}
          </div>
        ))}
      </div>
      {!readOnly && (
        <button onClick={onAdd}
          className="mt-2 text-green-600 text-sm font-medium hover:underline">
          + 항목 추가
        </button>
      )}
    </div>
  )
}
