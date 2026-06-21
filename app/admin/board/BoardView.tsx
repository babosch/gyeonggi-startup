'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Stage } from '@/lib/types'

// ── 타입 ─────────────────────────────────────────────────────────
type StudentActivity = {
  id: string; number: number; nickname: string | null; role: string
  companyId: string | null; companyName: string | null
  lastActivityAt: string | null
  worklogCount: number; quizCount: number
  hasBusinessPlan: boolean; hasApplied: boolean; hasExchangeCard: boolean
}
type CompanyInfo = {
  id: string; name: string; icon: string; balance: number
  ceoName: string | null; ceoId: string | null; staffNames: string[]
}
type ReportInfo = {
  id: string; companyId: string | null; companyName: string
  officerName: string; progressStatus: string | null; observation: string | null
  noteToMayor: string | null; alertDelivered: boolean; createdAt: string
}

interface Props {
  cityName: string; stage: Stage; stageLabel: string
  alertPct: number; grant: number; classId: string
  companies: CompanyInfo[]; reports: ReportInfo[]
  students: StudentActivity[]
  conceptMatrix: Record<string, Record<string, 'correct' | 'wrong'>>
  allConceptKinds: string[]
}

// ── 상수 ─────────────────────────────────────────────────────────
const CONCEPT_LABELS: Record<string, string> = {
  formative_research: '특산품', formative_plan: '희소성',
  formative_requisition: '기회비용', formative_work: '생산·소비',
  formative_exchange: '교류', formative_qr: '합리적 소비',
  formative_sales: '판매전략',
  quiz_1: '1차 시험', quiz_2: '2차 시험', quiz_final: '최종 시험',
}
const ROLE_EMOJI: Record<string, string> = {
  ceo: '👔', staff: '👷', officer: '🏛️', applicant: '🙋',
}
const ROLE_KO: Record<string, string> = {
  ceo: '대표', staff: '직원', officer: '공무원', applicant: '구직자',
}

// ── 헬퍼 ─────────────────────────────────────────────────────────
function minsAgo(iso: string | null): number | null {
  if (!iso) return null
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
}

function timeAgoText(iso: string | null): string {
  const min = minsAgo(iso)
  if (min === null) return '활동 없음'
  if (min < 1) return '방금 전'
  if (min < 60) return `${min}분 전`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}시간 전`
  return `${Math.floor(hr / 24)}일 전`
}

function getStatus(s: StudentActivity, stage: Stage): 'green' | 'orange' | 'red' {
  let isComplete = false
  switch (stage) {
    case 0: isComplete = s.quizCount > 0; break
    case 1:
      if (s.role === 'officer') isComplete = true
      else if (s.role === 'ceo' || s.role === 'staff') isComplete = !!s.companyId
      else isComplete = s.hasApplied
      break
    case 2: isComplete = s.worklogCount > 0; break
    case 3:
      isComplete = s.role === 'ceo' ? s.hasExchangeCard : s.worklogCount > 0
      break
    case 4: isComplete = s.worklogCount > 0; break
  }
  if (isComplete) return 'green'
  const min = minsAgo(s.lastActivityAt)
  if (min !== null && min < 10) return 'orange'
  return 'red'
}

function getStageActivity(s: StudentActivity, stage: Stage): string {
  switch (stage) {
    case 0: return s.quizCount > 0 ? `퀴즈 ${s.quizCount}회 응답` : '미응답'
    case 1:
      if (s.role === 'officer') return '공무원 임명됨'
      if (s.role === 'ceo' || s.role === 'staff') return s.companyId ? '회사 배정됨' : '미배정'
      return s.hasApplied ? '지원 완료' : '미지원'
    case 2: return s.worklogCount > 0 ? `업무일지 ${s.worklogCount}건` : '미작성'
    case 3:
      if (s.role === 'ceo') return s.hasExchangeCard ? '교류카드 등록' : '카드 미등록'
      return s.worklogCount > 0 ? `업무일지 ${s.worklogCount}건` : '미작성'
    case 4: return s.worklogCount > 0 ? `업무일지 ${s.worklogCount}건` : '미작성'
    default: return '-'
  }
}

function fmtMoney(n: number): string {
  return `${n.toLocaleString('ko-KR')}원`
}

// ── 서브 컴포넌트 ─────────────────────────────────────────────────

function Dot({ status }: { status: 'green' | 'orange' | 'red' | 'gray' }) {
  const c = status === 'green' ? 'bg-emerald-400'
    : status === 'orange' ? 'bg-amber-400'
    : status === 'red' ? 'bg-rose-500'
    : 'bg-gray-300'
  return <span className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${c}`} />
}

