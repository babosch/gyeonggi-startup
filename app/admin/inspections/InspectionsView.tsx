'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Report {
  id: string
  companyName: string
  officerName: string
  progressStatus: string | null
  observation: string | null
  noteToMayor: string | null
  alertDelivered: boolean
  createdAt: string
}

function minsAgo(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
}

const STATUS_LABEL: Record<string, string> = { good: '😀 잘됨', slow: '😐 느림', bad: '😟 문제' }

export default function InspectionsView({ reports }: { reports: Report[] }) {
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set())
  const toggle = (id: string) => setReviewedIds(prev => {
    const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s
  })

  const newReports = reports.filter(r => !reviewedIds.has(r.id))
  const doneReports = reports.filter(r => reviewedIds.has(r.id))

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">
        <Link href="/home" className="text-gray-400 text-sm mb-4 inline-block">← 교사 홈</Link>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-bold text-gray-800">📝 공무원 시찰 보고서</h1>
          {newReports.length > 0 && (
            <span className="bg-rose-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">NEW {newReports.length}</span>
          )}
        </div>
        <p className="text-sm text-gray-400 mb-5">공무원이 기업을 시찰하고 올린 보고서예요. 확인하면 아래로 정리돼요.</p>

        {reports.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center text-gray-400">
            <div className="text-4xl mb-3">📭</div>
            아직 올라온 시찰 보고서가 없어요.
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              {newReports.map(r => <ReportCard key={r.id} r={r} reviewed={false} onToggle={() => toggle(r.id)} />)}
            </div>

            {doneReports.length > 0 && (
              <details className="mt-5">
                <summary className="text-sm font-bold text-gray-400 cursor-pointer select-none mb-2">
                  확인 완료 {doneReports.length}건 ▾
                </summary>
                <div className="flex flex-col gap-3">
                  {doneReports.map(r => <ReportCard key={r.id} r={r} reviewed onToggle={() => toggle(r.id)} />)}
                </div>
              </details>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function ReportCard({ r, reviewed, onToggle }: { r: Report; reviewed: boolean; onToggle: () => void }) {
  const min = minsAgo(r.createdAt)
  const timeStr = min < 1 ? '방금 전' : min < 60 ? `${min}분 전` : `${Math.floor(min / 60)}시간 전`

  return (
    <div className={`border rounded-2xl p-4 transition-all shadow-sm ${
      reviewed ? 'bg-gray-50 border-gray-200 opacity-60'
      : r.alertDelivered ? 'bg-amber-50 border-amber-300'
      : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            {!reviewed && <span className="bg-rose-500 text-white text-xs px-1.5 py-0.5 rounded font-bold">NEW</span>}
            {r.alertDelivered && <span className="bg-amber-400 text-amber-900 text-xs px-1.5 py-0.5 rounded font-medium">⚠ 경보</span>}
            <span className="font-bold text-gray-800 text-sm">{r.companyName}</span>
            <span className="text-gray-300 text-xs">|</span>
            <span className="text-gray-500 text-xs">공무원 {r.officerName}</span>
            <span className="text-gray-400 text-xs">{timeStr}</span>
          </div>
          {r.progressStatus && (
            <p className="text-xs text-gray-600">
              <span className="text-gray-400">진행 상태 </span>{STATUS_LABEL[r.progressStatus] ?? r.progressStatus}
            </p>
          )}
          {r.observation && (
            <p className="text-sm text-gray-700 mt-0.5"><span className="text-gray-400 text-xs">시찰 내용 </span>{r.observation}</p>
          )}
          {r.noteToMayor && (
            <p className="text-sm text-blue-700 mt-1 bg-blue-50 rounded-lg px-2.5 py-1.5">
              <span className="font-medium text-xs">시장에게 한마디 </span>{r.noteToMayor}
            </p>
          )}
        </div>
        <button onClick={onToggle}
          className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-xl border font-medium transition ${
            reviewed ? 'border-gray-300 text-gray-400 hover:bg-gray-100'
            : 'border-emerald-500 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
          }`}>
          {reviewed ? '↩ 되돌리기' : '✓ 확인'}
        </button>
      </div>
    </div>
  )
}
