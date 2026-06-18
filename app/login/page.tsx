'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CITY_COLORS, type ClassRow } from '@/lib/types'
import { pinToPassword } from '@/lib/auth'

type Step = 'class' | 'number' | 'pin'

const PIN_FAIL_KEY = 'pin_fails'
const PIN_LOCKOUT_UNTIL = 'pin_lockout_until'

function makeEmail(classCode: string, number: number) {
  return `${classCode.toLowerCase()}-${number}@classroom.local`
}

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<Step>('class')
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [selectedClass, setSelectedClass] = useState<ClassRow | null>(null)
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [lockout, setLockout] = useState(0)

  useEffect(() => {
    supabase.from('classes').select('*').order('name').then(({ data }) => {
      if (data) setClasses(data as ClassRow[])
    })
    const until = parseInt(localStorage.getItem(PIN_LOCKOUT_UNTIL) || '0')
    const remaining = Math.ceil((until - Date.now()) / 1000)
    if (remaining > 0) setLockout(remaining)
  }, [])

  useEffect(() => {
    if (lockout <= 0) return
    const t = setInterval(() => setLockout(prev => {
      if (prev <= 1) { clearInterval(t); return 0 }
      return prev - 1
    }), 1000)
    return () => clearInterval(t)
  }, [lockout])

  function handlePinDigit(digit: string) {
    if (lockout > 0 || pin.length >= 4 || loading) return
    const next = pin + digit
    setPin(next)
    if (next.length === 4) submitPin(next)
  }

  function handlePinDelete() {
    setPin(p => p.slice(0, -1))
    setError('')
  }

  async function submitPin(enteredPin: string) {
    if (!selectedClass || !selectedNumber) return
    setLoading(true)
    setError('')

    const email = makeEmail(selectedClass.code, selectedNumber)
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password: pinToPassword(enteredPin) })

    if (!signInErr) {
      localStorage.removeItem(PIN_FAIL_KEY)
      localStorage.removeItem(PIN_LOCKOUT_UNTIL)
      const { data: { user: authUser } } = await supabase.auth.getUser()
      const { data: userData } = await supabase
        .from('users')
        .select('must_change_pin, role')
        .eq('id', authUser!.id)
        .single()
      if (userData?.must_change_pin) {
        router.push('/pin-change')
      } else {
        router.push('/home')
      }
      return
    }

    const fails = parseInt(localStorage.getItem(PIN_FAIL_KEY) || '0') + 1
    if (fails >= 3) {
      const until = Date.now() + 30_000
      localStorage.setItem(PIN_LOCKOUT_UNTIL, String(until))
      localStorage.removeItem(PIN_FAIL_KEY)
      setLockout(30)
      setError('PIN을 3회 틀렸습니다. 30초 후 다시 시도하세요.')
    } else {
      localStorage.setItem(PIN_FAIL_KEY, String(fails))
      setError(`PIN이 틀렸습니다. (${fails}/3)`)
    }
    setPin('')
    setLoading(false)
  }

  // 공통 래퍼 — 크롬북 화면에서 가운데 정렬, 넉넉한 패딩
  const Wrap = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-xl">
        {children}
      </div>
    </div>
  )

  // ── 반 선택 ──────────────────────────────────
  if (step === 'class') return (
    <Wrap>
      <h1 className="text-3xl font-bold text-gray-800 mb-2 text-center">경기 상생 창업 프로젝트</h1>
      <p className="text-gray-500 mb-10 text-center text-lg">우리 반을 선택하세요</p>
      <div className="grid grid-cols-3 gap-4">
        {classes.map(cls => (
          <button key={cls.id}
            onClick={() => { setSelectedClass(cls); setStep('number') }}
            className={`h-32 rounded-2xl text-white font-bold text-xl shadow-md
              active:scale-95 transition-transform ${CITY_COLORS[cls.color] ?? 'bg-gray-400'}`}>
            {cls.name}
          </button>
        ))}
      </div>
      <button onClick={() => router.push('/admin/login')}
        className="mt-12 w-full text-sm text-gray-400 underline text-center block">
        선생님 로그인
      </button>
    </Wrap>
  )

  // ── 번호 선택 ────────────────────────────────
  if (step === 'number') return (
    <Wrap>
      <button onClick={() => setStep('class')} className="text-gray-400 text-sm mb-6 block">
        ← 반 다시 선택
      </button>
      <div className="flex items-center gap-3 mb-8">
        <span className={`px-4 py-2 rounded-full text-white font-bold text-lg ${CITY_COLORS[selectedClass!.color]}`}>
          {selectedClass!.name}
        </span>
      </div>
      <p className="text-gray-700 font-semibold text-xl mb-6">내 번호를 선택하세요</p>
      <div className="grid grid-cols-5 gap-3">
        {Array.from({ length: 25 }, (_, i) => i + 1).map(n => (
          <button key={n}
            onClick={() => { setSelectedNumber(n); setStep('pin') }}
            className="h-16 rounded-xl bg-white border-2 border-gray-200 font-bold text-gray-700 text-lg
              hover:border-blue-400 hover:text-blue-600 active:scale-95 transition-all shadow-sm">
            {n}
          </button>
        ))}
      </div>
    </Wrap>
  )

  // ── PIN 입력 ─────────────────────────────────
  return (
    <Wrap>
      <button onClick={() => { setStep('number'); setPin(''); setError('') }}
        className="text-gray-400 text-sm mb-6 block">
        ← 번호 다시 선택
      </button>
      <div className="flex items-center gap-3 mb-2">
        <span className={`px-4 py-2 rounded-full text-white font-bold ${CITY_COLORS[selectedClass!.color]}`}>
          {selectedClass!.name}
        </span>
        <span className="text-gray-500 font-medium">{selectedNumber}번</span>
      </div>
      <p className="text-gray-700 font-semibold text-xl mb-8 mt-4">PIN 4자리를 입력하세요</p>

      <div className="flex gap-6 mb-6 justify-center">
        {[0,1,2,3].map(i => (
          <div key={i} className={`w-6 h-6 rounded-full transition-colors
            ${i < pin.length ? 'bg-gray-800' : 'bg-gray-300'}`} />
        ))}
      </div>

      {error && <p className="text-red-500 mb-4 text-center">{error}</p>}
      {lockout > 0 && <p className="text-orange-500 mb-4 text-center">{lockout}초 후 다시 시도</p>}

      {/* PIN 키패드 — 크롬북에서도 터치하기 편한 크기 */}
      <div className="grid grid-cols-3 gap-4 max-w-xs mx-auto">
        {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((key, i) => {
          if (key === '') return <div key={i} />
          return (
            <button key={i}
              onClick={() => key === '⌫' ? handlePinDelete() : handlePinDigit(key)}
              disabled={loading || lockout > 0}
              className={`h-20 rounded-2xl font-bold text-2xl shadow-sm transition-all active:scale-95
                ${key === '⌫'
                  ? 'bg-gray-200 text-gray-600'
                  : 'bg-white border-2 border-gray-200 text-gray-800 hover:border-blue-400'}
                disabled:opacity-40`}>
              {key}
            </button>
          )
        })}
      </div>
    </Wrap>
  )
}