function StudentCard({ s, stage }: { s: StudentActivity; stage: Stage }) {
  const status = getStatus(s, stage)
  const act = getStageActivity(s, stage)
  const min = minsAgo(s.lastActivityAt)

  const frame = status === 'green'
    ? 'border-emerald-400 bg-emerald-50'
    : status === 'orange'
    ? 'border-amber-400 bg-amber-50'
    : 'border-rose-400 bg-rose-50'
  const actColor = status === 'green' ? 'text-emerald-700'
    : status === 'orange' ? 'text-amber-700'
    : 'text-rose-700'

  return (
    <div className={`border-2 rounded-xl p-3 flex flex-col gap-1 ${frame}`}>
      <div className="flex items-center gap-1.5">
        <Dot status={status} />
        <span className="font-bold text-sm text-gray-800 truncate">{s.number}번 {s.nickname ?? '-'}</span>
      </div>
      <div className="text-xs text-gray-500">
        {ROLE_EMOJI[s.role]} {ROLE_KO[s.role] ?? s.role}
        {s.companyName && (
          <span className="ml-1">{s.companyName}</span>
        )}
      </div>
      <div className={`text-xs font-semibold ${actColor} mt-0.5`}>{act}</div>
      <div className="text-xs text-gray-400 mt-auto">
        {min === null ? '활동 없음' : min < 1 ? '방금 전' : `${min}분 전`}
      </div>
    </div>
  )
}

function ConceptCell({ v }: { v: 'correct' | 'wrong' | undefined }) {
  if (v === 'correct') return <td className="text-center px-2 py-1.5 text-emerald-600 font-bold">●</td>
  if (v === 'wrong') return <td className="text-center px-2 py-1.5 text-rose-500 font-bold">✕</td>
  return <td className="text-center px-2 py-1.5 text-gray-200">○</td>
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-base font-bold text-gray-700 mb-3 flex items-center gap-2">
      {children}
    </h2>
  )
}

