import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { transfer, syncCompanyBalance } from '@/lib/ledger'

// 교사가 품의서를 승인/반려한다. 승인 시 회사 계좌에서 멱등 차감.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: mayor } = await supabase.from('users').select('role, class_id').eq('id', user.id).single()
  if (mayor?.role !== 'mayor') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { reqId, action } = await req.json() // 'approve' | 'reject'
  const admin = createAdminClient()

  const { data: r } = await admin.from('requisitions')
    .select('id, company_id, total, status, companies(class_id)').eq('id', reqId).single()
  if (!r) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  const comp = (Array.isArray(r.companies) ? r.companies[0] : r.companies) as { class_id: string }
  if (comp.class_id !== mayor.class_id) return NextResponse.json({ error: 'wrong_class' }, { status: 403 })
  if (r.status !== 'submitted') return NextResponse.json({ ok: true }) // 멱등

  if (action === 'approve') {
    const result = await transfer({
      admin, fromType: 'company', fromId: r.company_id, toType: 'gov', toId: null,
      amount: r.total, type: 'purchase', memo: '품의서 승인',
      idempotencyKey: `req-${r.id}`,
    })
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
    await syncCompanyBalance(admin, r.company_id)
    await admin.from('requisitions').update({ status: 'approved' }).eq('id', reqId)
  } else {
    await admin.from('requisitions').update({ status: 'rejected' }).eq('id', reqId)
  }
  return NextResponse.json({ ok: true })
}
