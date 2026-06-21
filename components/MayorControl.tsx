'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { mergeStageActivities, allActivitiesForStage, STAGE_DEFAULTS } from '@/lib/activities'
import { STAGE_LABELS, STAGE_SHORT, type Stage } from '@/lib/types'

const STAGES: Stage[] = [0, 1, 2, 3, 4]
const STAGE_ICONS = ['🗺️', '🏭', '⚙️', '🤝', '🛒']

export default function MayorControl({ classId, currentStage, openActivities, paused, fairMode }: {
  classId: string; currentStage: Stage; openActivities: string[]; paused: boolean; fairMode: boolean
}) {
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState<Stage | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const router = useRouter()

  async function changeStage(next: Stage) {
    setSaving(true)
    const supabase = createClient()
    const nextActivities = mergeStageActivities(openActivities, next)
    await supabase.from('classes').update({ stage: next, open_activities: nextActivities }).eq('id', classId)
    router.refresh()
    setSaving(false)
    setConfirm(null)
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
            <span className="ml-2 text-xs text-gray-400">단계 {currentStage}/4</span>
          </div>
          {/* 빠른 액션 */}
          <div className="flex items-center gap-2">
            <button onClick={() => setPause(!paused)} disabled={busy !== null}
              title={paused ? '수업 재개' : '수업 멈추기'}
              className={`px-3 py-1.5 rounded-xl text-sm font-bold border-2 transition-all
                ${paused
                  ? 'bg-amber-100 border-amber-300 text-amber-700'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-amber-300'}`}>
              {paused ? '▶️ 재개' : '⏸️ 멈춤'}
            </button>
            <button onClick={() => setFair(!fairMode)} disabled={busy !== null}
              title={fairMode ? '박람회 끄기' : '박람회 켜기'}
              className={`px-3 py-1.5 rounded-xl text-sm font-bold border-2 transition-all
                ${fairMode
                  ? 'bg-purple-100 border-purple-300 text-purple-700'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-purple-300'}`}>
              🎪
            </button>
          </div>
        </div>

        {/* 진행 바 */}
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
          <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>

        {/* 단계 칩 */}
        <div className="flex gap-1.5">
          {STAGES.map(s => (
            <button key={s}
              onClick={() => s !== currentStage && setConfirm(s)}
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

      {/* 단계 전환 확인 */}
      {confirm !== null && (
        <div className="mx-5 mb-4 bg-blue-50 border-2 border-blue-200 rounded-2xl p-4">
          <p className="text-blue-800 font-bold mb-1">
            {STAGE_ICONS[confirm]} {STAGE_LABELS[confirm]} 단계로 전환할까요?
          </p>
          <p className="text-xs text-blue-600 mb-3">
            기본 활동 자동 추가: {(STAGE_DEFAULTS[confirm] ?? []).join(', ') || '없음'}
          </p>
          <div className="flex gap-2">
            <button onClick={() => changeStage(confirm)} disabled={saving}
              className="flex-1 bg-blue-500 text-white rounded-xl py-2.5 font-bold text-sm disabled:opacity-50">
              {saving ? '전환 중…' : '✓ 전환하기'}
            </button>
            <button onClick={() => setConfirm(null)}
              className="px-4 bg-white border-2 border-gray-200 text-gray-600 rounded-xl py-2.5 text-sm">
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
