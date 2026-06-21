'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AdminLoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleChange(val: string) {
    const clean = val.replace(/\D/g, '').slice(0, 7)
    setCode(clean)
    setError('')
    if (clean.length === 7) await submit(clean)
  }

  async function submit(inputCode: string) {
    setLoading(true)

    // 1. 반 코드 검증 + 시장 계정 생성(멱등) → 이메일 반환
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

    const { email } = await res.json()

    // 2. 반환된 이메일로 로그인
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email,
      password: `gg_${inputCode}`,
    })
    if (signInErr) {
      setError('로그인에 실패했습니다. 다시 시도하세요.')
      setCode('')
      setLoading(false)
      return
    }

    window.location.href = '/admin'
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
      <div className="bg-white rounded-3xl shadow-sm p-10 w-full max-w-sm flex flex-col items-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">선생님 로그인</h1>
        <p className="text-gray-500 text-sm mb-8">학급비번을 입력하세요</p>

        <input
          type="password"
          inputMode="numeric"
          autoFocus
          value={code}
          onChange={e => handleChange(e.target.value)}
          disabled={loading}
          maxLength={7}
          placeholder="●●●●●●●"
          className="w-full text-center text-3xl tracking-[0.5em] border-2 border-gray-200
            rounded-2xl px-4 py-5 text-gray-800 focus:border-blue-400 outline-none
            disabled:opacity-50 placeholder:text-gray-200"
        />

        {error && <p className="text-red-500 text-sm mt-4 text-center">{error}</p>}
        {loading && <p className="text-blue-500 text-sm mt-4">로그인 중...</p>}
      </div>

      <button onClick={() => router.push('/login')}
        className="mt-8 text-sm text-gray-400">
        ← 학생 로그인으로
      </button>
    </div>
  )
}
