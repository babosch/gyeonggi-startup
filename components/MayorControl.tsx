'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { STAGE_LABELS, STAGE_SHORT, type Stage } from '@/lib/types'

const STAGES: Stage[] = [0, 1, 2, 3, 4]

export default function MayorControl({ classId, currentStage }: { classId: string; currentStage: Stage }) {
  const [stage, setStage] = useState<Stage>(currentStage)
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState<Stage | null>(null)

  // currentStage(실시간)와 로컬 동기화
  if (stage !== currentStage && !saving && confirm === null) {
    setStage(currentStage)
  }

  async function changeStage(next: Stage) {
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('classes').update({ stage: next }).eq('id', classId)
    if (!error) setStage(next)
    setSaving(false)
    setConfirm(null)
  }

  async function togglePause(paused: boolean) {
    const supabase = createClient()
    await supabase.from('classes').update({ paused }).eq('id', classId)
  }

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm flex flex-col gap-5">
      <div>
        <div className="text-sm text-gray-500 mb-1">수업 단계 제어</div>
        <div className="text-xl font-bold text-gray-800">지금: {STAGE_LABELS[stage]}</div>
      </div>

      {/* 단계 칩 */}
      <div className="flex gap-2 flex-wrap">
        {STAGES.map(s => (
          <button key={s}
            onClick={() => s !== stage && setConfirm(s)}
            disabled={saving}
            className={`px-4 py-2 rounded-full font-medium text-sm transition-all
              ${s === stage
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {s} {STAGE_SHORT[s]} {s === stage && '●'}
          </button>
        ))}
      </div>

      {/* 확인 다이얼로그 */}
      {confirm !== null && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4">
          <p className="text-blue-800 font-medium mb-3">
            모든 학생을 <b>{STAGE_LABELS[confirm]}</b> 단계로 넘길까요?
          </p>
          <div className="flex gap-2">
            <button onClick={() => changeStage(confirm)} disabled={saving}
              className="flex-1 bg-blue-500 text-white rounded-xl py-2.5 font-bold disabled:opacity-50">
              {saving ? '...' : '네, 넘길게요'}
            </button>
            <button onClick={() => setConfirm(null)} disabled={saving}
              className="px-5 bg-gray-100 text-gray-600 rounded-xl py-2.5 font-medium">
              취소
            </button>
          </div>
        </div>
      )}

      {/* 일시정지 */}
      <div className="flex gap-2 border-t border-gray-100 pt-4">
        <button onClick={() => togglePause(true)}
          className="flex-1 bg-amber-50 text-amber-700 border-2 border-amber-200 rounded-xl py-2.5 font-medium">
          ⏸️ 전체 멈춤
        </button>
        <button onClick={() => togglePause(false)}
          className="flex-1 bg-green-50 text-green-700 border-2 border-green-200 rounded-xl py-2.5 font-medium">
          ▶️ 다시 시작
        </button>
      </div>
    </div>
  )
}
