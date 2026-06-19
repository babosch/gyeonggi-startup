'use client'

import { useRouter } from 'next/navigation'
import { ACTIVITY_BY_KEY } from '@/lib/activities'

// 교사가 아직 이 활동을 수업 보드에 열지 않았을 때 보여주는 잠금 화면.
export default function ActivityLocked({ activityKey }: { activityKey: string }) {
  const router = useRouter()
  const a = ACTIVITY_BY_KEY[activityKey]
  const title = a?.label ?? '활동'
  const emoji = a?.emoji ?? '🔒'

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-3xl mx-auto">
        <button onClick={() => router.push('/home')} className="text-gray-400 text-sm mb-4">← 집으로</button>
        <h1 className="text-2xl font-bold text-gray-800 mb-5 flex items-center gap-2">
          <span>{emoji}</span> {title}
        </h1>
        <div className="bg-white rounded-3xl p-10 text-center shadow-sm">
          <div className="text-5xl mb-3">🔒</div>
          <p className="text-gray-600 font-medium">아직 열리지 않은 활동이에요</p>
          <p className="text-gray-400 text-sm mt-1">선생님이 수업 보드에서 열어주면 할 수 있어요</p>
        </div>
      </div>
    </div>
  )
}
