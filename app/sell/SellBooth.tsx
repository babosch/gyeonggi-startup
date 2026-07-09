'use client'

import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import PageShell from '@/components/PageShell'
import type { Stage } from '@/lib/types'

interface Product { id: string; name: string; price: number; stock: number; sold: number }

export default function SellBooth({ stage, companyId, companyName, products, notSeller }: {
  stage: Stage; companyId: string; companyName: string; products: Product[]; notSeller?: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [totalSold, setTotalSold] = useState(products.reduce((s, p) => s + p.sold, 0))

  useEffect(() => {
    if (canvasRef.current && companyId) {
      // 실제 URL로 인코딩 — 앱 내 스캐너뿐 아니라 폰 카메라 등 다른 스캐너로 찍어도 바로 열리도록
      const url = `${window.location.origin}/buy?company=${companyId}`
      QRCode.toCanvas(canvasRef.current, url, { width: 240, margin: 1 }, () => {})
    }
  }, [companyId])

  if (notSeller) return (
    <PageShell title="판매" emoji="📱">
      <div className="bg-white rounded-3xl p-8 text-center text-gray-500">
        <div className="text-4xl mb-3">🏪</div>
        회사 소속(CEO·직원)만 판매할 수 있어요.
      </div>
    </PageShell>
  )

  return (
    <PageShell title={`${companyName} 판매대`} emoji="📱">
      <div className="flex flex-col gap-4">
        {/* QR 코드 — 구매자에게 보여줌 */}
        <div className="bg-white rounded-3xl p-6 shadow-sm text-center">
          <p className="text-sm font-medium text-gray-500 mb-3">
            손님이 이 QR을 스캔하면 바로 결제해요
          </p>
          <div className="bg-white border-4 border-blue-100 rounded-2xl p-3 inline-block">
            <canvas ref={canvasRef} />
          </div>
          <p className="text-lg font-bold text-gray-800 mt-3">{companyName}</p>
          <p className="text-sm text-blue-600 font-medium">
            오늘 {totalSold}개 판매됨
          </p>
        </div>

        {/* 상품 목록 */}
        <div className="bg-white rounded-3xl p-6 shadow-sm">
          <div className="font-bold text-gray-800 mb-3">
            🏷️ 우리 상품
          </div>
          {products.length === 0 ? (
            <p className="text-gray-400 text-sm">등록된 상품이 없어요. 회사 관리에서 추가하세요.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {products.map(p => {
                const soldOut = p.stock <= 0
                return (
                  <div key={p.id} className={`flex justify-between items-center py-3 px-4 rounded-2xl border-2
                    ${soldOut ? 'border-gray-100 bg-gray-50' : 'border-blue-100 bg-blue-50'}`}>
                    <div>
                      <span className={`font-bold ${soldOut ? 'text-gray-400' : 'text-gray-800'}`}>
                        {p.name}
                      </span>
                      {soldOut && <span className="ml-2 text-xs text-red-400 font-medium">품절</span>}
                    </div>
                    <div className="text-right">
                      <div className={`font-bold ${soldOut ? 'text-gray-400' : 'text-blue-600'}`}>
                        {p.price.toLocaleString()}원
                      </div>
                      <div className="text-xs text-gray-400">재고 {p.stock}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="bg-amber-50 rounded-2xl p-4 text-sm text-amber-700 text-center">
          💡 손님은 자신의 체크카드 화면에서 &quot;물건 사기&quot; 버튼으로 이 QR을 스캔해요.
        </div>
      </div>
    </PageShell>
  )
}
