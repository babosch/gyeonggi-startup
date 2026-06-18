'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Stage } from '@/lib/types'

interface Props {
  kind: string
  stage: Stage
  prompt: string
  options: string[]
  correct: string
  explanation: string
  onClose: () => void
}

// 개념 정착 팝업 — 형성평가/micro-concept 공용.
// 답을 고르면 정답 확인 + 짧은 설명, 틀려도 막지 않고 재시도 1회.
export default function ConceptPopup({ kind, stage, prompt, options, correct, explanation, onClose }: Props) {
  const [picked, setPicked] = useState<string | null>(null)
  const [attempts, setAttempts] = useState(0)
  const [done, setDone] = useState(false)

  const isCorrect = picked === correct

  async function pick(opt: string) {
    if (done) return
    setPicked(opt)
    const nextAttempts = attempts + 1
    setAttempts(nextAttempts)
    const right = opt === correct

    if (right || nextAttempts >= 2) {
      setDone(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: u } = await supabase.from('users').select('class_id').eq('id', user.id).single()
        await supabase.from('concept_responses').insert({
          user_id: user.id, class_id: u?.class_id, stage, kind,
          prompt, answer: opt, is_correct: right, attempts: nextAttempts,
        })
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl p-7 w-full max-w-md shadow-xl">
        <div className="text-center mb-5">
          <div className="text-3xl mb-2">💡</div>
          <p className="text-lg font-bold text-gray-800">{prompt}</p>
        </div>

        <div className="flex flex-col gap-2.5">
          {options.map(opt => {
            const chosen = picked === opt
            let cls = 'bg-gray-50 border-gray-200 text-gray-700 hover:border-blue-400'
            if (done && opt === correct) cls = 'bg-green-50 border-green-400 text-green-700'
            else if (chosen && !isCorrect) cls = 'bg-red-50 border-red-400 text-red-600'
            return (
              <button key={opt} onClick={() => pick(opt)} disabled={done}
                className={`border-2 rounded-2xl py-3.5 font-bold text-base transition-all active:scale-95 ${cls}`}>
                {opt}
              </button>
            )
          })}
        </div>

        {picked && !isCorrect && !done && (
          <p className="text-center text-red-500 text-sm mt-4">다시 한 번 골라볼까요?</p>
        )}

        {done && (
          <div className="mt-5">
            <div className={`rounded-2xl p-4 text-sm ${isCorrect ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>
              {isCorrect ? '🎉 정답이에요! ' : '알려줄게요 — '}{explanation}
            </div>
            <button onClick={onClose}
              className="w-full mt-4 bg-blue-500 text-white rounded-2xl py-3.5 font-bold active:scale-95 transition-transform">
              다음
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
