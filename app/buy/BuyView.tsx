'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import PageShell from '@/components/PageShell'

interface Product { id: string; name: string; price: number; stock: number }
interface CartItem { product: Product; qty: number }

type Step = 'scan' | 'cart' | 'pin' | 'done'

export default function BuyView({ buyerId, myCompanyId, balance, classCode, studentNumber }: {
  buyerId: string
  myCompanyId: string | null
  balance: number
  classCode: string
  studentNumber: number
}) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('scan')
  const [companyId, setCompanyId] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null)

  const total = cart.reduce((s, it) => s + it.product.price * it.qty, 0)

  // QR 스캐너 초기화
  useEffect(() => {
    if (step !== 'scan') return
    let active = true
    // html5-qrcode는 QR이 화면에 보이는 동안 프레임마다 성공 콜백을 반복 호출한다.
    // stop()이 실제로 카메라를 끄기까지는 시간이 걸리므로, 가드 없이는 같은 QR에 대해
    // scanner.stop()/loadCompany()가 동시에 여러 번 겹쳐 호출되어 화면이 멈춘 것처럼 보인다.
    let handled = false
    import('html5-qrcode').then(({ Html5Qrcode }) => {
      if (!active) return
      const scanner = new Html5Qrcode('buy-qr-reader')
      scannerRef.current = scanner as unknown as { stop: () => Promise<void> }
      scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 220 },
        async (decoded: string) => {
          if (handled) return
          // 포맷: "company:<companyId>"
          const match = decoded.match(/^company:(.+)$/)
          if (!match) { setError('올바른 판매대 QR이 아니에요'); return }
          const cid = match[1]
          if (cid === myCompanyId) { setError('내 회사 물건은 살 수 없어요!'); return }
          handled = true
          await scanner.stop().catch(() => {})
          await loadCompany(cid)
        },
        () => {}
      ).catch(() => setError('카메라를 열 수 없어요. 권한을 확인해 주세요.'))
    })
    return () => {
      active = false
      scannerRef.current?.stop?.().catch(() => {})
    }
  }, [step])

  const buyErrorMessages: Record<string, string> = {
    unauthorized: '로그인이 필요해요. 다시 로그인해 주세요',
    not_found: '내 정보를 찾을 수 없어요',
    missing_company: '올바른 판매대 QR이 아니에요',
    company_not_found: '판매대를 찾을 수 없어요',
    wrong_class: '다른 반의 판매대예요',
    self_purchase: '내 회사 물건은 살 수 없어요',
  }

  async function loadCompany(cid: string) {
    setBusy(true)
    try {
      const res = await fetch(`/api/buy/products?companyId=${encodeURIComponent(cid)}`)
      const d = await res.json()
      if (!res.ok) { setError(buyErrorMessages[d.error] ?? '상점 정보를 불러올 수 없어요'); return }
      setCompanyId(cid)
      setCompanyName(d.companyName)
      setProducts(d.products)
      setCart([])
      setStep('cart')
    } catch {
      setError('인터넷이 잠깐 끊겼어요. 다시 스캔해 주세요')
    } finally {
      setBusy(false)
    }
  }

  function setQty(product: Product, qty: number) {
    if (qty <= 0) {
      setCart(cart.filter(c => c.product.id !== product.id))
    } else if (qty > product.stock) {
      return
    } else {
      const existing = cart.find(c => c.product.id === product.id)
      if (existing) setCart(cart.map(c => c.product.id === product.id ? { ...c, qty } : c))
      else setCart([...cart, { product, qty }])
    }
  }

  function getQty(productId: string) {
    return cart.find(c => c.product.id === productId)?.qty ?? 0
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
    try {
      const res = await fetch('/api/buy', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          cart: cart.map(c => ({ productId: c.product.id, qty: c.qty })),
          pin: enteredPin,
          txUuid,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setStep('done')
      } else {
        const msg: Record<string, string> = {
          wrong_pin: 'PIN이 틀렸어요', self_purchase: '내 회사 물건은 살 수 없어요',
          insufficient: `잔액이 부족해요 (필요: ${total.toLocaleString()}원)`,
          sold_out: '일부 상품이 품절됐어요',
        }
        setError(msg[data.error] ?? '결제에 실패했어요')
        setPin('')
      }
    } catch {
      setError('인터넷이 잠깐 끊겼어요. 다시 시도해 주세요')
      setPin('')
    } finally {
      setBusy(false)
    }
  }

  function reset() {
    setStep('scan'); setCompanyId(''); setCompanyName(''); setProducts([])
    setCart([]); setPin(''); setError('')
  }

  return (
    <PageShell title="물건 사기" emoji="🛒">
      {step === 'scan' && (
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-3xl p-6 shadow-sm text-center">
            <div className="text-4xl mb-3">📷</div>
            <p className="font-medium text-gray-700 mb-4">판매대의 QR을 스캔하세요</p>
            <div id="buy-qr-reader" className="mx-auto rounded-2xl overflow-hidden max-w-xs" />
            {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
            {busy && <p className="text-gray-400 text-sm mt-3">불러오는 중...</p>}
          </div>
          <div className="bg-blue-50 rounded-2xl p-4 text-sm text-blue-700 text-center">
            판매대 화면에 표시된 QR 코드를 카메라로 비춰요
          </div>
          <button onClick={() => router.push('/card')} className="text-center text-gray-400 text-sm">
            ← 내 카드로 돌아가기
          </button>
        </div>
      )}

      {step === 'cart' && (
        <div className="flex flex-col gap-4">
          <div className="bg-blue-50 rounded-2xl p-3 flex justify-between items-center">
            <span className="font-bold text-blue-800">{companyName}</span>
            <span className="text-sm text-blue-600">내 잔액 {balance.toLocaleString()}원</span>
          </div>

          <div className="bg-white rounded-3xl p-5 shadow-sm">
            <div className="font-bold text-gray-800 mb-3">🏷️ 상품 고르기</div>
            {products.length === 0 ? (
              <p className="text-gray-400 text-sm">판매 중인 상품이 없어요.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {/* 열 헤더 */}
                <div className="grid grid-cols-12 gap-2 px-1">
                  <span className="col-span-5 text-xs text-gray-400 font-medium">상품</span>
                  <span className="col-span-3 text-xs text-gray-400 font-medium text-right">단가</span>
                  <span className="col-span-4 text-xs text-gray-400 font-medium text-center">수량</span>
                </div>
                {products.map(p => {
                  const qty = getQty(p.id)
                  const soldOut = p.stock <= 0
                  return (
                    <div key={p.id} className={`grid grid-cols-12 gap-2 items-center py-2 border-b border-gray-100 last:border-0
                      ${soldOut ? 'opacity-40' : ''}`}>
                      <div className="col-span-5">
                        <div className="text-sm font-medium text-gray-800">{p.name}</div>
                        {soldOut && <div className="text-xs text-red-400">품절</div>}
                      </div>
                      <div className="col-span-3 text-sm text-blue-600 font-medium text-right">
                        {p.price.toLocaleString()}
                      </div>
                      <div className="col-span-4 flex items-center justify-center gap-2">
                        <button onClick={() => setQty(p, qty - 1)} disabled={soldOut || qty === 0}
                          className="w-8 h-8 rounded-full bg-gray-100 font-bold text-gray-600 disabled:opacity-30 active:bg-gray-200">
                          -
                        </button>
                        <span className="w-6 text-center text-sm font-bold text-gray-800">{qty}</span>
                        <button onClick={() => setQty(p, qty + 1)} disabled={soldOut || qty >= p.stock}
                          className="w-8 h-8 rounded-full bg-blue-100 font-bold text-blue-600 disabled:opacity-30 active:bg-blue-200">
                          +
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {cart.length > 0 && (
            <div className="bg-white rounded-3xl p-5 shadow-sm">
              <div className="font-bold text-gray-800 mb-2">🧾 선택 목록</div>
              {cart.map(c => (
                <div key={c.product.id} className="flex justify-between text-sm py-1.5 border-b border-gray-100 last:border-0">
                  <span className="text-gray-700">{c.product.name} × {c.qty}</span>
                  <span className="font-medium text-gray-800">{(c.product.price * c.qty).toLocaleString()}원</span>
                </div>
              ))}
              <div className="flex justify-between font-bold pt-2 mt-1">
                <span>합계</span>
                <span className={total > balance ? 'text-red-500' : 'text-blue-600'}>
                  {total.toLocaleString()}원
                </span>
              </div>
              {total > balance && (
                <p className="text-red-500 text-xs mt-1">잔액이 부족해요!</p>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={reset} className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-gray-500 font-medium">
              취소
            </button>
            <button onClick={() => setStep('pin')}
              disabled={cart.length === 0 || total > balance || total === 0}
              className="flex-2 flex-1 py-3 rounded-2xl bg-blue-500 text-white font-bold disabled:opacity-40">
              결제하기 →
            </button>
          </div>
        </div>
      )}

      {step === 'pin' && (
        <div className="flex flex-col items-center gap-4">
          <div className="bg-white rounded-3xl p-6 shadow-sm w-full text-center">
            <div className="text-4xl mb-2">🔐</div>
            <p className="font-bold text-gray-800 mb-1">내 PIN을 입력해요</p>
            <p className="text-sm text-gray-400 mb-1">결제 금액</p>
            <p className="text-2xl font-bold text-blue-600 mb-4">{total.toLocaleString()}원</p>

            <div className="flex gap-4 justify-center mb-4">
              {[0,1,2,3].map(i => (
                <div key={i} className={`w-5 h-5 rounded-full transition-colors ${i < pin.length ? 'bg-gray-800' : 'bg-gray-300'}`} />
              ))}
            </div>

            {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

            <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
              {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k, i) => {
                if (k === '') return <div key={i} />
                return (
                  <button key={i} onClick={() => k === '⌫' ? setPin(pin.slice(0, -1)) : pinDigit(k)}
                    disabled={busy}
                    className={`h-16 rounded-2xl font-bold text-xl active:scale-95 transition-all disabled:opacity-40
                      ${k === '⌫' ? 'bg-gray-200 text-gray-600' : 'bg-gray-50 border-2 border-gray-200 text-gray-800'}`}>
                    {k}
                  </button>
                )
              })}
            </div>
          </div>
          <button onClick={() => { setStep('cart'); setPin(''); setError('') }} className="text-gray-400 text-sm">
            ← 장바구니로
          </button>
        </div>
      )}

      {step === 'done' && (
        <div className="bg-white rounded-3xl p-10 shadow-sm text-center">
          <div className="text-6xl mb-4">✅</div>
          <p className="text-2xl font-bold text-gray-800 mb-2">결제 완료!</p>
          <p className="text-gray-500 mb-1">{companyName}에서</p>
          <p className="text-xl font-bold text-blue-600 mb-6">{total.toLocaleString()}원 결제</p>
          <div className="text-sm text-gray-500 mb-6">
            {cart.map(c => (
              <div key={c.product.id}>{c.product.name} × {c.qty}</div>
            ))}
          </div>
          <button onClick={() => router.push('/card')}
            className="w-full bg-blue-500 text-white rounded-2xl py-4 font-bold text-lg active:scale-95 transition-transform">
            내 카드로 돌아가기
          </button>
        </div>
      )}
    </PageShell>
  )
}
