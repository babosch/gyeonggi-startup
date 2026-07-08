import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { transfer, syncCompanyBalance } from '@/lib/ledger'

// CEO가 자기 회사의 판매(구매 거래)를 취소·환불한다. 회사 → 손님으로 금액 되돌림.
// (재고는 자동 복구하지 않음 — 회사 관리에서 조정)
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: ceo } = await supabase.from('users').select('role, company_id').eq('id', user.id).single()
  if (ceo?.role !== 'ceo' || !ceo.company_id) return NextResponse.json({ error: 'not_ceo' }, { status: 403 })

  const { txId } = await req.json()
  if (!txId) return NextResponse.json({ error: 'missing' }, { status: 400 })

  const admin = createAdminClient()

  // 우리 회사 계좌
  const { data: companyAcct } = await admin.from('accounts')
    .select('id').eq('owner_type', 'company').eq('owner_id', ceo.company_id).maybeSingle()
  if (!companyAcct) return NextResponse.json({ error: 'no_account' }, { status: 400 })

  // 대상 판매 거래
  const { data: tx } = await admin.from('transactions')
    .select('id, amount, type, from_account_id, to_account_id').eq('id', txId).single()
  if (!tx || tx.type !== 'purchase') return NextResponse.json({ error: 'invalid_tx' }, { status: 400 })
  if (tx.to_account_id !== companyAcct.id) return NextResponse.json({ error: 'not_your_sale' }, { status: 403 })
  if (!tx.from_account_id) return NextResponse.json({ error: 'invalid_tx' }, { status: 400 })

  // 손님(구매자) 계정
  const { data: buyerAcct } = await admin.from('accounts')
    .select('owner_type, owner_id').eq('id', tx.from_account_id).single()
  if (!buyerAcct || buyerAcct.owner_type !== 'user') return NextResponse.json({ error: 'invalid_buyer' }, { status: 400 })

  // 환불: 회사 → 손님 (멱등키로 이중 환불 방지)
  const result = await transfer({
    admin, fromType: 'company', fromId: ceo.company_id, toType: 'user', toId: buyerAcct.owner_id,
    amount: tx.amount, type: 'refund', memo: '판매 취소 환불', idempotencyKey: `refund:${txId}`,
  })
  if (!result.ok) {
    const code = result.error === '잔액이 부족합니다.' ? 'insufficient' : 'fail'
    return NextResponse.json({ error: code }, { status: 400 })
  }

  await syncCompanyBalance(admin, ceo.company_id)
  return NextResponse.json({ ok: true })
}
