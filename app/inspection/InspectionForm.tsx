'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PageShell from '@/components/PageShell'
import { GRANT_AMOUNT } from '@/lib/constants'
import type { Stage } from '@/lib/types'

interface Company { id: string; display_name: string; icon: string; balance: number }

export default function InspectionForm({ stage, companies, reports, alertPct, grant = GRANT_AMOUNT, notOfficer }: {
  stage: Stage; companies: Company[]; reports: { company_id: string | null; progress_status: string | null; created_at: string }[]
  alertPct: number; grant?: number; notOfficer?: boolean
}) {
  const router = useRouter()
  const [target, setTarget] = useState<Company | null>(null)
  const [progress, setProgress] = useState<'good' | 'slow' | 'problem'>('good')
  const [observation, setObservation] = useState('')
  const [alertDelivered, setAlertDelivered] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  if (notOfficer) return (
    <PageShell title="시찰 보고서" emoji="📋">
      <div className="bg-white rounded-3xl p-8 text-center text-gray-500">공무원만 작성할 수 있어요.</div>
    </PageShell>
  )
  if (stage < 2) return <PageShell title="시찰 보고서" emoji="📋" locked={{ opensAt: '생산' }}>{null}</PageShell>

  async function submit() {
    if (!target) return
    setBusy(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: u } = await supabase.from('users').select('class_id').eq('id', user!.id).single()
    const pct = Math.round((target.balance / grant) * 100)
    const triggerType = pct <= alertPct ? 'budget_alert' : 'voluntary'
    await supabase.from('inspection_reports').insert({
      officer_id: user!.id, class_id: u!.class_id, company_id: target.id,
      trigger_type: triggerType, budget_snapshot: target.balance,
      progress_status: progress, observation, alert_delivered: alertDelivered, note_to_mayor: note,
    })
    setBusy(false)
    router.push('/home')
  }

  return (
    <PageShell title="기업 시찰 보고서" emoji="📋">
      {!target ? (
        <>
          <div className="bg-white rounded-3xl p-6 shadow-sm mb-4">
            <div className="font-bold text-gray-800 mb-1">어느 회사를 시찰할까요?</div>
            <p className="text-xs text-gray-400 mb-3">예산이 적은 회사는 🚨 표시가 있어요</p>
            {companies.length === 0 ? (
              <p className="text-gray-400 text-sm">아직 회사가 없어요.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {companies.map(c => {
                  const pct = Math.round((c.balance / grant) * 100)
                  const alert = pct <= alertPct
                  return (
                    <button key={c.id} onClick={() => { setTarget(c); setAlertDelivered(false) }}
                      className={`rounded-2xl p-4 text-left active:scale-95 transition-transform border-2
                        ${alert ? 'bg-amber-50 border-amber-300' : 'bg-gray-50 border-transparent hover:border-blue-300'}`}>
                      <div className="font-bold text-gray-800">{c.icon} {c.display_name}</div>
                      <div className={`text-sm ${alert ? 'text-amber-600 font-medium' : 'text-gray-500'}`}>
                        {alert && '🚨 '}예산 {pct}%
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {reports.length > 0 && (
            <div className="bg-white rounded-3xl p-6 shadow-sm">
              <div className="font-bold text-gray-800 mb-2">내가 쓴 보고서 ({reports.length})</div>
              <p className="text-sm text-gray-400">지금까지 {reports.length}개의 시찰 보고서를 제출했어요. 👍</p>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-3xl p-6 shadow-sm flex flex-col gap-5">
          <button onClick={() => setTarget(null)} className="text-gray-400 text-sm text-left">← 회사 다시 고르기</button>

          <div className="bg-blue-50 rounded-2xl p-4">
            <div className="font-bold text-gray-800">{target.icon} {target.display_name}</div>
            <div className="text-sm text-blue-600 mt-1">
              현재 예산 {target.balance.toLocaleString()}원 ({Math.round((target.balance / grant) * 100)}%)
            </div>
          </div>

          <div>
            <label className="block font-medium text-gray-700 mb-2">🔧 생산은 잘 되고 있나요?</label>
            <div className="grid grid-cols-3 gap-2">
              {([['good', '😀 잘 돼요'], ['slow', '😐 느려요'], ['problem', '😟 문제예요']] as const).map(([v, l]) => (
                <button key={v} onClick={() => setProgress(v)}
                  className={`py-3 rounded-2xl font-medium text-sm transition-all border-2
                    ${progress === v ? 'bg-blue-500 text-white border-blue-500' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-medium text-gray-700 mb-2">👀 내가 본 것</label>
            <textarea value={observation} onChange={e => setObservation(e.target.value)} rows={3} maxLength={200}
              placeholder="회사의 모습, 분위기, 특이한 점을 적어요"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:border-blue-400 outline-none resize-none" />
          </div>

          <label className="flex items-center gap-3 bg-green-50 rounded-2xl p-3 cursor-pointer">
            <input type="checkbox" checked={alertDelivered} onChange={e => setAlertDelivered(e.target.checked)} className="w-5 h-5" />
            <span className="font-medium text-green-700">예산 경보를 전달했어요</span>
          </label>

          <div>
            <label className="block font-medium text-gray-700 mb-2">📢 시장님께 한마디</label>
            <input value={note} onChange={e => setNote(e.target.value)} maxLength={60}
              placeholder="짧게 적어요"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:border-blue-400 outline-none" />
          </div>

          <button onClick={submit} disabled={busy || !observation}
            className="bg-blue-500 text-white rounded-2xl py-4 font-bold text-lg disabled:opacity-40 active:scale-95 transition-transform">
            {busy ? '제출 중...' : '시장님께 보내기 📨'}
          </button>
        </div>
      )}
    </PageShell>
  )
}
