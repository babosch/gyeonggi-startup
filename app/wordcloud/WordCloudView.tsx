'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PageShell from '@/components/PageShell'

interface Word { id: string; word: string; hidden: boolean }

// 단어 빈도 계산
function countWords(words: Word[]): { word: string; count: number; id: string }[] {
  const map = new Map<string, { count: number; id: string }>()
  for (const w of words) {
    if (w.hidden) continue
    const key = w.word
    const cur = map.get(key)
    if (cur) cur.count++
    else map.set(key, { count: 1, id: w.id })
  }
  return Array.from(map.entries())
    .map(([word, { count, id }]) => ({ word, count, id }))
    .sort((a, b) => b.count - a.count)
}

// SVG 워드 클라우드 (나선형 배치)
function WordCloudSvg({ entries }: { entries: { word: string; count: number }[] }) {
  if (entries.length === 0) return (
    <div className="flex items-center justify-center h-64 text-gray-300 text-lg">
      아직 단어가 없어요
    </div>
  )

  const maxCount = Math.max(...entries.map(e => e.count), 1)
  const W = 600, H = 320
  const placed: { x: number; y: number; w: number; h: number }[] = []

  function overlaps(x: number, y: number, w: number, h: number): boolean {
    for (const p of placed) {
      if (Math.abs(x - p.x) < (w + p.w) / 2 + 4 &&
          Math.abs(y - p.y) < (h + p.h) / 2 + 4) return true
    }
    return false
  }

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']
  const items: { word: string; x: number; y: number; size: number; color: string }[] = []

  for (let i = 0; i < Math.min(entries.length, 40); i++) {
    const { word, count } = entries[i]
    const size = Math.round(14 + (count / maxCount) * 32)
    const wEst = word.length * size * 0.6
    const hEst = size * 1.3
    const color = COLORS[i % COLORS.length]

    // 나선형 배치 시도
    let placed_ = false
    for (let a = 0; a < 300; a += 3) {
      const r = 0.8 * a
      const angle = (a * Math.PI) / 18
      const cx = W / 2 + r * Math.cos(angle)
      const cy = H / 2 + r * Math.sin(angle) * 0.6
      if (cx < wEst / 2 + 4 || cx > W - wEst / 2 - 4) continue
      if (cy < hEst / 2 + 4 || cy > H - hEst / 2 - 4) continue
      if (!overlaps(cx, cy, wEst, hEst)) {
        placed.push({ x: cx, y: cy, w: wEst, h: hEst })
        items.push({ word, x: cx, y: cy, size, color })
        placed_ = true
        break
      }
    }
    if (!placed_ && i < 20) {
      // 못 넣으면 그냥 무작위 위치
      const cx = 60 + Math.random() * (W - 120)
      const cy = 30 + Math.random() * (H - 60)
      items.push({ word, x: cx, y: cy, size, color })
    }
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      {items.map((it, i) => (
        <text key={i} x={it.x} y={it.y} textAnchor="middle" dominantBaseline="middle"
          fontSize={it.size} fill={it.color} fontWeight="bold"
          style={{ fontFamily: 'Apple SD Gothic Neo, Malgun Gothic, sans-serif' }}>
          {it.word}
        </text>
      ))}
    </svg>
  )
}

export default function WordCloudView({ words, isMayor, myWordCount }: {
  words: Word[]; isMayor: boolean; myWordCount: number
}) {
  const router = useRouter()
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [errMsg, setErrMsg] = useState('')
  const [localWords, setLocalWords] = useState(words)

  const visible = localWords.filter(w => !w.hidden)
  const entries = countWords(localWords)
  const MAX_MINE = 3

  async function submit() {
    const clean = input.trim()
    if (!clean) return
    setBusy(true); setErrMsg('')
    const res = await fetch('/api/wordcloud', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: clean }),
    })
    setBusy(false)
    if (res.ok) {
      setInput('')
      router.refresh()
    } else {
      const d = await res.json()
      if (d.error === 'bad_word') setErrMsg('이 단어는 사용할 수 없어요. 다른 단어를 입력해봐요!')
      else setErrMsg(d.error ?? '오류가 났어요')
    }
  }

  async function toggleHide(wordId: string, hide: boolean) {
    await fetch('/api/wordcloud', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wordId, hidden: hide }),
    })
    setLocalWords(localWords.map(w => w.id === wordId ? { ...w, hidden: hide } : w))
  }

  return (
    <PageShell title="워드 클라우드" emoji="☁️">
      <div className="flex flex-col gap-4">
        {/* 워드 클라우드 표시 */}
        <div className="bg-white rounded-3xl p-4 shadow-sm">
          <WordCloudSvg entries={entries} />
          <div className="text-center text-xs text-gray-400 mt-2">단어 {visible.length}개 등록됨</div>
        </div>

        {/* 학생 입력 */}
        {!isMayor && (
          <div className="bg-white rounded-3xl p-6 shadow-sm">
            <div className="font-bold text-gray-800 mb-1">단어 입력하기</div>
            <p className="text-xs text-gray-400 mb-3">
              창업 활동에서 생각나는 단어를 입력해요! (최대 3개)
            </p>
            {myWordCount < MAX_MINE ? (
              <>
                <div className="flex gap-2">
                  <input value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && submit()}
                    placeholder="단어 입력..." maxLength={12}
                    className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:border-blue-400 outline-none" />
                  <button onClick={submit} disabled={busy || !input.trim()}
                    className="bg-blue-500 text-white px-5 py-3 rounded-xl font-bold disabled:opacity-40">
                    {busy ? '...' : '추가'}
                  </button>
                </div>
                {errMsg && <p className="text-red-500 text-sm mt-2">{errMsg}</p>}
                <p className="text-xs text-gray-400 mt-2">{myWordCount}/{MAX_MINE}개 입력함</p>
              </>
            ) : (
              <div className="text-center py-4 text-gray-400">
                최대 {MAX_MINE}개까지 입력할 수 있어요 ✅
              </div>
            )}
          </div>
        )}

        {/* 교사 관리 */}
        {isMayor && (
          <div className="bg-white rounded-3xl p-6 shadow-sm">
            <div className="font-bold text-gray-800 mb-3">단어 관리</div>
            <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
              {localWords.length === 0 && <p className="text-gray-400 text-sm">아직 단어가 없어요.</p>}
              {localWords.map(w => (
                <div key={w.id} className="flex justify-between items-center py-1.5 border-b border-gray-100 last:border-0">
                  <span className={`text-sm font-medium ${w.hidden ? 'line-through text-gray-300' : 'text-gray-700'}`}>
                    {w.word}
                  </span>
                  <button onClick={() => toggleHide(w.id, !w.hidden)}
                    className={`text-xs px-2 py-1 rounded-lg ${w.hidden ? 'bg-gray-100 text-gray-500' : 'bg-red-100 text-red-600'}`}>
                    {w.hidden ? '복원' : '숨김'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageShell>
  )
}
