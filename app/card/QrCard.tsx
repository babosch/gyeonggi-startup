'use client'

import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'
import PageShell from '@/components/PageShell'
import { cityTheme } from '@/lib/types'

export default function QrCard({ userId, cityName, color, number, nickname, balance }: {
  userId: string; cityName: string; color: string; number: number; nickname: string | null; balance: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const theme = cityTheme(color)

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, userId, { width: 220, margin: 1 }, () => {})
    }
  }, [userId])

  return (
    <PageShell title="내 체크카드" emoji="💳">
      <div className={`${theme.solid} rounded-3xl p-8 text-white text-center shadow-sm`}>
        <div className="text-sm opacity-90">{cityName}</div>
        <div className="text-2xl font-bold mb-1">{nickname ?? `${number}번`}</div>
        <div className="text-sm opacity-90 mb-6">잔액 {balance.toLocaleString()}원</div>
        <div className="bg-white rounded-2xl p-4 inline-block">
          <canvas ref={canvasRef} />
        </div>
        <p className="text-sm opacity-90 mt-5">
          물건을 살 때 이 QR을 판매자에게 보여주세요
        </p>
      </div>
    </PageShell>
  )
}
