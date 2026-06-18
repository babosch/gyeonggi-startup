'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AdminLoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (mode === 'signup') {
      const { error: signUpErr } = await supabase.auth.signUp({ email, password })
      if (signUpErr) { setError(signUpErr.message); setLoading(false); return }
      setDone(true)
      setLoading(false)
      return
    }

    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
    if (signInErr) { setError('이메일 또는 비밀번호가 틀렸습니다.'); setLoading(false); return }
    router.push('/admin')
  }

  if (done) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-sm p-8 max-w-sm w-full text-center">
        <p className="text-2xl mb-2">✅</p>
        <p className="font-bold text-gray-800">가입 완료!</p>
        <p className="text-gray-500 text-sm mt-2 mb-6">아래에서 로그인하세요.</p>
        <button onClick={() => { setMode('login'); setDone(false) }}
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold">
          로그인하기
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-sm p-8 max-w-sm w-full">
        <h1 className="text-xl font-bold text-gray-800 mb-1">선생님 로그인</h1>
        <p className="text-gray-500 text-sm mb-6">시장(교사) 계정</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input type="email" placeholder="이메일" value={email}
            onChange={e => setEmail(e.target.value)} required
            className="border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:border-blue-400 outline-none" />
          <input type="password" placeholder="비밀번호" value={password}
            onChange={e => setPassword(e.target.value)} required
            className="border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:border-blue-400 outline-none" />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" disabled={loading}
            className="py-3 bg-blue-600 text-white rounded-xl font-bold disabled:opacity-50">
            {loading ? '...' : mode === 'login' ? '로그인' : '가입하기'}
          </button>
        </form>

        <button onClick={() => setMode(m => m === 'login' ? 'signup' : 'login')}
          className="mt-4 w-full text-sm text-gray-400 underline">
          {mode === 'login' ? '처음 사용? 계정 만들기' : '이미 계정이 있다면 로그인'}
        </button>

        <button onClick={() => router.push('/login')}
          className="mt-2 w-full text-sm text-gray-400">
          ← 학생 로그인으로
        </button>
      </div>
    </div>
  )
}
