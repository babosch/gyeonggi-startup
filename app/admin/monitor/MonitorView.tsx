'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// ─── 타입 ────────────────────────────────────────────
interface Student {
  id: string; number: number; nickname: string | null
  role: string; companyId: string | null; companyName: string | null; balance: number
}
interface Company { id: string; name: string; balance: number; ceo: string; staffCount: number }
interface Application {
  id: string; companyId: string; companyName: string
  applicantId: string; applicantName: string; motivation: string
  status: string; createdAt: string
}
interface Transaction {
  id: string; fromName: string; toName: string; amount: number
  type: string; memo: string; voided: boolean; createdAt: string
}

const ROLE_LABEL: Record<string, string> = {
  applicant: '지원자', ceo: 'CEO', staff: '직원', officer: '공무원',
}
const ROLE_COLOR: Record<string, string> = {
  applicant: 'bg-gray-100 text-gray-600',
  ceo: 'bg-amber-100 text-amber-700',
  staff: 'bg-blue-100 text-blue-700',
  officer: 'bg-purple-100 text-purple-700',
}
const TX_TYPE_LABEL: Record<string, string> = {
  grant: '지원금', purchase: '구매', payroll: '급여',
  facility: '시설', exchange: '교류', refund: '환불', adjust: '조정',
}

