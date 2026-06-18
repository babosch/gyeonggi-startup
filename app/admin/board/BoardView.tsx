'use client'

import { useRouter } from 'next/navigation'

interface Company { id: string; display_name: string; icon: string; balance: number }
interface Report {
  company_id: string | null; progress_status: string | null; observation: string | null
  note_to_mayor: string | null; alert_delivered: boolean; created_at: string
  users: { number: number; nickname: string | null } | { number: number; nickname: string | null }[]
}
interface Student { id: string; number: number; nickname: string | null; role: string }

const CONCEPT_LABEL: Record<string, string> = {
  formative_research: '특산품', formative_plan: '희소성', formative_requisition: '기회비용',
  formative_work: '생산·소비', formative_exchange: '교류·상호의존', formative_qr: '합리적 소비',
}
const ROLE_LABEL: Record<string, string> = {
  applicant: '지원자', ceo: 'CEO', staff: '직원', officer: '공무원',
}

export default function BoardView({
  cityName, stageLabel, alertPct, grant, companies, reports, conceptStats, students, worklogCount,
}: {
  cityName: string; stageLabel: string; alertPct: number; grant: number
  companies: Company[]; reports: Report[]
  conceptStats: Record<string, { correct: number; total: number }>; students: Student[]; worklogCount: number
}) {
  const router = useRouter()
  const companyName = (id: string | null) => companies.find(c => c.id === id)?.display_name ?? '-'
  const alertCompanies = companies.filter(c => Math.round((c.balance / grant) * 100) <= alertPct)

  function exportCsv() {
    const header = ['번호', '닉네임', '역할']
    const rows = students.map(s => [s.number, s.nickname ?? '', ROLE_LABEL[s.role] ?? s.role])
    const csv = [header, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${cityName}_학생명단.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const roleCounts = students.reduce<Record<string, number>>((acc, s) => {
    acc[s.role] = (acc[s.role] ?? 0) + 1; return acc
  }, {})

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-3xl mx-auto flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <button onClick={() => router.push('/admin')} className="text-gray-400 text-sm">← 관리자 홈</button>
          <button onClick={exportCsv} className="text-sm bg-white border-2 border-gray-200 rounded-xl px-4 py-2 font-medium text-gray-700">
            📥 CSV 내보내기
          </button>
        </div>
        <h1 className="text-2xl font-bold text-gray-800">📊 {cityName} 현황 보드</h1>

        {/* 지표 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="현재 단계" value={stageLabel.replace(/[⓪①②③④]/g, '').trim()} />
          <Stat label="기업 수" value={`${companies.length}`} />
          <Stat label="업무일지" value={`${worklogCount}`} />
          <Stat label="예산 경보" value={`${alertCompanies.length}`} warn={alertCompanies.length > 0} />
        </div>

        {/* 회사별 잔액 */}
        <Section title="기업 예산">
          {companies.length === 0 ? <Empty text="아직 회사가 없어요." /> : (
            <div className="flex flex-col gap-2">
              {companies.map(c => {
                const pct = Math.round((c.balance / grant) * 100)
                const alert = pct <= alertPct
                return (
                  <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <span className="font-medium text-gray-700">{c.icon} {c.display_name}</span>
                    <span className={`font-medium ${alert ? 'text-amber-600' : 'text-gray-600'}`}>
                      {alert && '🚨 '}{c.balance.toLocaleString()}원 ({pct}%)
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </Section>

        {/* 역할 분포 */}
        <Section title="역할 현황">
          <div className="flex flex-wrap gap-2">
            {Object.entries(roleCounts).map(([role, n]) => (
              <span key={role} className="bg-gray-100 text-gray-600 rounded-full px-3 py-1.5 text-sm font-medium">
                {ROLE_LABEL[role] ?? role} {n}명
              </span>
            ))}
          </div>
        </Section>

        {/* 개념 이해도 */}
        <Section title="개념 이해도">
          {Object.keys(conceptStats).length === 0 ? <Empty text="아직 응답이 없어요." /> : (
            <div className="flex flex-col gap-2">
              {Object.entries(conceptStats).map(([kind, s]) => {
                const pct = s.total ? Math.round((s.correct / s.total) * 100) : 0
                return (
                  <div key={kind} className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 w-28">{CONCEPT_LABEL[kind] ?? kind}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                      <div className="bg-green-400 h-full rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-sm text-gray-500 w-20 text-right">{s.correct}/{s.total} ({pct}%)</span>
                  </div>
                )
              })}
            </div>
          )}
        </Section>

        {/* 공무원 시찰 보고서 */}
        <Section title="공무원 시찰 보고서">
          {reports.length === 0 ? <Empty text="아직 보고서가 없어요." /> : (
            <div className="flex flex-col gap-3">
              {reports.map((r, i) => {
                const u = Array.isArray(r.users) ? r.users[0] : r.users
                const status = r.progress_status === 'good' ? '😀 잘됨' : r.progress_status === 'slow' ? '😐 느림' : '😟 문제'
                return (
                  <div key={i} className="bg-gray-50 rounded-2xl p-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium text-gray-700">{companyName(r.company_id)} · {status}</span>
                      <span className="text-xs text-gray-400">{u?.nickname ?? `${u?.number}번`} {r.alert_delivered && '· 🚨전달'}</span>
                    </div>
                    {r.observation && <p className="text-sm text-gray-600">👀 {r.observation}</p>}
                    {r.note_to_mayor && <p className="text-sm text-blue-600 mt-0.5">📢 {r.note_to_mayor}</p>}
                  </div>
                )
              })}
            </div>
          )}
        </Section>
      </div>
    </div>
  )
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 ${warn ? 'bg-amber-50' : 'bg-white'} shadow-sm`}>
      <div className={`text-xs ${warn ? 'text-amber-600' : 'text-gray-400'}`}>{label}</div>
      <div className={`text-xl font-bold ${warn ? 'text-amber-700' : 'text-gray-800'}`}>{value}</div>
    </div>
  )
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm">
      <div className="font-bold text-gray-800 mb-3">{title}</div>
      {children}
    </div>
  )
}
function Empty({ text }: { text: string }) {
  return <p className="text-gray-400 text-sm">{text}</p>
}
