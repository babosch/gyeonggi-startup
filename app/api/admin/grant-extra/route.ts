import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { transfer, syncCompanyBalance } from '@/lib/ledger'

const MAX_EXTRA_GRANT = 1_000_000 // 1회 지급 상한(오입력 방지)

// 시장이 회사에 지원금을 추가 지급한다 (정부 → 회사 계좌).
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: me } = await supabase.from('users').select('role, class_id').eq('id', user.id).single()
  if (me?.role !== 'mayor') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { companyId, amount, nonce } = await req.json()
  if (!Number.isInteger(amount) || amount <= 0 || amount > MAX_EXTRA_GRANT) {
    return NextResponse.json({ error: 'invalid_amount' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: company } = await admin.from('companies').select('id, class_id, display_name').eq('id', companyId).single()
  if (!company || company.class_id !== me.class_id) {
    return NextResponse.json({ error: 'wrong_class' }, { status: 403 })
  }

  // 멱등키: 같은 클릭(nonce)의 재시도는 1회만 처리, 새 클릭은 새 지급
  const key = `grant-extra:${companyId}:${nonce ?? 'x'}`
  const result = await transfer({
    admin, fromType: 'gov', fromId: null, toType: 'company', toId: companyId,
    amount, type: 'grant', memo: '시장 추가 지원금', idempotencyKey: key,
  })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })

  await syncCompanyBalance(admin, companyId)
  const { data: updated } = await admin.from('companies').select('balance').eq('id', companyId).single()
  return NextResponse.json({ ok: true, balance: updated?.balance ?? null })
}