// ─── 학생 수정 모달 ──────────────────────────────────
function StudentEditModal({ student, companies, onClose, onSave }: {
  student: Student
  companies: Company[]
  onClose: () => void
  onSave: () => void
}) {
  const [role, setRole] = useState(student.role)
  const [companyId, setCompanyId] = useState(student.companyId ?? '')
  const [adjustAmt, setAdjustAmt] = useState('')
  const [adjustMemo, setAdjustMemo] = useState('')
  const [newPin, setNewPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function saveRole() {
    setBusy(true)
    const res = await fetch('/api/admin/edit-student', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: student.id, action: 'set_role', role, companyId: companyId || null }),
    })
    setBusy(false)
    if (res.ok) { setMsg('역할 변경 완료!'); onSave() }
    else setMsg('오류: ' + (await res.json()).error)
  }

  async function adjustBalance() {
    const amt = parseInt(adjustAmt)
    if (!amt || isNaN(amt)) return
    setBusy(true)
    const res = await fetch('/api/admin/adjust-balance', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerType: 'user', ownerId: student.id, amount: amt, memo: adjustMemo || '교사 조정' }),
    })
    setBusy(false)
    if (res.ok) { setMsg(`잔액 ${amt > 0 ? '+' : ''}${amt.toLocaleString()}원 조정 완료!`); setAdjustAmt('') }
    else setMsg('오류: ' + (await res.json()).error)
  }

  async function resetPin() {
    if (!/^\d{4}$/.test(newPin)) { setMsg('PIN은 4자리 숫자예요'); return }
    setBusy(true)
    const res = await fetch('/api/admin/edit-student', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: student.id, action: 'reset_pin', newPin }),
    })
    setBusy(false)
    if (res.ok) { setMsg(`PIN을 ${newPin}으로 재설정했어요`); setNewPin('') }
    else setMsg('오류: ' + (await res.json()).error)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-3xl w-full max-w-md p-6 flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-lg font-bold text-gray-800">
              {student.nickname ?? `${student.number}번`} 수정
            </div>
            <div className="text-sm text-gray-400">현재 잔액 {student.balance.toLocaleString()}원</div>
          </div>
          <button onClick={onClose} className="text-gray-400 text-2xl leading-none">×</button>
        </div>

        {msg && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700">{msg}</div>
        )}

        {/* 역할 변경 */}
        <div className="bg-gray-50 rounded-2xl p-4">
          <div className="font-medium text-gray-700 mb-3">① 역할 변경</div>
          <select value={role} onChange={e => setRole(e.target.value)}
            className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 bg-white mb-3 focus:border-blue-400 outline-none">
            <option value="applicant">지원자 (초기 상태)</option>
            <option value="ceo">CEO</option>
            <option value="staff">직원</option>
            <option value="officer">공무원</option>
          </select>
          {(role === 'ceo' || role === 'staff') && (
            <select value={companyId} onChange={e => setCompanyId(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 bg-white mb-3 focus:border-blue-400 outline-none">
              <option value="">-- 회사 선택 --</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <button onClick={saveRole} disabled={busy}
            className="w-full bg-blue-500 text-white rounded-xl py-2.5 font-medium disabled:opacity-40">
            역할 저장
          </button>
        </div>

        {/* 잔액 조정 */}
        <div className="bg-gray-50 rounded-2xl p-4">
          <div className="font-medium text-gray-700 mb-3">② 잔액 수동 조정</div>
          <div className="flex gap-2 mb-2">
            <input type="number" value={adjustAmt} onChange={e => setAdjustAmt(e.target.value)}
              placeholder="예: 5000 (차감은 -5000)"
              className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2.5 focus:border-blue-400 outline-none text-sm" />
          </div>
          <input value={adjustMemo} onChange={e => setAdjustMemo(e.target.value)}
            placeholder="사유 (예: 오입력 정정)"
            className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm mb-3 focus:border-blue-400 outline-none" />
          <button onClick={adjustBalance} disabled={busy || !adjustAmt}
            className="w-full bg-amber-500 text-white rounded-xl py-2.5 font-medium disabled:opacity-40">
            잔액 조정
          </button>
        </div>

        {/* PIN 재설정 */}
        <div className="bg-gray-50 rounded-2xl p-4">
          <div className="font-medium text-gray-700 mb-3">③ PIN 재설정</div>
          <div className="flex gap-2">
            <input value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="새 PIN 4자리"
              className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-blue-400 outline-none" />
            <button onClick={resetPin} disabled={busy || newPin.length < 4}
              className="bg-purple-500 text-white rounded-xl px-4 font-medium disabled:opacity-40 text-sm">
              재설정
            </button>
          </div>
        </div>

        <button onClick={onClose} className="text-gray-400 text-sm text-center">닫기</button>
      </div>
    </div>
  )
}

// ─── 메인 모니터 뷰 ──────────────────────────────────
export default function MonitorView({ cityName, stage, classId, students, companies, applications, transactions }: {
  cityName: string; stage: number; classId: string
  students: Student[]; companies: Company[]
  applications: Application[]; transactions: Transaction[]
}) {
  const router = useRouter()
  const [tab, setTab] = useState<'students' | 'companies' | 'hiring' | 'transactions'>('students')
  const [editStudent, setEditStudent] = useState<Student | null>(null)
  const [voidBusy, setVoidBusy] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const STAGE_LABELS = ['⓪ 도시탐구', '① 창업', '② 생산', '③ 교류', '④ 판매']

  const filteredStudents = students.filter(s =>
    !searchQuery || `${s.number}번 ${s.nickname ?? ''}`.includes(searchQuery)
  )

  const pendingApps = applications.filter(a => a.status === 'pending')
  const roleCounts = students.reduce<Record<string, number>>((acc, s) => {
    acc[s.role] = (acc[s.role] ?? 0) + 1; return acc
  }, {})

  async function voidTx(txId: string) {
    if (!confirm('이 거래를 취소하면 잔액이 원상복구돼요. 진행할까요?')) return
    setVoidBusy(txId)
    await fetch('/api/admin/void-tx', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ txId }),
    })
    setVoidBusy(null)
    router.refresh()
  }

  const tabs = [
    { key: 'students', label: '👥 학생', badge: students.length },
    { key: 'companies', label: '🏭 회사', badge: companies.length },
    { key: 'hiring', label: '💼 채용', badge: pendingApps.length || undefined },
    { key: 'transactions', label: '💸 거래', badge: undefined },
  ] as const

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.push('/admin')} className="text-gray-400 text-sm">←</button>
          <div>
            <div className="font-bold text-gray-800">{cityName} 모니터링</div>
            <div className="text-xs text-gray-400">현재 단계: {STAGE_LABELS[stage] ?? stage}</div>
          </div>
          <button onClick={() => router.refresh()} className="ml-auto text-sm text-blue-500 font-medium">
            새로고침
          </button>
        </div>

        {/* 탭 */}
        <div className="max-w-3xl mx-auto px-4 flex gap-1 pb-0 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors relative
                ${tab === t.key ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t.label}
              {t.badge != null && (
                <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-bold
                  ${tab === t.key ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 flex flex-col gap-3">

        {/* ── 학생 탭 ── */}
        {tab === 'students' && (
          <>
            {/* 역할 요약 */}
            <div className="grid grid-cols-4 gap-2">
              {['applicant', 'ceo', 'staff', 'officer'].map(r => (
                <div key={r} className="bg-white rounded-2xl p-3 text-center shadow-sm">
                  <div className="text-2xl font-bold text-gray-800">{roleCounts[r] ?? 0}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{ROLE_LABEL[r]}</div>
                </div>
              ))}
            </div>

            {/* 검색 */}
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="🔍 번호나 닉네임으로 검색..."
              className="w-full bg-white border-2 border-gray-200 rounded-2xl px-4 py-3 focus:border-blue-400 outline-none" />

            {/* 학생 목록 */}
            <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
              {filteredStudents.map((s, i) => (
                <div key={s.id}
                  className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600">
                    {s.number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-800 text-sm">
                        {s.nickname ?? `${s.number}번`}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${ROLE_COLOR[s.role] ?? 'bg-gray-100 text-gray-500'}`}>
                        {ROLE_LABEL[s.role] ?? s.role}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5 truncate">
                      {s.companyName ? `🏭 ${s.companyName} · ` : ''}
                      잔액 {s.balance.toLocaleString()}원
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => router.push(`/admin/students/${s.id}`)}
                      className="text-xs bg-gray-50 text-gray-600 px-2.5 py-1.5 rounded-xl font-medium hover:bg-gray-100 transition-colors">
                      상세
                    </button>
                    <button onClick={() => setEditStudent(s)}
                      className="text-xs bg-blue-50 text-blue-600 px-2.5 py-1.5 rounded-xl font-medium hover:bg-blue-100 transition-colors">
                      수정
                    </button>
                  </div>
                </div>
              ))}
              {filteredStudents.length === 0 && (
                <div className="py-10 text-center text-gray-400 text-sm">검색 결과가 없어요</div>
              )}
            </div>
          </>
        )}

        {/* ── 회사 탭 ── */}
        {tab === 'companies' && (
          <div className="flex flex-col gap-3">
            {companies.length === 0 && (
              <div className="bg-white rounded-3xl p-10 text-center text-gray-400">아직 선정된 회사가 없어요.</div>
            )}
            {companies.map(c => (
              <div key={c.id} className="bg-white rounded-3xl p-5 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-bold text-gray-800 text-lg">{c.name}</div>
                    <div className="text-sm text-gray-500">CEO {c.ceo} · 직원 {c.staffCount}명</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-blue-600 text-lg">{c.balance.toLocaleString()}원</div>
                    <div className="text-xs text-gray-400">잔액</div>
                  </div>
                </div>

                {/* 회사 잔액 조정 */}
                <CompanyBalanceAdjust companyId={c.id} companyName={c.name} onDone={() => router.refresh()} />
              </div>
            ))}
          </div>
        )}

        {/* ── 채용 탭 ── */}
        {tab === 'hiring' && (
          <div className="flex flex-col gap-3">
            {applications.length === 0 && (
              <div className="bg-white rounded-3xl p-10 text-center text-gray-400">아직 지원서가 없어요.</div>
            )}
            {pendingApps.length > 0 && (
              <div className="bg-amber-50 rounded-2xl p-3 text-sm text-amber-700 font-medium">
                ⏳ 검토 대기 중 {pendingApps.length}건
              </div>
            )}
            {applications.map(a => (
              <div key={a.id} className={`bg-white rounded-3xl p-4 shadow-sm border-l-4
                ${a.status === 'pending' ? 'border-amber-400' : a.status === 'hired' ? 'border-green-400' : 'border-gray-200'}`}>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-gray-800">{a.applicantName}</span>
                  <span className="text-xs text-gray-500">→ {a.companyName}</span>
                </div>
                <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-2 mb-2">"{a.motivation}"</p>
                <div className="flex justify-between items-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                    ${a.status === 'hired' ? 'bg-green-100 text-green-700'
                    : a.status === 'rejected' ? 'bg-red-100 text-red-500'
                    : 'bg-amber-100 text-amber-700'}`}>
                    {a.status === 'hired' ? '채용됨' : a.status === 'rejected' ? '거절됨' : '대기 중'}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(a.createdAt).toLocaleDateString('ko-KR')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── 거래 탭 ── */}
        {tab === 'transactions' && (
          <div className="flex flex-col gap-2">
            <div className="bg-amber-50 rounded-2xl p-3 text-xs text-amber-700">
              ⚠️ 거래 취소는 잔액을 되돌리므로 신중하게 사용하세요.
            </div>
            {transactions.length === 0 && (
              <div className="bg-white rounded-3xl p-10 text-center text-gray-400">거래 내역이 없어요.</div>
            )}
            {transactions.map(t => (
              <div key={t.id} className={`bg-white rounded-2xl p-4 shadow-sm ${t.voided ? 'opacity-40' : ''}`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium">
                        {TX_TYPE_LABEL[t.type] ?? t.type}
                      </span>
                      {t.voided && <span className="text-xs text-red-400 font-medium">취소됨</span>}
                    </div>
                    <div className="text-sm text-gray-700 truncate">
                      {t.fromName} → {t.toName}
                    </div>
                    {t.memo && <div className="text-xs text-gray-400 truncate">{t.memo}</div>}
                  </div>
                  <div className="text-right ml-3 shrink-0">
                    <div className="font-bold text-gray-800">{t.amount.toLocaleString()}원</div>
                    <div className="text-xs text-gray-400">
                      {new Date(t.createdAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {!t.voided && (
                      <button onClick={() => voidTx(t.id)} disabled={voidBusy === t.id}
                        className="text-xs text-red-400 mt-1 underline disabled:opacity-40">
                        {voidBusy === t.id ? '...' : '취소'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 학생 수정 모달 */}
      {editStudent && (
        <StudentEditModal
          student={editStudent}
          companies={companies}
          onClose={() => setEditStudent(null)}
          onSave={() => { setEditStudent(null); router.refresh() }}
        />
      )}
    </div>
  )
}

// 회사 잔액 조정 인라인 컴포넌트
function CompanyBalanceAdjust({ companyId, companyName, onDone }: {
  companyId: string; companyName: string; onDone: () => void
}) {
  const [show, setShow] = useState(false)
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')
  const [busy, setBusy] = useState(false)

  async function save() {
    const amt = parseInt(amount)
    if (!amt) return
    setBusy(true)
    await fetch('/api/admin/adjust-balance', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerType: 'company', ownerId: companyId, amount: amt, memo: memo || '교사 조정' }),
    })
    setBusy(false)
    setShow(false); setAmount(''); setMemo('')
    onDone()
  }

  if (!show) return (
    <button onClick={() => setShow(true)} className="text-xs text-gray-400 underline">잔액 조정</button>
  )
  return (
    <div className="flex gap-2 mt-1">
      <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
        placeholder="금액 (음수=차감)" className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-blue-400 outline-none" />
      <input value={memo} onChange={e => setMemo(e.target.value)}
        placeholder="사유" className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-blue-400 outline-none" />
      <button onClick={save} disabled={busy || !amount}
        className="bg-blue-500 text-white rounded-xl px-3 py-2 text-sm font-medium disabled:opacity-40">저장</button>
      <button onClick={() => setShow(false)} className="text-gray-400 text-sm px-1">✕</button>
    </div>
  )
}
