import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSb } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { transfer, syncCompanyBalance } from '@/lib/ledger'
import { pinToPassword } from '@/lib/auth'

// 구매자(buyer) 주도 결제 — 판매대 QR 스캔 후 상품 선택 → 자신의 PIN 입력
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user: buyer } } = await supabase.auth.getUser()
  if (!buyer) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { companyId, cart, pin, txUuid } = await req.json()
  // cart = [{ productId: string, qty: number }]
  if (!companyId || !cart?.length || !pin || !txUuid) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 })
  }

  const admin = createAdminClient()

  // 구매자 정보
  const { data: buyerRow } = await admin
    .from('users').select('id, number, company_id, class_id, classes(code)').eq('id', buyer.id).single()
  if (!buyerRow) return NextResponse.json({ error: 'buyer_not_found' }, { status: 404 })

  // 자가구매 방지
  if (buyerRow.company_id === companyId) {
    return NextResponse.json({ error: 'self_purchase' }, { status: 400 })
  }

  // 회사 같은 반 확인
  const { data: company } = await admin
    .from('companies').select('id, class_id').eq('id', companyId).single()
  if (!company || company.class_id !== buyerRow.class_id) {
    return NextResponse.json({ error: 'wrong_class' }, { status: 403 })
  }

  // PIN 검증 (구매자 본인 PIN)
  const cls = (Array.isArray(buyerRow.classes) ? buyerRow.classes[0] : buyerRow.classes) as { code: string }
  const email = `${cls.code.toLowerCase()}-${buyerRow.number}@classroom.local`
  const verifier = createSb(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )
  const { error: pinErr } = await verifier.auth.signInWithPassword({ email, password: pinToPassword(pin) })
  if (pinErr) return NextResponse.json({ error: 'wrong_pin' }, { status: 401 })

  // 상품 조회 및 재고 확인
  const productIds = cart.map((c: { productId: string }) => c.productId)
  const { data: products } = await admin
    .from('products').select('id, name, price, stock, sold, company_id')
    .in('id', productIds)

  for (const item of cart as { productId: string; qty: number }[]) {
    const p = products?.find(x => x.id === item.productId)
    if (!p || p.company_id !== companyId) {
      return NextResponse.json({ error: 'invalid_product' }, { status: 400 })
    }
    if (p.stock < item.qty) {
      return NextResponse.json({ error: 'sold_out', product: p.name }, { status: 400 })
    }
  }

  // 총액 계산
  const total = (cart as { productId: string; qty: number }[]).reduce((s, item) => {
    const p = products!.find(x => x.id === item.productId)!
    return s + p.price * item.qty
  }, 0)

  // 잔액 확인
  const { data: buyerAcct } = await admin
    .from('accounts').select('balance')
    .eq('owner_type', 'user').eq('owner_id', buyer.id).single()
  if ((buyerAcct?.balance ?? 0) < total) {
    return NextResponse.json({ error: 'insufficient' }, { status: 400 })
  }

  // 결제 처리 (카트 전체를 하나의 거래로)
  const result = await transfer({
    admin,
    fromType: 'user', fromId: buyer.id,
    toType: 'company', toId: companyId,
    amount: total,
    type: 'purchase',
    memo: cart.length === 1
      ? products!.find(p => p.id === cart[0].productId)?.name ?? '구매'
      : `${cart.length}개 상품 구매`,
    idempotencyKey: txUuid,
  })
  if (!result.ok) {
    const code = result.error === '잔액이 부족합니다.' ? 'insufficient' : 'fail'
    return NextResponse.json({ error: code, detail: result.error }, { status: 400 })
  }

  // 재고 차감
  for (const item of cart as { productId: string; qty: number }[]) {
    const p = products!.find(x => x.id === item.productId)!
    await admin.from('products').update({
      stock: p.stock - item.qty,
      sold: p.sold + item.qty,
    }).eq('id', item.productId)
  }
  await syncCompanyBalance(admin, companyId)

  return NextResponse.json({ ok: true, total })
}
