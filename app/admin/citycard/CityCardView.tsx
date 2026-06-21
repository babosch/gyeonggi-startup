'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

// ─── 타입 ────────────────────────────────────────────
interface Group { id: string; label: string; words: string[]; color: string }

type Category = 'specialties' | 'resources' | 'strengths' | 'oneliners'
const CAT_META: Record<Category, { label: string; emoji: string }> = {
  specialties: { label: '특산품', emoji: '🍙' },
  resources:   { label: '자원',   emoji: '🌿' },
  strengths:   { label: '자랑·강점', emoji: '💪' },
  oneliners:   { label: '한줄 소개', emoji: '✏️' },
}
const GROUP_COLORS = [
  'bg-blue-100 border-blue-400 text-blue-800',
  'bg-green-100 border-green-400 text-green-800',
  'bg-amber-100 border-amber-400 text-amber-800',
  'bg-purple-100 border-purple-400 text-purple-800',
  'bg-pink-100 border-pink-400 text-pink-800',
  'bg-orange-100 border-orange-400 text-orange-800',
]

// 단어 빈도 계산
function freq(words: string[]): { word: string; count: number }[] {
  const map = new Map<string, number>()
  for (const w of words) {
    const key = w.toLowerCase()
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return [...map.entries()]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
}

// SVG 워드 클라우드
function WordCloudSvg({ entries, selected, onSelect }: {
  entries: { word: string; count: number }[]
  selected: Set<string>
  onSelect: (w: string) => void
}) {
  const max = entries[0]?.count ?? 1
  const placed: { x: number; y: number; w: number; h: number }[] = []

  function fits(x: number, y: number, w: number, h: number, pad = 6) {
    for (const p of placed) {
      if (x - pad < p.x + p.w && x + w + pad > p.x &&
          y - pad < p.y + p.h && y + h + pad > p.y) return false
    }
    return true
  }

  const items: { word: string; count: number; x: number; y: number; size: number; color: string }[] = []
  const COLORS = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ec4899','#06b6d4','#ef4444','#84cc16']
  let ci = 0

  for (const e of entries.slice(0, 40)) {
    const size = Math.round(12 + (e.count / max) * 24)
    const charW = size * 0.62
    const w = e.word.length * charW
    const h = size + 4
    let placed_ = false
    for (let a = 0; a < 400; a += 2) {
      const r = 1.2 * a
      const angle = (a * Math.PI) / 18
      const cx = 280, cy = 140
      const x = cx + r * Math.cos(angle) - w / 2
      const y = cy + r * Math.sin(angle) - h / 2
      if (x < 4 || y < 4 || x + w > 556 || y + h > 276) continue
      if (fits(x, y, w, h)) {
        items.push({ word: e.word, count: e.count, x, y, size, color: COLORS[ci++ % COLORS.length] })
        placed.push({ x, y, w, h })
        placed_ = true
        break
      }
    }
    if (!placed_) break
  }

  if (items.length === 0) return (
    <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
      아직 입력된 데이터가 없어요
    </div>
  )

  return (
    <svg viewBox="0 0 560 280" className="w-full rounded-2xl bg-gray-50">
      {items.map((it, i) => {
        const isSel = selected.has(it.word)
        return (
          <g key={i} onClick={() => onSelect(it.word)} style={{ cursor: 'pointer' }}>
            {isSel && (
              <rect x={it.x - 4} y={it.y - 2} width={it.word.length * it.size * 0.62 + 8} height={it.size + 8}
                rx="6" fill={it.color} opacity={0.25} />
            )}
            <text x={it.x} y={it.y + it.size - 2}
              fontSize={it.size}
              fontWeight={it.count > 1 ? 'bold' : 'normal'}
              fill={isSel ? it.color : it.color}
              opacity={isSel ? 1 : 0.75}
              style={{ fontFamily: 'system-ui, sans-serif', userSelect: 'none' }}>
              {it.word}{it.count > 1 ? ` ×${it.count}` : ''}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ─── 메인 뷰 ─────────────────────────────────────────
export default function CityCardView({ cityName, color, submitted, specialties, resources, strengths, oneliners }: {
  cityName: string; color: string; submitted: number
  specialties: string[]; resources: string[]; strengths: string[]; oneliners: string[]
}) {
  const router = useRouter()
  const STORAGE_KEY = `citycard-groups-${cityName}`
  const [tab, setTab] = useState<Category>('specialties')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [groups, setGroups] = useState<Group[]>([])
  const [groupLabel, setGroupLabel] = useState('')
  const [showGroupInput, setShowGroupInput] = useState(false)
  const [showCard, setShowCard] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const dataMap: Record<Category, string[]> = { specialties, resources, strengths, oneliners }
  const freqMap: Record<Category, { word: string; count: number }[]> = {
    specialties: freq(specialties),
    resources: freq(resources),
    strengths: freq(strengths),
    oneliners: freq(oneliners),
  }

  // localStorage 복원
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setGroups(JSON.parse(saved))
    } catch {}
  }, [STORAGE_KEY])

  function saveGroups(next: Group[]) {
    setGroups(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  function toggleSelect(word: string) {
    const next = new Set(selected)
    next.has(word) ? next.delete(word) : next.add(word)
    setSelected(next)
  }

  function createGroup() {
    if (!selected.size || !groupLabel.trim()) return
    const allGrouped = groups.flatMap(g => g.words)
    const words = [...selected].filter(w => !allGrouped.includes(w))
    if (!words.length) { setSelected(new Set()); return }
    const g: Group = {
      id: Date.now().toString(),
      label: groupLabel.trim(),
      words,
      color: GROUP_COLORS[groups.length % GROUP_COLORS.length],
    }
    saveGroups([...groups, g])
    setSelected(new Set())
    setGroupLabel('')
    setShowGroupInput(false)
  }

  function deleteGroup(id: string) {
    saveGroups(groups.filter(g => g.id !== id))
  }

  function addToGroup(groupId: string) {
    if (!selected.size) return
    const allGrouped = groups.flatMap(g => g.words)
    const words = [...selected].filter(w => !allGrouped.includes(w))
    saveGroups(groups.map(g => g.id === groupId ? { ...g, words: [...g.words, ...words] } : g))
    setSelected(new Set())
  }

  // 이미 그룹에 속한 단어 목록
  const groupedWords = new Set(groups.flatMap(g => g.words))

  // 현재 탭의 미분류 단어들
  const currentFreq = freqMap[tab]
  const ungrouped = currentFreq.filter(e => !groupedWords.has(e.word))
  const inGroup = currentFreq.filter(e => groupedWords.has(e.word))

  // 현재 탭 관련 그룹만 표시
  const tabWords = new Set(currentFreq.map(e => e.word))
  const tabGroups = groups.filter(g => g.words.some(w => tabWords.has(w)))

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.push('/admin')} className="text-gray-400 text-sm">←</button>
          <div className="flex-1">
            <div className="font-bold text-gray-800">도시 대표 카드 만들기</div>
            <div className="text-xs text-gray-400">{cityName} · 제출 {submitted}명</div>
          </div>
          <button onClick={() => setShowCard(!showCard)}
            className="bg-blue-500 text-white text-sm px-4 py-2 rounded-xl font-medium">
            {showCard ? '편집으로' : '카드 보기'}
          </button>
        </div>

        {/* 카테고리 탭 */}
        {!showCard && (
          <div className="max-w-3xl mx-auto px-4 flex gap-0 overflow-x-auto">
            {(Object.entries(CAT_META) as [Category, typeof CAT_META[Category]][]).map(([k, m]) => (
              <button key={k} onClick={() => { setTab(k); setSelected(new Set()) }}
                className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
                  ${tab === k ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}>
                {m.emoji} {m.label}
                <span className="ml-1 text-xs text-gray-400">({freqMap[k].length})</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="max-w-3xl mx-auto p-4 flex flex-col gap-4">

        {/* ── 도시 카드 뷰 ── */}
        {showCard && (
          <CityCard cityName={cityName} color={color} groups={groups}
            topSpecialties={freqMap.specialties.slice(0, 5)}
            topResources={freqMap.resources.slice(0, 5)}
            topStrengths={freqMap.strengths.slice(0, 5)}
            oneliners={oneliners} />
        )}

        {/* ── 편집 뷰 ── */}
        {!showCard && (
          <>
            {/* 워드 클라우드 */}
            <div className="bg-white rounded-3xl p-4 shadow-sm">
              <div className="text-sm font-bold text-gray-600 mb-3">
                {CAT_META[tab].emoji} {CAT_META[tab].label} 워드 클라우드
                <span className="font-normal text-gray-400 ml-2">단어를 클릭해서 선택하세요</span>
              </div>
              <WordCloudSvg
                entries={currentFreq}
                selected={selected}
                onSelect={toggleSelect} />
            </div>

            {/* 선택된 단어 + 그룹 만들기 */}
            {selected.size > 0 && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-3xl p-4">
                <div className="text-sm font-bold text-blue-700 mb-3">
                  선택됨 ({selected.size}개): {[...selected].join(', ')}
                </div>
                <div className="flex flex-wrap gap-2">
                  {!showGroupInput && (
                    <button onClick={() => { setShowGroupInput(true); setTimeout(() => inputRef.current?.focus(), 50) }}
                      className="bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-medium">
                      + 새 그룹으로 묶기
                    </button>
                  )}
                  {showGroupInput && (
                    <div className="flex gap-2 w-full">
                      <input ref={inputRef} value={groupLabel} onChange={e => setGroupLabel(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && createGroup()}
                        placeholder="그룹 이름 입력 (예: 농업 관련)"
                        className="flex-1 border-2 border-blue-300 rounded-xl px-3 py-2 text-sm focus:outline-none" />
                      <button onClick={createGroup} disabled={!groupLabel.trim()}
                        className="bg-blue-500 text-white px-4 rounded-xl text-sm font-medium disabled:opacity-40">
                        만들기
                      </button>
                      <button onClick={() => setShowGroupInput(false)} className="text-gray-400 px-2">✕</button>
                    </div>
                  )}
                  {tabGroups.length > 0 && !showGroupInput && (
                    <div className="w-full">
                      <div className="text-xs text-gray-500 mb-1">기존 그룹에 추가:</div>
                      <div className="flex flex-wrap gap-2">
                        {tabGroups.map(g => (
                          <button key={g.id} onClick={() => addToGroup(g.id)}
                            className={`${g.color} border px-3 py-1.5 rounded-xl text-sm font-medium`}>
                            + {g.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 그룹 목록 */}
            {tabGroups.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="text-sm font-bold text-gray-600 px-1">묶음</div>
                {tabGroups.map(g => (
                  <div key={g.id} className={`${g.color} border-2 rounded-2xl p-4`}>
                    <div className="flex justify-between items-center mb-2">
                      <div className="font-bold text-sm">{g.label}</div>
                      <button onClick={() => deleteGroup(g.id)} className="text-gray-400 text-xs hover:text-red-500">삭제</button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {g.words.filter(w => tabWords.has(w)).map((w, i) => (
                        <span key={i} className="bg-white/70 rounded-lg px-2 py-0.5 text-sm">{w}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 미분류 칩 목록 */}
            {tab !== 'oneliners' ? (
              <div className="bg-white rounded-3xl p-4 shadow-sm">
                <div className="text-sm font-bold text-gray-600 mb-3">
                  전체 목록
                  {ungrouped.length < currentFreq.length && (
                    <span className="font-normal text-gray-400 ml-2">
                      미분류 {ungrouped.length}개 / 전체 {currentFreq.length}개
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {ungrouped.map((e, i) => (
                    <button key={i} onClick={() => toggleSelect(e.word)}
                      className={`px-3 py-1.5 rounded-xl text-sm border-2 transition-colors font-medium
                        ${selected.has(e.word)
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-blue-300'}`}>
                      {e.word}
                      {e.count > 1 && <span className="ml-1 text-xs opacity-70">×{e.count}</span>}
                    </button>
                  ))}
                </div>
                {inGroup.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {inGroup.map((e, i) => (
                      <span key={i} className="px-3 py-1.5 rounded-xl text-xs bg-gray-100 text-gray-400 line-through">
                        {e.word}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* 한줄소개는 리스트로 */
              <div className="bg-white rounded-3xl p-4 shadow-sm">
                <div className="text-sm font-bold text-gray-600 mb-3">학생들의 한줄 소개</div>
                <div className="flex flex-col gap-2">
                  {oneliners.length === 0 && <p className="text-gray-400 text-sm">아직 입력된 내용이 없어요</p>}
                  {oneliners.map((s, i) => (
                    <div key={i} className={`bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-700 border-2 cursor-pointer transition-colors
                      ${selected.has(s) ? 'border-blue-400 bg-blue-50' : 'border-transparent hover:border-gray-300'}`}
                      onClick={() => toggleSelect(s)}>
                      "{s}"
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── 도시 대표 카드 ───────────────────────────────────
function CityCard({ cityName, color, groups, topSpecialties, topResources, topStrengths, oneliners }: {
  cityName: string; color: string
  groups: Group[]
  topSpecialties: { word: string; count: number }[]
  topResources: { word: string; count: number }[]
  topStrengths: { word: string; count: number }[]
  oneliners: string[]
}) {
  // 도시 색상
  const colorMap: Record<string, { bg: string; text: string; tag: string }> = {
    blue:   { bg: 'bg-blue-600',   text: 'text-blue-600',   tag: 'bg-blue-100 text-blue-700' },
    purple: { bg: 'bg-purple-600', text: 'text-purple-600', tag: 'bg-purple-100 text-purple-700' },
    green:  { bg: 'bg-green-600',  text: 'text-green-600',  tag: 'bg-green-100 text-green-700' },
    amber:  { bg: 'bg-amber-500',  text: 'text-amber-600',  tag: 'bg-amber-100 text-amber-700' },
    pink:   { bg: 'bg-pink-500',   text: 'text-pink-600',   tag: 'bg-pink-100 text-pink-700' },
  }
  const c = colorMap[color] ?? colorMap.blue

  // 그룹이 있으면 그룹 라벨 우선, 없으면 단어 빈도 top5
  const spGroups = groups.filter(g => g.words.some(w => topSpecialties.some(e => e.word === w)))
  const reGroups = groups.filter(g => g.words.some(w => topResources.some(e => e.word === w)))
  const stGroups = groups.filter(g => g.words.some(w => topStrengths.some(e => e.word === w)))

  const bestOneliner = oneliners[0] ?? null

  return (
    <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
      {/* 헤더 */}
      <div className={`${c.bg} px-6 py-8 text-white text-center`}>
        <div className="text-5xl mb-2">🏙️</div>
        <h1 className="text-3xl font-bold">{cityName}</h1>
        {bestOneliner && (
          <p className="mt-2 text-white/80 text-base">"{bestOneliner}"</p>
        )}
      </div>

      <div className="p-6 flex flex-col gap-6">
        {/* 특산품 */}
        <CardSection emoji="🍙" title="우리 도시의 특산품"
          groups={spGroups} words={topSpecialties} tagClass={c.tag} />

        {/* 자원 */}
        <CardSection emoji="🌿" title="우리 도시의 자원"
          groups={reGroups} words={topResources} tagClass={c.tag} />

        {/* 자랑·강점 */}
        <CardSection emoji="💪" title="우리 도시의 자랑·강점"
          groups={stGroups} words={topStrengths} tagClass={c.tag} />

        {/* 한줄 소개 모음 */}
        {oneliners.length > 1 && (
          <div>
            <div className="font-bold text-gray-700 mb-2">✏️ 학생들의 한줄 소개</div>
            <div className="flex flex-col gap-1.5">
              {oneliners.slice(0, 5).map((s, i) => (
                <div key={i} className="text-sm text-gray-600 bg-gray-50 rounded-xl px-4 py-2">"{s}"</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function CardSection({ emoji, title, groups, words, tagClass }: {
  emoji: string; title: string
  groups: Group[]; words: { word: string; count: number }[]; tagClass: string
}) {
  if (groups.length === 0 && words.length === 0) return null
  return (
    <div>
      <div className="font-bold text-gray-700 mb-2">{emoji} {title}</div>
      {groups.length > 0 ? (
        /* 그룹으로 묶인 경우 그룹 라벨 표시 */
        <div className="flex flex-wrap gap-2">
          {groups.map(g => (
            <div key={g.id} className={`${g.color} border rounded-2xl px-4 py-2`}>
              <div className="text-xs font-bold mb-1">{g.label}</div>
              <div className="flex flex-wrap gap-1">
                {g.words.slice(0, 5).map((w, i) => (
                  <span key={i} className="text-xs bg-white/70 rounded px-1.5 py-0.5">{w}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* 그룹 없으면 상위 단어를 태그로 */
        <div className="flex flex-wrap gap-2">
          {words.slice(0, 8).map((e, i) => (
            <span key={i} className={`${tagClass} px-3 py-1.5 rounded-xl text-sm font-medium`}>
              {e.word}{e.count > 1 ? ` (×${e.count})` : ''}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
