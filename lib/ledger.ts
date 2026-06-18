import { SupabaseClient } from '@supabase/supabase-js'

type TxType = 'grant' | 'purchase' | 'payroll' | 'facility' | 'exchange' | 'refund' | 'adjust'

interface TransferArgs {
  admin: SupabaseClient
  fromType: 'company' | 'city' | 'user' | 'gov'
  fromId: string | null   // gov(정부)면 null
  toType: 'company' | 'city' | 'user' | 'gov'
  toId: string | null
  amount: number
  type: TxType
  memo?: string
  reason?: string
  productId?: string
  facilityId?: string
  idempotencyKey?: string  // 중복 방지 키
}

// 멱등 이체: 양의 정수 검증 + 잔액 확인 + 양 계좌 갱신 + 거래 기록.
// gov(정부)는 무한 발행 가능(잔액 미차감). 그 외 출금 계좌는 잔액 부족 시 거부.
export async function transfer(args: TransferArgs): Promise<{ ok: boolean; error?: string }> {
  const { admin, amount, idempotencyKey } = args

  if (!Number.isInteger(amount) || amount <= 0) {
    return { ok: false, error: '금액은 양의 정수여야 합니다.' }
  }

  // 멱등 키 중복 확인
  if (idempotencyKey) {
    const { data: existing } = await admin
      .from('transactions').select('id').eq('idempotency_key', idempotencyKey).maybeSingle()
    if (existing) return { ok: true } // 이미 처리됨
  }

  // 계좌 조회 헬퍼
  async function getAccount(type: string, id: string | null) {
    if (type === 'gov' || id === null) return null
    const { data } = await admin
      .from('accounts').select('id, balance').eq('owner_type', type).eq('owner_id', id).maybeSingle()
    return data
  }

  const fromAcct = await getAccount(args.fromType, args.fromId)
  const toAcct = await getAccount(args.toType, args.toId)

  // 출금 계좌 잔액 확인 (gov 제외)
  if (args.fromType !== 'gov') {
    if (!fromAcct) return { ok: false, error: '출금 계좌를 찾을 수 없습니다.' }
    if (fromAcct.balance < amount) return { ok: false, error: '잔액이 부족합니다.' }
  }
  if (args.toType !== 'gov' && !toAcct) {
    return { ok: false, error: '입금 계좌를 찾을 수 없습니다.' }
  }

  // 잔액 갱신
  if (fromAcct) {
    await admin.from('accounts').update({ balance: fromAcct.balance - amount }).eq('id', fromAcct.id)
  }
  if (toAcct) {
    await admin.from('accounts').update({ balance: toAcct.balance + amount }).eq('id', toAcct.id)
  }

  // 거래 기록
  const { error: txErr } = await admin.from('transactions').insert({
    idempotency_key: idempotencyKey ?? null,
    from_account_id: fromAcct?.id ?? null,
    to_account_id: toAcct?.id ?? null,
    amount,
    type: args.type,
    memo: args.memo ?? null,
    reason: args.reason ?? null,
    product_id: args.productId ?? null,
    facility_id: args.facilityId ?? null,
  })
  if (txErr) {
    // 멱등 키 경합으로 인한 중복이면 성공 처리
    if (txErr.message.includes('idempotency')) return { ok: true }
    return { ok: false, error: txErr.message }
  }

  return { ok: true }
}

// 회사/시청/유저 잔액 동기화 헬퍼 (companies.balance 미러)
export async function syncCompanyBalance(admin: SupabaseClient, companyId: string) {
  const { data: acct } = await admin
    .from('accounts').select('balance').eq('owner_type', 'company').eq('owner_id', companyId).maybeSingle()
  if (acct) await admin.from('companies').update({ balance: acct.balance }).eq('id', companyId)
}
