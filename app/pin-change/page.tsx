'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { pinToPassword, DEFAULT_PIN } from '@/lib/auth'

export default function PinChangePage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<'new' | 'confirm'>('new')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const current = step === 'new' ? newPin : confirmPin
  const setter = step === 'new' ? setNewPin : setConfirmPin

  function handleDigit(digit: string) {
    if (current.length >= 4 || loading) return
    const next = current + digit
    setter(next)
    if (next.length === 4) {
      if (step === 'new') {
        if (next === DEFAULT_PIN) { setError('1234는 사용할 수 없습니다.'); setter(''); return }
        setStep('confirm')
        setError('')
      } else {
        handleConfirm(next)
      }
    }
  }

  function handleDelete() {
    setter(c => c.slice(0, -1))
    setError('')
  }

  async function handleConfirm(entered: string) {
    if (entered !== newPin) {
      setError('PIN이 일치하지 않습니다. 다시 입력하세요.')
      setConfirmPin('')
      setNewPin('')
      setStep('new')
      return
    }
    setLoading(true)
    const { error: updateErr } = await supabase.auth.updateUser({ password: pinToPassword(newPin) })
    if (updateErr) {
      setError(`변경 실패: ${updateErr.message}`)
      setConfirmPin('')
      setStep('new')
      setNewPin('')
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('users').update({ must_change_pin: false }).eq('id', user?.id ?? '')
    router.push('/home')
  }

  const dots = step === 'new' ? newPin : confirmPin

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-xl flex flex-col items-center">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-8 text-center w-full max-w-md">
          <p className="text-amber-800 font-semibold text-lg">PIN을 변경해야 합니다</p>
          <p className="text-amber-600 text-sm mt-1">기본 PIN(1234)은 사용할 수 없어요</p>
        </div>

        <p className="text-gray-700 font-semibold text-xl mb-6">
          {step === 'new' ? '새 PIN 4자리를 입력하세요' : '한 번 더 입력하세요'}
        </p>

        <div className="flex gap-6 mb-6">
          {[0,1,2,3].map(i => (
            <div key={i} className={`w-6 h-6 rounded-full transition-colors
              ${i < dots.length ? 'bg-gray-800' : 'bg-gray-300'}`} />
          ))}
        </div>

        {error && <p className="text-red-500 mb-4 text-center">{error}</p>}

        <div className="grid grid-cols-3 gap-4 max-w-xs mx-auto">
          {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((key, i) => {
            if (key === '') return <div key={i} />
            return (
              <button key={i}
                onClick={() => key === '⌫' ? handleDelete() : handleDigit(key)}
                disabled={loading}
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
      </div>
    </div>
  )
}
