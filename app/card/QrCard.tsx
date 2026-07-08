'use client'

import { useRouter } from 'next/navigation'
import PageShell from '@/components/PageShell'
import { cityTheme } from '@/lib/types'

export default function QrCard({ cityName, color, number, nickname, balance }: {
  cityName: string; color: string; number: number; nickname: string | null; balance: number
}) {
  const theme = cityTheme(color)
  const router = useRouter()

  return (
    <PageShell title="내 체크카드" emoji="💳">
      <div className="flex flex-col gap-4">
        {/* 카드 본체 */}
        <div className={`${theme.solid} rounded-3xl p-8 text-white text-center shadow-sm`}>
          <div className="text-sm opacity-90 mb-1">{cityName}</div>
          <div className="text-2xl font-bold mb-0.5">{nickname ?? `${number}번`}</div>
          <div className="text-4xl font-bold mt-4">{balance.toLocaleString()}원</div>
        </div>

        {/* 물건 사기 버튼 */}
        <button
          onClick={() => router.push('/buy')}
          className="bg-blue-500 text-white rounded-3xl p-6 flex items-center gap-4 active:scale-95 transition-transform shadow-sm">
          <span className="text-4xl">🛒</span>
          <div className="text-left">
            <div className="text-xl font-bold">물건 사기</div>
            <div className="text-sm opacity-90">판매대 QR 스캔 → 상품 선택 → 결제</div>
          </div>
          <span className="ml-auto text-2xl">→</span>
        </button>

        <div className="bg-blue-50 rounded-2xl p-4 text-sm text-blue-700">
          💡 물건을 사고 싶으면 &quot;물건 사기&quot;를 눌러서 판매대의 QR을 스캔하세요. PIN을 입력하면 내 잔액에서 자동으로 결제돼요.
        </div>
      </div>
    </PageShell>
  )
}
