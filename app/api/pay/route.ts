import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSb } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { transfer, syncCompanyBalance } from '@/lib/ledger'
import { pinToPassword } from '@/lib/auth'

// 체크카드 방식 QR 결제.
// 판매자(CEO·직원)가 손님 QR을 스캔 → 상품 선택 → 손님 PIN 입력 → 결제.
// 방어: 판매자 인증, 손님 PIN 검증, 자가구매 차단, 재고/잔액 확인, 멱등키.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user: seller } } = await supabase.auth.getUser()
  if (!seller) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  // 판매자 = 회사 소속 (CEO·직원)
  const { data: sellerRow } = await supabase
    .from('users').select('role, company_id, class_id').eq('id', seller.id).single()
  if (!sellerRow?.company_id || (sellerRow.role !== 'ceo' && sellerRow.role !== 'staff')) {
    return NextResponse.json({ error: 'not_seller' }, { status: 403 })
  }

  const { buyerId, pin, productId, reason, txUuid } = await req.json()
  if (!buyerId || !pin || !productId || !txUuid) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 })
  }

  const admin = createAdminClient()

  // 상품 조회 + 판매자 회사 소속 확인
  const { data: product } = await admin
    .from('products').select('id, company_id, name, price, stock, sold').eq('id', productId).single()
  if (!product) return NextResponse.json({ error: 'no_product' }, { status: 404 })
  if (product.company_id !== sellerRow.company_id) {
    return NextResponse.json({ error: 'wrong_company' }, { status: 400 })
  }
  if (product.stock <= 0) return NextResponse.json({ error: 'sold_out' }, { status: 400 })

  // 구매자 조회 (같은 반)
  const { data: buyer } = await admin
    .from('users').select('id, number, company_id, class_id, classes(code)').eq('id', buyerId).single()
  if (!buyer || buyer.class_id !== sellerRow.class_id) {
    return NextResponse.json({ error: 'invalid_buyer' }, { status: 400 })
  }

  // 자가구매 차단 — 구매자가 판매 회사 소속이면 거부
  if (buyer.company_id === product.company_id) {
    return NextResponse.json({ error: 'self_purchase' }, { status: 400 })
  }

  // 구매자 PIN 검증 (별도 익명 클라이언트로 signIn 시도)
  const code = (Array.isArray(buyer.classes) ? buyer.classes[0] : buyer.classes) as { code: string }
  const email = `${code.code.toLowerCase()}-${buyer.number}@classroom.local`
  const verifier = createSb(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )
  const { error: pinErr } = await verifier.auth.signInWithPassword({ email, password: pinToPassword(pin) })
  if (pinErr) return NextResponse.json({ error: 'wrong_pin' }, { status: 401 })

  // 결제 (구매자 user → 판매 회사) — 멱등키 = txUuid
  const result = await transfer({
    admin, fromType: 'user', fromId: buyerId, toType: 'company', toId: product.company_id,
    amount: product.price, type: 'purchase', memo: product.name, reason, productId,
    idempotencyKey: txUuid,
  })
  if (!result.ok) {
    const code = result.error === '잔액이 부족합니다.' ? 'insufficient' : 'fail'
    return NextResponse.json({ error: code, detail: result.error }, { status: 400 })
  }

  // 재고 차감
  await admin.from('products').update({ stock: product.stock - 1, sold: product.sold + 1 }).eq('id', productId)
  await syncCompanyBalance(admin, product.company_id)

  return NextResponse.json({ ok: true, productName: product.name, price: product.price })
}
