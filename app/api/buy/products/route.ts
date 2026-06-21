import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// 구매자가 회사 QR 스캔 후 상품 목록 조회
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: me } = await supabase
    .from('users').select('class_id, company_id').eq('id', user.id).single()
  if (!me) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const companyId = req.nextUrl.searchParams.get('companyId')
  if (!companyId) return NextResponse.json({ error: 'missing_company' }, { status: 400 })

  const admin = createAdminClient()

  const { data: company } = await admin
    .from('companies').select('id, display_name, class_id').eq('id', companyId).single()
  if (!company) return NextResponse.json({ error: 'company_not_found' }, { status: 404 })
  if (company.class_id !== me.class_id) {
    return NextResponse.json({ error: 'wrong_class' }, { status: 403 })
  }
  if (company.id === me.company_id) {
    return NextResponse.json({ error: 'self_purchase' }, { status: 400 })
  }

  const { data: products } = await admin
    .from('products').select('id, name, price, stock')
    .eq('company_id', companyId).order('created_at')

  return NextResponse.json({ companyName: company.display_name, products: products ?? [] })
}
