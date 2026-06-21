'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const CODE_TO_EMAIL: Record<string, string> = {
  '3643441': 'mayor-suwon@classroom.local',
  '3643442': 'mayor-icheon@classroom.local',
  '3643443': 'mayor-goyang@classroom.local',
  '3643444': 'mayor-bucheon@classroom.local',
  '3643445': 'mayor-paju@classroom.local',
}

export default function AdminLoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleDigit(digit: string) {
    if (loading || code.length >= 7) return
    const next = code + digit
    setCode(next)
    setError('')
    if (next.length === 7) await submit(next)
  }

  function handleDelete() {
    setCode(c => c.slice(0, -1))
    setError('')
  }

  async function submit(inputCode: string) {
    setLoading(true)
    const res = await fetch('/api/admin/class-code-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: inputCode }),
    })
    if (!res.ok) {
      const data = await res.json()
      setError(data.message ?? '잘못된 학급비번입니다.')
      setCode('')
      setLoading(false)
      return
    }

    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: CODE_TO_EMAIL[inputCode],
      password: `gg_${inputCode}`,
    })
    if (signInErr) {
      setError('로그인에 실패했습니다. 다시 시도하세요.')
      setCode('')
      setLoading(false)
      return
    }
    router.push('/admin')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
      <div className="bg-white rounded-3xl shadow-sm p-10 w-full max-w-sm flex flex-col items-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">선생님 로그인</h1>
        <p className="text-gray-500 text-sm mb-8">학급비번을 입력하세요</p>

        {/* 입력 표시 — 7칸 점 */}
        <div className="flex gap-3 mb-8">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm
              transition-colors ${i < code.length
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-400'}`}>
              {code[i] ?? ''}
            </div>
          ))}
        </div>

        {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
        {loading && <p className="text-blue-500 text-sm mb-4">로그인 중...</p>}

        {/* 숫자 키패드 */}
        <div className="grid grid-cols-3 gap-3 w-full">
          {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((key, i) => {
            if (key === '') return <div key={i} />
            return (
              <button key={i}
                onClick={() => key === '⌫' ? handleDelete() : handleDigit(key)}
                disabled={loading}
                className={`h-16 rounded-2xl font-bold text-xl shadow-sm transition-all active:scale-95
                  ${key === '⌫'
                    ? 'bg-gray-200 text-gray-600'
                    : 'bg-gray-50 border-2 border-gray-200 text-gray-800 hover:border-blue-400'}
                  disabled:opacity-40`}>
                {key}
              </button>
            )
          })}
        </div>
      </div>

      <button onClick={() => router.push('/login')}
        className="mt-8 text-sm text-gray-400">
        ← 학생 로그인으로
      </button>
    </div>
  )
}
