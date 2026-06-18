'use client'

import { STAGE_SHORT, type Stage } from '@/lib/types'

const STAGES: Stage[] = [0, 1, 2, 3, 4]

export default function StageBanner({ stage, paused }: { stage: Stage; paused: boolean }) {
  return (
    <div className="bg-white rounded-3xl px-6 py-4 shadow-sm">
      {paused && (
        <div className="mb-3 bg-amber-100 text-amber-800 text-sm font-medium rounded-2xl px-4 py-2 text-center">
          ⏸️ 잠깐 멈춤 — 선생님을 봐 주세요
        </div>
      )}
      <div className="flex items-center justify-between gap-1">
        {STAGES.map((s, i) => (
          <div key={s} className="flex items-center flex-1 last:flex-none">
            <div className={`flex flex-col items-center gap-1 ${s === stage ? '' : 'opacity-40'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg
                ${s === stage ? 'bg-blue-500 text-white' : s < stage ? 'bg-blue-100 text-blue-500' : 'bg-gray-100 text-gray-400'}`}>
                {s < stage ? '✓' : s}
              </div>
              <span className={`text-xs font-medium ${s === stage ? 'text-blue-600' : 'text-gray-400'}`}>
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
