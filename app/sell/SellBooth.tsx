'use client'

import { useState, useEffect, useRef } from 'react'
import PageShell from '@/components/PageShell'
import type { Stage } from '@/lib/types'

interface Product { id: string; name: string; price: number; stock: number; sold: number }
type Step = 'scan' | 'product' | 'reason' | 'pin' | 'done'

export default function SellBooth({ stage, products, companyName, notSeller }: {
  stage: Stage; products: Product[]; companyName: string; notSeller?: boolean
}) {
  const [step, setStep] = useState<Step>('scan')
  const [buyerId, setBuyerId] = useState('')
  const [product, setProduct] = useState<Product | null>(null)
  const [reason, setReason] = useState('')
  const [pin, setPin] = useState('')
  const [stock, setStock] = useState<Record<string, number>>(
    Object.fromEntries(products.map(p => [p.id, p.stock]))
  )
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const scannerRef = useRef<{ clear: () => Promise<void> } | null>(null)

  // html5-qrcode 동적 로드 (scan 단계에서만)
  useEffect(() => {
    if (step !== 'scan' || notSeller) return
    let active = true
    import('html5-qrcode').then(({ Html5Qrcode }) => {
      if (!active) return
      const scanner = new Html5Qrcode('qr-reader')
      scannerRef.current = scanner as unknown as { clear: () => Promise<void> }
      scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 220 },
        (decoded: string) => {
          setBuyerId(decoded)
          setStep('product')
          scanner.stop().catch(() => {})
        },
        () => {}
      ).catch(() => setError('카메라를 열 수 없어요. 권한을 확인해 주세요.'))
    })
    return () => {
      active = false
      scannerRef.current?.clear?.().catch(() => {})
    }
  }, [step, notSeller])

  if (notSeller) return (
    <PageShell title="수금 (판매)" emoji="📱">
      <div className="bg-white rounded-3xl p-8 text-center text-gray-500">회사 소속(CEO·직원)만 판매할 수 있어요.</div>
    </PageShell>
  )

  function reset() {
    setStep('scan'); setBuyerId(''); setProduct(null); setReason(''); setPin(''); setError('')
  }

  function pinDigit(d: string) {
    if (pin.length >= 4 || busy) return
    const next = pin + d
    setPin(next)
    if (next.length === 4) pay(next)
  }

  async function pay(enteredPin: string) {
    setBusy(true); setError('')
    const txUuid = crypto.randomUUID()
    const res = await fetch('/api/pay', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ buyerId, pin: enteredPin, productId: product!.id, reason, txUuid }),
    })
    const d = await res.json()
    setBusy(false)
    if (res.ok) {
      setStock(s => ({ ...s, [product!.id]: (s[product!.id] ?? 1) - 1 }))
      setStep('done')
    } else {
      const msg: Record<string, string> = {
        wrong_pin: 'PIN이 틀렸어요', self_purchase: '자기 회사 물건은 못 사요',
        insufficient: '손님 잔액이 부족해요', sold_out: '품절됐어요',
      }
      setError(msg[d.error] ?? '결제에 실패했어요')
      setPin('')
    }
  }

  return (
    <PageShell title={`${companyName} 판매대`} emoji="📱">
      {/* 단계 안내 */}
      {step === 'scan' && (
        <div className="bg-white rounded-3xl p-6 shadow-sm text-center">
          <p className="font-medium text-gray-700 mb-4">손님의 QR 카드를 비춰 주세요</p>
          <div id="qr-reader" className="mx-auto rounded-2xl overflow-hidden max-w-xs" />
          {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
        </div>
      )}

      {step === 'product' && (
        <div className="bg-white rounded-3xl p-6 shadow-sm">
          <p className="font-medium text-gray-700 mb-3">어떤 상품인가요?</p>
          <div className="grid grid-cols-2 gap-3">
            {products.map(p => {
              const left = stock[p.id] ?? 0
              return (
                <button key={p.id} disabled={left <= 0}
                  onClick={() => { setProduct(p); setStep('reason') }}
                  className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-4 text-left active:scale-95 transition-all hover:border-blue-400 disabled:opacity-40">
                  <div className="font-bold text-gray-800">{p.name}</div>
                  <div className="text-sm text-blue-600">{p.price.toLocaleString()}원</div>
                  <div className="text-xs text-gray-400">{left <= 0 ? '품절' : `재고 ${left}`}</div>
                </button>
              )
            })}
          </div>
          <button onClick={reset} className="mt-4 text-gray-400 text-sm">← 처음으로</button>
        </div>
      )}

      {step === 'reason' && product && (
        <div className="bg-white rounded-3xl p-6 shadow-sm">
          <p className="font-medium text-gray-700 mb-1">{product.name} · {product.price.toLocaleString()}원</p>
          <label className="block text-sm text-gray-600 mt-3 mb-2">손님께 여쭤봐요: 왜 사나요?</label>
          <input value={reason} onChange={e => setReason(e.target.value)} maxLength={60}
            placeholder="예: 친구 선물로 주려고"
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-blue-400 outline-none" />
          <button onClick={() => setStep('pin')} disabled={!reason}
            className="w-full mt-4 bg-blue-500 text-white rounded-2xl py-3.5 font-bold disabled:opacity-40">
            다음 (손님 PIN)
          </button>
          <button onClick={reset} className="mt-3 text-gray-400 text-sm">← 처음으로</button>
        </div>
      )}

      {step === 'pin' && product && (
        <div className="bg-white rounded-3xl p-6 shadow-sm flex flex-col items-center">
          <p className="font-medium text-gray-700 mb-1">손님이 PIN을 입력해요</p>
          <p className="text-sm text-gray-400 mb-4">{product.name} · {product.price.toLocaleString()}원</p>
          <div className="flex gap-4 mb-4">
            {[0,1,2,3].map(i => (
              <div key={i} className={`w-5 h-5 rounded-full ${i < pin.length ? 'bg-gray-800' : 'bg-gray-300'}`} />
            ))}
          </div>
          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
          <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
            {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k, i) => {
              if (k === '') return <div key={i} />
              return (
                <button key={i} onClick={() => k === '⌫' ? setPin(pin.slice(0, -1)) : pinDigit(k)} disabled={busy}
                  className={`h-16 rounded-2xl font-bold text-xl active:scale-95 transition-all
                    ${k === '⌫' ? 'bg-gray-200 text-gray-600' : 'bg-gray-50 border-2 border-gray-200 text-gray-800'} disabled:opacity-40`}>
                  {k}
                </button>
              )
            })}
          </div>
          <button onClick={reset} className="mt-4 text-gray-400 text-sm">취소</button>
        </div>
      )}

      {step === 'done' && product && (
        <div className="bg-white rounded-3xl p-8 shadow-sm text-center">
          <div className="text-6xl mb-3">✅</div>
          <p className="text-xl font-bold text-gray-800 mb-1">결제 완료!</p>
          <p className="text-gray-600 mb-6">{product.name} · {product.price.toLocaleString()}원</p>
          <button onClick={reset}
            className="w-full bg-blue-500 text-white rounded-2xl py-4 font-bold text-lg active:scale-95 transition-transform">
            다음 손님 받기
          </button>
        </div>
      )}
    </PageShell>
  )
}
