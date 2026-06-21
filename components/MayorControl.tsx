'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { mergeStageActivities } from '@/lib/activities'
import { STAGE_LABELS, STAGE_SHORT, type Stage } from '@/lib/types'

const STAGES: Stage[] = [0, 1, 2, 3, 4]

// currentStage·paused·fairMode는 부모(useStage 실시간)에서 내려온다 — 실시간 값 그대로 표시.
export default function MayorControl({ classId, currentStage, openActivities, paused, fairMode }: {
  classId: string; currentStage: Stage; openActivities: string[]; paused: boolean; fairMode: boolean
}) {
  const stage = currentStage
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState<Stage | null>(null)
  const [busy, setBusy] = useState<string | null>(null)  // 어떤 동작이 처리 중인지
  const router = useRouter()

  async function changeStage(next: Stage) {
    setSaving(true)
    const supabase = createClient()
    const nextActivities = mergeStageActivities(openActivities, next)
    await supabase.from('classes').update({ stage: next, open_activities: nextActivities }).eq('id', classId)
    router.refresh()  // 교사 화면 즉시 갱신 (실시간 보완)
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

      {confirm !== null && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4">
          <p className="text-blue-800 font-medium mb-3">
            모든 학생을 <b>{STAGE_LABELS[confirm]}</b> 단계로 넘길까요?
          </p>
          <div className="flex gap-2">
            <button onClick={() => changeStage(confirm)} disabled={saving}
              className="flex-1 bg-blue-500 text-white rounded-xl py-2.5 font-bold disabled:opacity-50">
              {saving ? '넘기는 중…' : '네, 넘길게요'}
            </button>
            <button onClick={() => setConfirm(null)} disabled={saving}
              className="px-5 bg-gray-100 text-gray-600 rounded-xl py-2.5 font-medium">
              취소
            </button>
          </div>
        </div>
      )}

      {/* 수업 멈춤 — 현재 상태를 크게 보여주고 토글 */}
      <div className="border-t border-gray-100 pt-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="font-bold text-gray-800">수업 멈춤</div>
            <div className="text-xs text-gray-400">멈추면 학생 화면이 흐려지고 활동을 못 해요 (설명할 때 집중시키기)</div>
          </div>
          <span className={`text-sm font-bold px-3 py-1 rounded-full ${paused ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
            {paused ? '⏸️ 멈춤 중' : '▶️ 수업 중'}
          </span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setPause(true)} disabled={paused || busy !== null}
            className={`flex-1 rounded-xl py-3 font-bold border-2 transition-all
              ${paused ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-white border-amber-200 text-amber-700 hover:bg-amber-50'}
              disabled:opacity-100`}>
            {busy === 'pause' ? '멈추는 중…' : paused ? '✓ 멈춰 있어요' : '⏸️ 지금 멈추기'}
          </button>
          <button onClick={() => setPause(false)} disabled={!paused || busy !== null}
            className={`flex-1 rounded-xl py-3 font-bold border-2 transition-all
              ${!paused ? 'bg-green-100 border-green-300 text-green-700' : 'bg-white border-green-200 text-green-700 hover:bg-green-50'}`}>
            {busy === 'resume' ? '여는 중…' : !paused ? '✓ 진행 중이에요' : '▶️ 다시 시작'}
          </button>
        </div>
      </div>

      {/* 박람회 — 상태 표시 + 토글 */}
      <div className="border-t border-gray-100 pt-4">
        <div className="flex items-center justify-between mb-2">
          <div className="font-bold text-gray-800">🎪 박람회</div>
          <span className={`text-sm font-bold px-3 py-1 rounded-full ${fairMode ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'}`}>
            {fairMode ? '열림' : '닫힘'}
          </span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setFair(true)} disabled={fairMode || busy !== null}
            className={`flex-1 rounded-xl py-3 font-medium border-2 transition-all
              ${fairMode ? 'bg-purple-100 border-purple-300 text-purple-700' : 'bg-white border-purple-200 text-purple-700 hover:bg-purple-50'}`}>
            {busy === 'fair-on' ? '여는 중…' : fairMode ? '✓ 열려 있어요' : '박람회 열기'}
          </button>
          <button onClick={() => setFair(false)} disabled={!fairMode || busy !== null}
            className="flex-1 rounded-xl py-3 font-medium border-2 bg-white border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50">
            {busy === 'fair-off' ? '닫는 중…' : '박람회 닫기'}
          </button>
        </div>
      </div>
    </div>
  )
}
