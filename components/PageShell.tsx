'use client'

import { useRouter } from 'next/navigation'

interface Props {
  title: string
  emoji: string
  children: React.ReactNode
  locked?: { opensAt: string } | null
}

export default function PageShell({ title, emoji, children, locked }: Props) {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => typeof window !== 'undefined' && window.history.length > 1 ? router.back() : router.push('/home')}
          className="flex items-center gap-1.5 text-red-500 font-bold text-lg mb-5 hover:text-red-600 active:scale-95 transition-all">
          <span className="text-2xl leading-none font-black">←</span>
          <span>이전으로</span>
        </button>

        <h1 className="text-2xl font-bold text-gray-800 mb-5 flex items-center gap-2">
          <span>{emoji}</span> {title}
        </h1>

        {locked ? (
          <div className="bg-white rounded-3xl p-10 text-center shadow-sm">
            <div className="text-5xl mb-3">🔒</div>
            <p className="text-gray-600 font-medium">{locked.opensAt} 단계에 열려요</p>
            <p className="text-gray-400 text-sm mt-1">선생님이 단계를 열어 주면 사용할 수 있어요</p>
          </div>
        ) : children}
      </div>
    </div>
  )
}
