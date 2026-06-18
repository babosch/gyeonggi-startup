'use client'

import { cityTheme, ROLE_INFO, type Role } from '@/lib/types'

interface Props {
  cityName: string
  color: string
  role: Role
  number: number
  nickname: string | null
  subtitle?: string       // 회사명 등
  balanceLabel?: string   // '회사 잔액' / '내 잔액' / '시청 잔액'
  balance?: number
}

export default function HomeHeader({
  cityName, color, role, number, nickname, subtitle, balanceLabel, balance,
}: Props) {
  const theme = cityTheme(color)
  const info = ROLE_INFO[role]
  const name = nickname ?? `${number}번`

  return (
    <div className={`${theme.header} rounded-3xl px-6 py-5 flex justify-between items-center shadow-sm`}>
      <div>
        <div className="text-sm opacity-90">{cityName} · {number}번</div>
        <div className="text-2xl font-bold mt-1 flex items-center gap-2 flex-wrap">
          <span>{info.emoji}</span>
          <span>{subtitle ?? name}</span>
          <span className="bg-white/25 text-sm font-medium px-3 py-0.5 rounded-full">
            {info.label}
          </span>
        </div>
      </div>
      {balanceLabel && balance !== undefined && (
        <div className="text-right">
          <div className="text-xs opacity-90">{balanceLabel}</div>
          <div className="text-2xl font-bold">{balance.toLocaleString()}원</div>
        </div>
      )}
    </div>
  )
}
