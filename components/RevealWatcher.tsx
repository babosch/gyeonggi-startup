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

    if (initialPending) {
      supabase.from('users').update({ reveal_pending: null }).eq('id', userId).then(() => {})
    }

    const ch = supabase.channel(`reveal-${userId}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${userId}` },
        (payload) => {
          const next = payload.new as { role: Role; reveal_pending: string | null }
          if (next.role === 'staff' || next.role === 'officer' || next.role === 'ceo') {
            setReveal(next.role)
          }
        })
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [userId, initialPending])

  if (!reveal) return null

  const info = ROLE_INFO[reveal]

  const STORY: Record<string, {
    title: string
    subtitle: string
    badge: string
    story: string
    duties: string[]
    tip: string
    color: string
    bg: string
  }> = {
    ceo: {
      title: '대표이사가 됐어요!',
      subtitle: '축하해요, 사업계획서가 선정됐어요 🎉',
      badge: '👔 대표이사',
      story: '드디어 내 회사를 갖게 됐어요! 회사 계좌에 지원금이 들어왔고, 이제 여러분이 대표예요. 직원을 뽑고, 물건을 만들고, 다른 도시와 교류하면서 회사를 키워봐요.',
      duties: [
        '📋 품의서 작성 → 필요한 물품 구입',
        '👷 직원 채용 → 지원자 면접 후 선택',
        '📝 업무일지 작성 → 오늘 한 일 기록',
        '🤝 교류카드 등록 → 다른 도시와 거래',
      ],
      tip: '💡 회사 잔액을 잘 관리하세요. 너무 많이 쓰면 위험해요!',
      color: 'from-amber-400 to-orange-500',
      bg: 'bg-amber-50',
    },
    staff: {
      title: '직원이 됐어요!',
      subtitle: '채용을 축하드려요 🎊',
      badge: '👷 직원',
      story: '드디어 일자리를 얻었어요! 이제 회사의 한 식구로서 대표이사와 함께 열심히 일해요. 일급을 받으면서 경제활동을 체험해 보세요.',
      duties: [
        '📝 업무일지 작성 → 오늘 한 일 기록',
        '🛒 품의서 작성 → 필요한 물품 신청',
        '🤝 회사 교류 활동 참여',
        '💭 성찰일지 작성 → 배운 점 정리',
      ],
      tip: '💡 업무일지를 꾸준히 써야 급여를 받을 수 있어요!',
      color: 'from-blue-400 to-blue-600',
      bg: 'bg-blue-50',
    },
    officer: {
      title: '공무원이 됐어요!',
      subtitle: '임명을 축하드려요 🏛️',
      badge: '🏛️ 공무원',
      story: '도시의 살림을 맡게 됐어요! 공무원은 기업들이 잘 운영되는지 시찰하고, 다른 도시와의 교류를 도와주는 중요한 역할이에요.',
      duties: [
        '🔍 기업 시찰 → 회사 방문 후 보고서 작성',
        '🤝 교류 성사 일지 → 다른 반 교류 기록',
        '⚠️ 이상 거래 신고 → 공정한 거래 감시',
        '📝 업무일지 → 오늘 한 일 기록',
      ],
      tip: '💡 시찰 보고서는 시장(선생님)에게 바로 전달돼요. 꼼꼼하게 써요!',
      color: 'from-purple-400 to-purple-600',
      bg: 'bg-purple-50',
    },
  }

  const s = STORY[reveal]
  if (!s) return null

  function close() {
    setReveal(null)
    router.refresh()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">

        {/* 헤더 그라디언트 */}
        <div className={`bg-gradient-to-r ${s.color} px-6 py-6 text-white text-center`}>
          <div className="text-5xl mb-2">{info.emoji}</div>
          <div className="text-xs font-bold opacity-80 mb-1">{s.subtitle}</div>
          <h2 className="text-2xl font-black">{s.title}</h2>
          <span className="inline-block mt-2 bg-white/20 text-white text-sm font-bold px-3 py-1 rounded-full">
            {s.badge}
          </span>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          {/* 스토리 */}
          <p className="text-gray-700 text-sm leading-relaxed">{s.story}</p>

          {/* 주요 할 일 */}
          <div className={`${s.bg} rounded-2xl p-4`}>
            <div className="text-xs font-bold text-gray-600 mb-2">📌 내가 할 일</div>
            <ul className="space-y-1.5">
              {s.duties.map((d, i) => (
                <li key={i} className="text-sm text-gray-700">{d}</li>
              ))}
            </ul>
          </div>

          {/* 팁 */}
          <p className="text-sm text-gray-500">{s.tip}</p>

          <button onClick={close}
            className={`w-full bg-gradient-to-r ${s.color} text-white rounded-2xl py-4 font-black text-lg active:scale-95 transition-transform`}>
            시작할게요! 🚀
          </button>
        </div>
      </div>
    </div>
  )
}
