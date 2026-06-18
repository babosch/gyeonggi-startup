'use client'

import { useRouter } from 'next/navigation'
import { STAGE_SHORT, type Stage } from '@/lib/types'

interface Props {
  emoji: string
  label: string
  hint?: string
  href?: string
  // 이 카드가 열리는 단계. 현재 단계가 이보다 작으면 잠금.
  opensAt?: Stage
  currentStage: Stage
  // 항상 열림 (성찰 등)
  always?: boolean
  badge?: string
}

export default function TaskCard({
  emoji, label, hint, href, opensAt, currentStage, always, badge,
}: Props) {
  const router = useRouter()
  const locked = !always && opensAt !== undefined && currentStage < opensAt

  if (locked) {
    return (
      <div className="bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 opacity-70">
        <div className="text-2xl">🔒</div>
        <div className="text-sm font-bold mt-1 text-gray-500">{label}</div>
        <div className="text-xs text-gray-400 mt-0.5">
          {STAGE_SHORT[opensAt!]} 단계에 열려요
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => href && router.push(href)}
      className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 text-left
        active:scale-95 transition-transform hover:border-blue-400 relative w-full">
      {badge && (
        <span className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
      <div className="text-3xl">{emoji}</div>
      <div className="text-base font-bold mt-2 text-blue-800">{label}</div>
      {hint && <div className="text-xs text-blue-600 mt-0.5">{hint}</div>}
    </button>
  )
}