// ── 메인 ─────────────────────────────────────────────────────────
export default function BoardView({
  cityName, stage, stageLabel, alertPct, grant, classId,
  companies, reports, students, conceptMatrix, allConceptKinds,
}: Props) {
  const router = useRouter()
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set())
  const [lastRefresh, setLastRefresh] = useState(() => new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }))

  useEffect(() => {
    const id = setInterval(() => {
      router.refresh()
      setLastRefresh(new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }))
    }, 60_000)
    return () => clearInterval(id)
  }, [router])

  // 학생 상태 계산
  const withStatus = students.map(s => ({ ...s, status: getStatus(s, stage) }))
  const greenN = withStatus.filter(s => s.status === 'green').length
  const orangeN = withStatus.filter(s => s.status === 'orange').length
  const redN = withStatus.filter(s => s.status === 'red').length
  const redStudents = withStatus.filter(s => s.status === 'red')

  // 역할별 목록
  const byRole: Record<string, StudentActivity[]> = {}
  for (const s of students) {
    if (!byRole[s.role]) byRole[s.role] = []
    byRole[s.role].push(s)
  }

  // 개념 에러 많은 kind
  const errCount: Record<string, number> = {}
  for (const row of Object.values(conceptMatrix)) {
    for (const [k, v] of Object.entries(row)) {
      if (v === 'wrong') errCount[k] = (errCount[k] ?? 0) + 1
    }
  }
  const highErrKinds = new Set(
    Object.entries(errCount).filter(([, n]) => n >= 3).map(([k]) => k)
  )

  // 보고서 분류
  const newReports = reports.filter(r => !reviewedIds.has(r.id))
  const doneReports = reports.filter(r => reviewedIds.has(r.id))

  // 회사 예산 알림 기준
  const alertThreshold = (alertPct / 100) * grant

  const toggleReview = (id: string) => setReviewedIds(prev => {
    const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s
  })

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── 상단 고정 요약 바 ─────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/admin')} className="text-gray-400 text-sm hover:text-gray-600">← 관리자</button>
            <span className="font-black text-blue-700">{stage}단계 {stageLabel}</span>
            <span className="text-gray-400">·</span>
            <span className="text-gray-700 font-medium">{cityName}</span>
          </div>
          <div className="flex items-center gap-3 text-sm flex-wrap">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
              <span className="font-semibold text-emerald-700">{greenN}</span>
              <span className="text-gray-400">완료</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
              <span className="font-semibold text-amber-700">{orangeN}</span>
              <span className="text-gray-400">진행</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
              <span className="font-semibold text-rose-700">{redN}</span>
              <span className="text-gray-400">주의</span>
            </span>
            <span className="text-gray-300">|</span>
            <span className="text-gray-400 text-xs">{lastRefresh} 기준</span>
            <button
              onClick={() => { router.refresh(); setLastRefresh(new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })) }}
              className="text-xs bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition"
            >
              ↻ 새로고침
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">

        {/* ── ⚠️ 경보 배너 ─────────────────────────────────── */}
        {redStudents.length > 0 && (
          <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4">
            <p className="text-rose-700 font-bold text-sm mb-2">⚠️ 주의가 필요한 학생 {redStudents.length}명</p>
            <div className="flex flex-wrap gap-2">
              {redStudents.map(s => (
                <span key={s.id} className="bg-rose-100 border border-rose-300 text-rose-800 text-sm px-2.5 py-0.5 rounded-full">
                  {s.number}번 {s.nickname ?? '-'} <span className="text-rose-400">({ROLE_KO[s.role] ?? s.role})</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── 3-1 학생별 참여 현황 ──────────────────────────── */}
        <section>
          <SectionTitle>
            👤 학생별 참여 현황
            <span className="text-xs font-normal text-gray-400">초록=완료 · 주황=진행 중 · 빨강=주의</span>
          </SectionTitle>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
            {[...withStatus]
              .sort((a, b) => {
                const o: Record<string, number> = { red: 0, orange: 1, green: 2 }
                return (o[a.status] ?? 0) - (o[b.status] ?? 0) || a.number - b.number
              })
              .map(s => <StudentCard key={s.id} s={s} stage={stage} />)
            }
          </div>
        </section>

        {/* ── 3-2 개념 이해도 매트릭스 ─────────────────────── */}
        {allConceptKinds.length > 0 && (
          <section>
            <SectionTitle>
              📊 개념 이해도 매트릭스
              <span className="text-xs font-normal text-gray-400">● 정답 · ✕ 오답 · ○ 미응답</span>
              {highErrKinds.size > 0 && (
                <span className="text-xs text-rose-600 font-medium">· ⚠ 표시 = 오답 3명 이상</span>
              )}
            </SectionTitle>
            <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
              <table className="min-w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="sticky left-0 bg-gray-50 z-10 text-left px-3 py-2.5 font-semibold text-gray-600 min-w-[110px] border-r border-gray-100">
                      이름
                    </th>
                    {allConceptKinds.map(k => (
                      <th key={k} className={`px-2 py-2.5 font-medium text-xs text-center whitespace-nowrap ${highErrKinds.has(k) ? 'text-rose-600 bg-rose-50' : 'text-gray-500'}`}>
                        {CONCEPT_LABELS[k] ?? k}
                        {highErrKinds.has(k) && <span className="ml-0.5">⚠</span>}
                      </th>
                    ))}
                    <th className="px-2 py-2.5 font-medium text-xs text-center text-gray-400 border-l border-gray-100">정답률</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, i) => {
                    const row = conceptMatrix[s.id] ?? {}
                    const correct = allConceptKinds.filter(k => row[k] === 'correct').length
                    const answered = allConceptKinds.filter(k => row[k] !== undefined).length
                    const hasErr = allConceptKinds.some(k => row[k] === 'wrong')
                    const bg = hasErr ? 'bg-rose-50/50' : i % 2 === 0 ? '' : 'bg-gray-50/50'
                    return (
                      <tr key={s.id} className={`border-b border-gray-100 ${bg}`}>
                        <td className={`sticky left-0 z-10 px-3 py-2 text-xs font-medium whitespace-nowrap border-r border-gray-100 ${hasErr ? 'bg-rose-50/80' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50/80'}`}>
                          <div className="flex items-center gap-1.5">
                            <Dot status={getStatus(s, stage)} />
                            {s.number}번 {s.nickname ?? '-'}
                          </div>
                        </td>
                        {allConceptKinds.map(k => <ConceptCell key={k} v={row[k]} />)}
                        <td className="text-center px-2 py-2 text-xs font-medium text-gray-500 border-l border-gray-100">
                          {answered > 0 ? `${correct}/${answered}` : '-'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ── 3-3 회사별 예산·운영 현황 ─────────────────────── */}
        {companies.length > 0 && (
          <section>
            <SectionTitle>🏢 회사별 예산 현황</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[...companies].sort((a, b) => a.balance - b.balance).map(c => {
                const isAlert = c.balance < alertThreshold
                const pct = Math.min(100, Math.round((c.balance / grant) * 100))
                const barColor = isAlert ? 'bg-rose-400' : c.balance >= grant ? 'bg-emerald-400' : 'bg-amber-400'
                return (
                  <div key={c.id} className={`bg-white border-2 rounded-2xl p-4 shadow-sm ${isAlert ? 'border-rose-300' : 'border-gray-200'}`}>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-2xl leading-none mb-1">{c.icon}</div>
                        <div className="font-bold text-gray-800 truncate">{c.name}</div>
                        {c.ceoName && <div className="text-xs text-gray-500 mt-0.5">대표 {c.ceoName}</div>}
                        {c.staffNames.length > 0 && (
                          <div className="text-xs text-gray-400">직원 {c.staffNames.join(', ')}</div>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className={`font-bold ${isAlert ? 'text-rose-600' : 'text-gray-800'}`}>
                          {fmtMoney(c.balance)}
                        </div>
                        {isAlert && <div className="text-xs text-rose-500 font-medium mt-0.5">⚠ 잔액 부족</div>}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>잔액</span><span>{pct}%</span>
                      </div>
                      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                      </div>
                      <div className="text-xs text-gray-300">기준 {fmtMoney(grant)}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── 3-4 역할 현황 ────────────────────────────────── */}
        <section>
          <SectionTitle>📋 역할 현황</SectionTitle>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(['ceo', 'staff', 'officer', 'applicant'] as const).map(role => {
              const list = (byRole[role] ?? []).sort((a, b) => a.number - b.number)
              return (
                <div key={role} className="bg-white border border-gray-200 rounded-2xl p-3.5 shadow-sm">
                  <div className="flex items-center gap-1.5 mb-2.5 pb-2 border-b border-gray-100">
                    <span className="text-base">{ROLE_EMOJI[role]}</span>
                    <span className="font-semibold text-gray-700 text-sm">{ROLE_KO[role]}</span>
                    <span className="ml-auto text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{list.length}명</span>
                  </div>
                  {list.length === 0
                    ? <p className="text-xs text-gray-300 text-center py-1">없음</p>
                    : (
                      <ul className="space-y-1.5">
                        {list.map(s => (
                          <li key={s.id} className="flex items-center gap-1.5">
                            <Dot status={getStatus(s, stage)} />
                            <span className="text-xs text-gray-700 font-medium">{s.number}번 {s.nickname ?? '-'}</span>
                            {s.companyName && (
                              <span className="text-xs text-gray-400 truncate">{s.companyName}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )
                  }
                </div>
              )
            })}
          </div>
        </section>

        {/* ── 3-5 공무원 시찰 보고서 ───────────────────────── */}
        {reports.length > 0 && (
          <section>
            <SectionTitle>
              📝 공무원 시찰 보고서
              {newReports.length > 0 && (
                <span className="bg-rose-500 text-white text-xs rounded-full px-2 py-0.5 font-medium">
                  NEW {newReports.length}
                </span>
              )}
            </SectionTitle>
            <div className="space-y-2">
              {newReports.map(r => (
                <ReportCard key={r.id} r={r} reviewed={false} onToggle={() => toggleReview(r.id)} />
              ))}
              {doneReports.length > 0 && (
                <details className="group">
                  <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-600 select-none mt-2">
                    확인 완료 {doneReports.length}건 ▾
                  </summary>
                  <div className="space-y-2 mt-2">
                    {doneReports.map(r => (
                      <ReportCard key={r.id} r={r} reviewed onToggle={() => toggleReview(r.id)} />
                    ))}
                  </div>
                </details>
              )}
            </div>
          </section>
        )}

      </div>
    </div>
  )
}

// ── 보고서 카드 ───────────────────────────────────────────────────
function ReportCard({ r, reviewed, onToggle }: { r: ReportInfo; reviewed: boolean; onToggle: () => void }) {
  const min = minsAgo(r.createdAt)
  const timeStr = min === null ? '' : min < 1 ? '방금 전' : min < 60 ? `${min}분 전` : `${Math.floor(min / 60)}시간 전`
  const STATUS_LABEL: Record<string, string> = { good: '😀 잘됨', slow: '😐 느림', bad: '😟 문제' }

  return (
    <div className={`border rounded-2xl p-4 transition-all shadow-sm ${
      reviewed
        ? 'bg-gray-50 border-gray-200 opacity-60'
        : r.alertDelivered
        ? 'bg-amber-50 border-amber-300'
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
              <span className="text-gray-400">진행 상태 </span>
              {STATUS_LABEL[r.progressStatus] ?? r.progressStatus}
            </p>
          )}
          {r.observation && (
            <p className="text-xs text-gray-600 mt-0.5">
              <span className="text-gray-400">시찰 내용 </span>{r.observation}
            </p>
          )}
          {r.noteToMayor && (
            <p className="text-xs text-blue-700 mt-1 bg-blue-50 rounded-lg px-2.5 py-1">
              <span className="font-medium">시장 메모 </span>{r.noteToMayor}
            </p>
          )}
        </div>
        <button
          onClick={onToggle}
          className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-xl border font-medium transition ${
            reviewed
              ? 'border-gray-300 text-gray-400 hover:bg-gray-100'
              : 'border-emerald-500 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
          }`}
        >
          {reviewed ? '↩ 되돌리기' : '✓ 확인'}
        </button>
      </div>
    </div>
  )
}
