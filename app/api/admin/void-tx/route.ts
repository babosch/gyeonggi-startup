import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { syncCompanyBalance } from '@/lib/ledger'

// 교사가 특정 거래를 취소(void)한다 — 잔액을 원상복구
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: mayor } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (mayor?.role !== 'mayor') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { txId } = await req.json()
  const admin = createAdminClient()

  const { data: tx } = await admin
    .from('transactions')
    .select('id, from_account_id, to_account_id, amount, type, voided')
    .eq('id', txId).single()

  if (!tx) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (tx.voided) return NextResponse.json({ error: 'already_voided' }, { status: 400 })

  // void 표시
  await admin.from('transactions').update({ voided: true }).eq('id', txId)

  // 잔액 역전: from_account에 환불, to_account에서 차감
  if (tx.from_account_id) {
    const { data: fa } = await admin.from('accounts').select('balance').eq('id', tx.from_account_id).single()
    if (fa) {
      await admin.from('accounts').update({ balance: fa.balance + tx.amount }).eq('id', tx.from_account_id)
    }
  }
  if (tx.to_account_id) {
    const { data: ta } = await admin.from('accounts').select('balance').eq('id', tx.to_account_id).single()
    if (ta) {
      await admin.from('accounts').update({ balance: Math.max(0, ta.balance - tx.amount) }).eq('id', tx.to_account_id)
    }
  }

  // 회사 잔액 캐시 동기화
  const fromA = await admin.from('accounts').select('owner_type, owner_id').eq('id', tx.from_account_id ?? '').maybeSingle()
  const toA = await admin.from('accounts').select('owner_type, owner_id').eq('id', tx.to_account_id ?? '').maybeSingle()
  if (fromA.data?.owner_type === 'company') await syncCompanyBalance(admin, fromA.data.owner_id)
  if (toA.data?.owner_type === 'company') await syncCompanyBalance(admin, toA.data.owner_id)

  return NextResponse.json({ ok: true })
}
