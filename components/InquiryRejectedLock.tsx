'use client'

import { useRouter } from 'next/navigation'
import PageShell from '@/components/PageShell'

// 탐구 질문 답이 반려돼 해당 기능이 잠긴 화면. 업무일지에서 다시 답하면 풀린다.
export default function InquiryRejectedLock({ title = '내 카드', reason }: { title?: string; reason: string | null }) {
  const router = useRouter()
  return (
    <PageShell title={title} emoji="🔒">
      <div className="bg-white rounded-3xl p-8 text-center flex flex-col gap-4">
        <div className="text-5xl">🔒</div>
        <div className="font-bold text-gray-800 text-lg">탐구 질문을 다시 써야 열려요</div>
        <p className="text-gray-500 text-sm leading-relaxed">
          선생님이 탐구 질문 답을 반려했어요.<br />업무일지에서 질문에 다시 제대로 답하면 이 기능이 다시 열려요.
        </p>
        {reason && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-sm text-red-600">
            반려 사유: {reason}
          </div>
        )}
        <button onClick={() => router.push('/worklog')}
          className="bg-blue-500 text-white rounded-2xl py-3.5 font-bold text-lg active:scale-95 transition-transform">
          탐구 질문 다시 쓰러 가기
        </button>
      </div>
    </PageShell>
  )
}
