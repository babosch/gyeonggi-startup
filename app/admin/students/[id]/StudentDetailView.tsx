'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const ROLE_LABEL: Record<string, string> = {
  applicant: '지원자', ceo: 'CEO', staff: '직원', officer: '공무원',
}
const STATUS_LABEL: Record<string, string> = {
  pending: '대기', hired: '채용됨', rejected: '거절됨',
  draft: '초안', submitted: '제출됨', selected: '선정됨',
}
const TX_TYPE_LABEL: Record<string, string> = {
  grant: '지원금', purchase: '구매', payroll: '급여',
  facility: '시설', exchange: '교류', refund: '환불', adjust: '조정',
}

interface Student { id: string; number: number; nickname: string | null; role: string; balance: number; companyName: string | null }
interface Transaction { id: string; amount: number; type: string; memo: string; direction: 'in' | 'out'; voided: boolean; createdAt: string }
interface Plan { id: string; companyName: string; status: string; createdAt: string }
interface Application { id: string; companyName: string; motivation: string; status: string; createdAt: string }
interface Worklog { id: string; content: string; createdAt: string }
interface Reflection { id: string; content: string; stage: number; createdAt: string }
interface Quiz { id: string; kind: string; correct: boolean; createdAt: string }

export default function StudentDetailView({ student, transactions, plans, applications, worklogs, reflections, quizzes }: {
  student: Student
  transactions: Transaction[]
  plans: Plan[]
  applications: Application[]
  worklogs: Worklog[]
  reflections: Reflection[]
  quizzes: Quiz[]
}) {
  const router = useRouter()
  const [tab, setTab] = useState<'overview' | 'txs' | 'activity'>('overview')

  const quizCorrect = quizzes.filter(q => q.correct).length

  function fmt(dt: string) {
    return new Date(dt).toLocaleString('ko-KR', {
      month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.push('/admin/monitor')} className="text-gray-400 text-sm">← 모니터</button>
          <div className="flex-1">
            <div className="font-bold text-gray-800">{student.nickname ?? `${student.number}번`} 상세</div>
            <div className="text-xs text-gray-400">{ROLE_LABEL[student.role] ?? student.role}</div>
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-4 flex gap-1 pb-0">
          {[
            { key: 'overview', label: '개요' },
            { key: 'txs', label: `거래(${transactions.length})` },
            { key: 'activity', label: '활동 기록' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors
                ${tab === t.key ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 flex flex-col gap-3">

        {/* 개요 탭 */}
        {tab === 'overview' && (
          <>
            {/* 기본 정보 카드 */}
            <div className="bg-white rounded-3xl p-6 shadow-sm">
              <div className="grid grid-cols-2 gap-4">
                <InfoBox label="번호" value={`${student.number}번`} />
                <InfoBox label="역할" value={ROLE_LABEL[student.role] ?? student.role} />
                <InfoBox label="잔액" value={`${student.balance.toLocaleString()}원`} highlight />
                <InfoBox label="소속 회사" value={student.companyName ?? '없음'} />
              </div>
            </div>

            {/* 학습 현황 */}
            <div className="bg-white rounded-3xl p-6 shadow-sm">
              <div className="font-bold text-gray-800 mb-3">📚 학습 현황</div>
              <div className="grid grid-cols-3 gap-3">
                <InfoBox label="퀴즈" value={`${quizCorrect}/${quizzes.length} 정답`} />
                <InfoBox label="성찰" value={`${reflections.length}개`} />
                <InfoBox label="업무일지" value={`${worklogs.length}개`} />
              </div>
            </div>

            {/* 사업계획서 */}
            {plans.length > 0 && (
              <div className="bg-white rounded-3xl p-5 shadow-sm">
                <div className="font-bold text-gray-800 mb-2">📝 사업계획서</div>
                {plans.map(p => (
                  <div key={p.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0 text-sm">
                    <span className="text-gray-700">{p.companyName}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full
                        ${p.status === 'selected' ? 'bg-green-100 text-green-700'
                        : p.status === 'submitted' ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-500'}`}>
                        {STATUS_LABEL[p.status] ?? p.status}
                      </span>
                      <span className="text-xs text-gray-400">{fmt(p.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 채용 지원서 */}
            {applications.length > 0 && (
              <div className="bg-white rounded-3xl p-5 shadow-sm">
                <div className="font-bold text-gray-800 mb-2">💼 취업 지원서</div>
                {applications.map(a => (
                  <div key={a.id} className="py-2 border-b border-gray-100 last:border-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-700">{a.companyName}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full
                        ${a.status === 'hired' ? 'bg-green-100 text-green-700'
                        : a.status === 'rejected' ? 'bg-red-100 text-red-500'
                        : 'bg-amber-100 text-amber-700'}`}>
                        {STATUS_LABEL[a.status] ?? a.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">"{a.motivation}"</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* 거래 탭 */}
        {tab === 'txs' && (
          <div className="flex flex-col gap-2">
            {transactions.length === 0 && (
              <div className="bg-white rounded-3xl p-10 text-center text-gray-400">거래 내역이 없어요</div>
            )}
            {transactions.map(t => (
              <div key={t.id} className={`bg-white rounded-2xl p-4 shadow-sm ${t.voided ? 'opacity-40' : ''}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                        {TX_TYPE_LABEL[t.type] ?? t.type}
                      </span>
                      {t.voided && <span className="text-xs text-red-400">취소됨</span>}
                    </div>
                    <div className="text-sm text-gray-600 mt-0.5">{t.memo || '-'}</div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold ${t.direction === 'in' ? 'text-green-600' : 'text-red-500'}`}>
                      {t.direction === 'in' ? '+' : '-'}{t.amount.toLocaleString()}원
                    </div>
                    <div className="text-xs text-gray-400">{fmt(t.createdAt)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 활동 기록 탭 */}
        {tab === 'activity' && (
          <div className="flex flex-col gap-3">
            {/* 업무일지 */}
            {worklogs.length > 0 && (
              <div className="bg-white rounded-3xl p-5 shadow-sm">
                <div className="font-bold text-gray-800 mb-2">📒 업무일지</div>
                {worklogs.map(w => (
                  <div key={w.id} className="py-2 border-b border-gray-100 last:border-0 text-sm">
                    <p className="text-gray-700">{w.content}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{fmt(w.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}

            {/* 성찰 */}
            {reflections.length > 0 && (
              <div className="bg-white rounded-3xl p-5 shadow-sm">
                <div className="font-bold text-gray-800 mb-2">💭 성찰</div>
                {reflections.map(r => (
                  <div key={r.id} className="py-2 border-b border-gray-100 last:border-0 text-sm">
                    <p className="text-gray-700">{r.content}</p>
                    <p className="text-xs text-gray-400 mt-0.5">단계 {r.stage} · {fmt(r.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}

            {/* 퀴즈 */}
            {quizzes.length > 0 && (
              <div className="bg-white rounded-3xl p-5 shadow-sm">
                <div className="font-bold text-gray-800 mb-2">🎯 쪽지시험</div>
                {quizzes.map(q => (
                  <div key={q.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0 text-sm">
                    <span className="text-gray-600">{q.kind}</span>
                    <div className="flex items-center gap-2">
                      <span className={q.correct ? 'text-green-600' : 'text-red-500'}>
                        {q.correct ? '✅ 정답' : '❌ 오답'}
                      </span>
                      <span className="text-xs text-gray-400">{fmt(q.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {worklogs.length === 0 && reflections.length === 0 && quizzes.length === 0 && (
              <div className="bg-white rounded-3xl p-10 text-center text-gray-400">아직 활동 기록이 없어요</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function InfoBox({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl p-3 text-center ${highlight ? 'bg-blue-50' : 'bg-gray-50'}`}>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-base font-bold ${highlight ? 'text-blue-600' : 'text-gray-800'}`}>{value}</div>
    </div>
  )
}
