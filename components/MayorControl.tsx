'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { allActivitiesUpToStage } from '@/lib/activities'
import { STAGE_LABELS, STAGE_SHORT, STAGE_SESSIONS, type Stage } from '@/lib/types'

const STAGES: Stage[] = [0, 1, 2, 3, 4]
const STAGE_ICONS = ['🗺️', '🏭', '⚙️', '🤝', '🛒']

export default function MayorControl({ classId, currentStage, openActivities, paused, fairMode }: {
  classId: string; currentStage: Stage; openActivities: string[]; paused: boolean; fairMode: boolean
}) {
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const router = useRouter()

  async function changeStage(next: Stage) {
    if (next === currentStage) return
    setSaving(true)
    const supabase = createClient()
    // 단계별 큐레이션된 활동 목록으로 교체 (불필요한 이전 단계 활동 제거)
    await supabase.from('classes').update({ stage: next, open_activities: allActivitiesUpToStage(next) }).eq('id', classId)
    router.refresh()
    setSaving(false)
  }

  async function setPause(p: boolean) {
    setBusy(p ? 'pause' : 'resume')
    const supabase = createClient()
    await supabase.from('classes').update({ paused: p }).eq('id', classId)
    router.refresh()
    setBusy(null)
  }

  async function setFair(f: boolean) {
    setBusy(f ? 'fair-on' : 'fair-off')
    const supabase = createClient()
    await supabase.from('classes').update({ fair_mode: f }).eq('id', classId)
    router.refresh()
    setBusy(null)
  }

  const pct = ((currentStage + 1) / 5) * 100

  return (
    <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
      {/* 단계 바 */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="font-bold text-gray-800 text-lg">
              {STAGE_ICONS[currentStage]} {STAGE_LABELS[currentStage]}
            </span>
            <span className="ml-2 text-xs text-gray-400">{STAGE_SESSIONS[currentStage]}</span>
          </div>
          <button onClick={() => setPause(!paused)} disabled={busy !== null}
            className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all
              ${paused
                ? 'bg-amber-100 border-amber-300 text-amber-700'
                : 'bg-white border-gray-200 text-gray-600 hover:border-amber-300'}`}>
            {paused ? '▶️ 수업 재개' : '⏸️ 수업 멈춤'}
          </button>
        </div>

        {/* 진행 바 */}
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
          <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>

        {/* 단계 칩 */}
        <div className="flex gap-1.5">
          {STAGES.map(s => (
            <button key={s}
              onClick={() => changeStage(s)}
              disabled={saving}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all
                ${s === currentStage
                  ? 'bg-blue-500 text-white'
                  : s < currentStage
                    ? 'bg-blue-50 text-blue-400 hover:bg-blue-100'
                    : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>
              <div>{STAGE_ICONS[s]}</div>
              <div className="text-[10px] mt-0.5">{STAGE_SHORT[s]}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 박람회 모드 */}
      <div className="border-t border-gray-100 px-5 py-3">
        <button
          onClick={() => setFair(!fairMode)}
          disabled={busy !== null}
          className={`w-full flex items-center justify-between rounded-2xl px-4 py-3 border-2 transition-all
            ${fairMode
              ? 'bg-purple-50 border-purple-300'
              : 'bg-gray-50 border-gray-200 hover:border-purple-200'}`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎪</span>
            <div className="text-left">
              <div className={`font-bold text-sm ${fairMode ? 'text-purple-700' : 'text-gray-600'}`}>
                박람회 모드
              </div>
              <div className={`text-xs ${fairMode ? 'text-purple-500' : 'text-gray-400'}`}>
                {fairMode ? '공무원이 다른 반 교류 카드 열람 가능' : '교류 박람회 (켜면 다른 반 카드 공개)'}
              </div>
            </div>
          </div>
          <div className={`w-12 h-6 rounded-full flex items-center transition-all duration-300 px-1
            ${fairMode ? 'bg-purple-500 justify-end' : 'bg-gray-300 justify-start'}`}>
            <div className="w-4 h-4 rounded-full bg-white shadow" />
          </div>
        </button>
      </div>
    </div>
  )
}
