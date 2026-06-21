'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ROLE_INFO, type Role } from '@/lib/types'

// 역할 전직 팝업 처리:
//  - CEO: reveal_pending 플래그(다음 로그인 시) → 마운트 시 표시
//  - 직원/공무원: Realtime으로 role 변경 즉시 감지 → 표시
export default function RevealWatcher({ userId, initialPending }: {
  userId: string; initialPending: 'ceo' | 'staff' | 'officer' | null
}) {
  const router = useRouter()
  const [reveal, setReveal] = useState<Role | null>(initialPending)

  useEffect(() => {
    const supabase = createClient()

    // 마운트 시 reveal_pending 소비 (CEO)
    if (initialPending) {
      supabase.from('users').update({ reveal_pending: null }).eq('id', userId).then(() => {})
    }

    // Realtime: 내 role 변경 감지 (직원·공무원 즉시 채용/임명)
    const ch = supabase.channel(`reveal-${userId}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${userId}` },
        (payload) => {
          const next = payload.new as { role: Role; reveal_pending: string | null }
          if ((next.role === 'staff' || next.role === 'officer' || next.role === 'ceo')) {
            setReveal(next.role)
          }
        })
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [userId, initialPending])

  if (!reveal) return null

  const info = ROLE_INFO[reveal]
  const msg: Record<string, { title: string; body: string }> = {
    ceo:     { title: '사업계획서가 선정됐어요!', body: '지원금 100,000원이 회사 계좌에 들어왔어요. 이제 CEO입니다.' },
    staff:   { title: '직원으로 채용됐어요!', body: '회사의 한 식구가 되었어요. 일급 10,400원을 받아요.' },
    officer: { title: '공무원으로 임명됐어요!', body: '도시의 살림을 맡았어요. 일급 10,400원을 받아요.' },
  }
  const m = msg[reveal]

  function close() {
    setReveal(null)
    router.refresh()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl p-8 w-full max-w-md text-center shadow-xl">
        <div className="text-6xl mb-3">{info.emoji}</div>
        <div className="text-sm font-bold text-blue-500 mb-1">🎊 축하해요</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-3">{m.title}</h2>
        <p className="text-gray-600 mb-6">{m.body}</p>
        <button onClick={close}
          className="w-full bg-blue-500 text-white rounded-2xl py-4 font-bold text-lg active:scale-95 transition-transform">
          좋아요!
        </button>
      </div>
    </div>
  )
}
