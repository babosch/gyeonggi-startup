'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Report {
  id: string
  itemName: string
  detail: string
  status: string
  mayorNote: string
  createdAt: string
  company: { display_name: string; icon: string } | null
  officer: { number: number; nickname: string | null } | null
}

const STATUS_LABELS: Record<string, string> = {
  pending: '접수됨', reviewed: '확인됨', resolved: '처리됨',
}

export default function TradeReportsAdmin({ reports: initial }: { reports: Report[] }) {
  const router = useRouter()
  const [reports, setReports] = useState(initial)
  const [busy, setBusy] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>(
    Object.fromEntries(initial.map(r => [r.id, r.mayorNote]))
  )

  async function update(reportId: string, status: string) {
    setBusy(reportId)
    const res = await fetch('/api/trade-report', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportId, status, mayorNote: notes[reportId] ?? '' }),
    })
    setBusy(null)
    if (res.ok) {
      setReports(reports.map(r => r.id === reportId ? { ...r, status, mayorNote: notes[reportId] ?? '' } : r))
    }
  }

  const pending = reports.filter(r => r.status === 'pending')
  const done = reports.filter(r => r.status !== 'pending')

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 max-w-2xl mx-auto">
      <button onClick={() => router.push('/admin')} className="text-gray-400 text-sm mb-4">← 관리자 홈</button>
      <h1 className="text-2xl font-bold text-gray-800 mb-5">🚨 이상 거래 보고서</h1>

      {reports.length === 0 && (
        <div className="bg-white rounded-3xl p-10 text-center text-gray-400">
          아직 보고된 이상 거래가 없어요.
        </div>
      )}

      {pending.length > 0 && (
        <div className="mb-6">
          <div className="text-sm font-bold text-red-500 mb-2">미처리 ({pending.length})</div>
          <div className="flex flex-col gap-3">
            {pending.map(r => <ReportCard key={r.id} r={r} busy={busy === r.id}
              note={notes[r.id] ?? ''} onNoteChange={n => setNotes({ ...notes, [r.id]: n })}
              onUpdate={s => update(r.id, s)} />)}
          </div>
        </div>
      )}

      {done.length > 0 && (
        <details>
          <summary className="text-sm font-bold text-gray-400 cursor-pointer mb-2">
            처리된 보고서 ({done.length})
          </summary>
          <div className="flex flex-col gap-3 mt-2">
            {done.map(r => <ReportCard key={r.id} r={r} busy={busy === r.id}
              note={notes[r.id] ?? ''} onNoteChange={n => setNotes({ ...notes, [r.id]: n })}
              onUpdate={s => update(r.id, s)} />)}
          </div>
        </details>
      )}
    </div>
  )
}

function ReportCard({ r, busy, note, onNoteChange, onUpdate }: {
  r: Report; busy: boolean; note: string
  onNoteChange: (n: string) => void; onUpdate: (s: string) => void
}) {
  return (
    <div className={`bg-white rounded-3xl p-5 shadow-sm border-2
      ${r.status === 'pending' ? 'border-red-200' : 'border-gray-100'}`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <span className="text-sm font-bold text-gray-700">
            {r.company ? `${r.company.icon} ${r.company.display_name}` : '회사 미지정'}
          </span>
          <span className="mx-2 text-gray-300">·</span>
          <span className="text-sm text-gray-500">
            {r.officer?.nickname ?? `${r.officer?.number}번`} 공무원
          </span>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium
          ${r.status === 'pending' ? 'bg-red-100 text-red-600'
          : r.status === 'reviewed' ? 'bg-blue-100 text-blue-600'
          : 'bg-green-100 text-green-600'}`}>
          {STATUS_LABELS[r.status] ?? r.status}
        </span>
      </div>

      <p className="text-sm font-medium text-gray-700 mb-1">🏷️ {r.itemName}</p>
      <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3 mb-3">{r.detail}</p>

      <textarea value={note} onChange={e => onNoteChange(e.target.value)} rows={2} maxLength={100}
        placeholder="처리 내용 또는 메모"
        className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:border-blue-400 outline-none resize-none mb-2" />

      <div className="flex gap-2">
        {r.status === 'pending' && (
          <button onClick={() => onUpdate('reviewed')} disabled={busy}
            className="flex-1 py-2 rounded-xl border-2 border-blue-200 text-blue-600 font-medium text-sm disabled:opacity-40">
            {busy ? '...' : '✅ 확인'}
          </button>
        )}
        {r.status !== 'resolved' && (
          <button onClick={() => onUpdate('resolved')} disabled={busy}
            className="flex-1 py-2 rounded-xl bg-green-500 text-white font-medium text-sm disabled:opacity-40">
            {busy ? '...' : '처리 완료'}
          </button>
        )}
        {r.status === 'resolved' && (
          <button onClick={() => onUpdate('pending')} disabled={busy}
            className="flex-1 py-2 rounded-xl border-2 border-gray-200 text-gray-400 text-sm disabled:opacity-40">
            처리 취소
          </button>
        )}
      </div>
    </div>
  )
}
