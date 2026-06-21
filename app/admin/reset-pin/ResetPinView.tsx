'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Student { id: string; number: number; nickname: string | null; role: string }

const ROLE_LABEL: Record<string, string> = {
  applicant: '지원자', ceo: 'CEO', staff: '직원', officer: '공무원', mayor: '시장',
}

export default function ResetPinView({ students }: { students: Student[] }) {
  const router = useRouter()
  const [pins, setPins] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<Record<string, 'ok' | 'err' | null>>({})
  const [busy, setBusy] = useState<string | null>(null)

  async function reset(studentId: string) {
    const pin = pins[studentId] ?? ''
    if (!/^\d{4}$/.test(pin)) return
    setBusy(studentId)
    const res = await fetch('/api/admin/edit-student', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, action: 'reset_pin', newPin: pin }),
    })
    setBusy(null)
    setStatus(prev => ({ ...prev, [studentId]: res.ok ? 'ok' : 'err' }))
    if (res.ok) setPins(prev => ({ ...prev, [studentId]: '' }))
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => window.history.length > 1 ? router.back() : router.push('/admin')}
          className="flex items-center gap-1.5 text-red-500 font-bold text-lg mb-5 hover:text-red-600 active:scale-95 transition-all">
          <span className="text-2xl font-black">←</span>
          <span>이전으로</span>
        </button>

        <h1 className="text-2xl font-bold text-gray-800 mb-1 flex items-center gap-2">
          🔑 학생 핀번호 초기화
        </h1>
        <p className="text-sm text-gray-400 mb-6">학생이 PIN을 잊었을 때 새로운 4자리 PIN으로 바꿔줘요</p>

        <div className="flex flex-col gap-3">
          {students.map(s => {
            const name = s.nickname ?? `${s.number}번`
            const st = status[s.id]
            return (
              <div key={s.id} className={`bg-white rounded-2xl px-4 py-3 shadow-sm flex items-center gap-3
                ${st === 'ok' ? 'border-2 border-green-200' : 'border-2 border-transparent'}`}>
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600">
                  {s.number}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-800">{name}</div>
                  <div className="text-xs text-gray-400">{ROLE_LABEL[s.role] ?? s.role}</div>
                </div>
                <div className="flex items-center gap-2">
                  {st === 'ok' && <span className="text-green-600 text-sm font-bold">✓ 완료</span>}
                  {st === 'err' && <span className="text-red-500 text-xs">실패</span>}
                  <input
                    type="text" inputMode="numeric" pattern="\d{4}"
                    maxLength={4} placeholder="새 PIN"
                    value={pins[s.id] ?? ''}
                    onChange={e => {
                      const v = e.target.value.replace(/\D/g, '').slice(0, 4)
                      setPins(prev => ({ ...prev, [s.id]: v }))
                      if (status[s.id]) setStatus(prev => ({ ...prev, [s.id]: null }))
                    }}
                    className="w-20 border-2 border-gray-200 rounded-xl px-3 py-2 text-center text-sm font-mono focus:border-blue-400 outline-none"
                  />
                  <button
                    onClick={() => reset(s.id)}
                    disabled={busy === s.id || (pins[s.id] ?? '').length < 4}
                    className="bg-purple-500 text-white rounded-xl px-3 py-2 text-sm font-bold disabled:opacity-40 active:scale-95 transition-transform">
                    {busy === s.id ? '...' : '초기화'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
