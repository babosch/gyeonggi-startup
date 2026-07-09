'use client'

import { useEffect } from 'react'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-3xl p-8 shadow-sm max-w-sm w-full text-center">
        <div className="text-5xl mb-4">📡</div>
        <p className="text-xl font-bold text-gray-800 mb-2">잠깐 문제가 생겼어요</p>
        <p className="text-sm text-gray-500 mb-6">인터넷이 잠깐 끊겼을 수 있어요. 다시 시도해 주세요.</p>
        <button
          onClick={reset}
          className="w-full bg-blue-500 text-white rounded-2xl py-4 font-bold text-lg active:scale-95 transition-transform"
        >
          다시 시도
        </button>
        <button
          onClick={() => (window.location.href = '/home')}
          className="w-full mt-3 text-gray-400 text-sm"
        >
          처음 화면으로
        </button>
      </div>
    </div>
  )
}
