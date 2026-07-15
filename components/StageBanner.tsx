'use client'

import { STAGE_SHORT, STAGE_SESSIONS, STAGE_THEME, type Stage } from '@/lib/types'

const STAGES: Stage[] = [0, 1, 2, 3, 4, 5]

export default function StageBanner({ stage, paused }: { stage: Stage; paused: boolean }) {
  return (
    <div className="bg-white rounded-3xl px-5 py-4 shadow-sm flex flex-col gap-3">
      {paused && (
        <div className="bg-amber-100 text-amber-800 text-sm font-medium rounded-2xl px-4 py-2 text-center">
          ⏸️ 잠깐 멈춤 — 선생님을 봐 주세요
        </div>
      )}

      {/* 현재 단계 강조 배너 */}
      <div className="bg-blue-50 rounded-2xl px-4 py-3 flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center font-black text-xl shrink-0">
          {stage}
        </div>
        <div>
          <div className="flex items-baseline gap-2">
            <span className="font-black text-blue-700 text-lg">{STAGE_SHORT[stage]}</span>
            <span className="text-xs font-bold text-blue-400 bg-blue-100 rounded-full px-2 py-0.5">{STAGE_SESSIONS[stage]}</span>
          </div>
          <div className="text-xs text-blue-500 mt-0.5">{STAGE_THEME[stage]}</div>
        </div>
      </div>

      {/* 전체 진행 바 */}
      <div className="flex items-center justify-between gap-1">
        {STAGES.map((s, i) => (
          <div key={s} className="flex items-center flex-1 last:flex-none">
            <div className={`flex flex-col items-center gap-0.5 ${s === stage ? '' : 'opacity-40'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                ${s === stage ? 'bg-blue-500 text-white' : s < stage ? 'bg-blue-200 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                {s < stage ? '✓' : s}
              </div>
              <span className={`text-[10px] font-medium leading-none ${s === stage ? 'text-blue-600' : 'text-gray-400'}`}>
                {STAGE_SHORT[s]}
              </span>
            </div>
            {i < STAGES.length - 1 && (
              <div className={`flex-1 h-1 mx-1 rounded ${s < stage ? 'bg-blue-200' : 'bg-gray-100'}`} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
