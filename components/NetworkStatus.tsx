'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

// 인터넷 끊김 감지 → 안내 배너 표시. 다시 연결되면 자동 새로고침.
export default function NetworkStatus() {
  const router = useRouter()
  const [offline, setOffline] = useState(false)
  const [reconnected, setReconnected] = useState(false)

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) setOffline(true)

    let wasOffline = false
    function goOffline() {
      wasOffline = true
      setReconnected(false)
      setOffline(true)
    }
    function goOnline() {
      setOffline(false)
      if (wasOffline) {
        wasOffline = false
        setReconnected(true)
        // 최신 상태로 자동 갱신 (입력 내용은 보존하는 소프트 새로고침)
        router.refresh()
        setTimeout(() => setReconnected(false), 2500)
      }
    }

    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)
    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online', goOnline)
    }
  }, [router])

  if (!offline && !reconnected) return null

  return (
    <div
      role="status"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999 }}
      className={`text-center text-sm font-bold py-2.5 px-4 shadow-md
        ${offline ? 'bg-amber-400 text-amber-900' : 'bg-green-500 text-white'}`}
    >
      {offline
        ? '📡 인터넷이 잠깐 끊겼어요. 연결되면 자동으로 계속돼요.'
        : '✅ 다시 연결됐어요! 최신 상태로 새로고침했어요.'}
    </div>
  )
}
