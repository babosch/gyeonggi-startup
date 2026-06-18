'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PageShell from '@/components/PageShell'
import type { QuizSet } from '@/lib/quiz'
import type { Stage } from '@/lib/types'

export default function QuizRunner({ quiz, alreadyDone, stage }: {
  quiz: QuizSet; alreadyDone: boolean; stage: Stage
}) {
  const router = useRouter()
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [correctCount, setCorrect] = useState(0)
  const [finished, setFinished] = useState(false)
  const [done, setDone] = useState(alreadyDone)

  if (done && !finished) {
    return (
      <PageShell title="쪽지시험" emoji="✏️">
        <div className="bg-white rounded-3xl p-8 text-center">
          <div className="text-5xl mb-3">✅</div>
          <p className="text-gray-700 font-medium">이번 쪽지시험은 이미 풀었어요!</p>
          <button onClick={() => router.push('/home')} className="mt-6 bg-blue-500 text-white rounded-2xl px-8 py-3 font-bold">집으로</button>
        </div>
      </PageShell>
    )
  }

  const q = quiz.questions[i]
  const last = i === quiz.questions.length - 1

  async function pick(opt: string) {
    if (picked) return
    setPicked(opt)
    const right = opt === q.correct
    if (right) setCorrect(c => c + 1)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: u } = await supabase.from('users').select('class_id').eq('id', user.id).single()
      await supabase.from('concept_responses').insert({
        user_id: user.id, class_id: u?.class_id, stage, kind: quiz.kind,
        prompt: q.prompt, answer: opt, is_correct: right, attempts: 1,
      })
    }
  }

  function next() {
    if (last) { setFinished(true); setDone(true) }
    else { setI(i + 1); setPicked(null) }
  }

  if (finished) {
    const total = quiz.questions.length
    return (
      <PageShell title="쪽지시험" emoji="✏️">
        <div className="bg-white rounded-3xl p-8 text-center">
          <div className="text-5xl mb-3">🎉</div>
          <p className="text-xl font-bold text-gray-800 mb-1">다 풀었어요!</p>
          <p className="text-gray-600 mb-1">{total}문제 중 <b className="text-blue-600">{correctCount}개</b> 이해했어요</p>
          <p className="text-sm text-gray-400 mb-6">점수가 아니라 얼마나 이해했는지 확인하는 거예요</p>
          <button onClick={() => router.push('/home')} className="bg-blue-500 text-white rounded-2xl px-8 py-3.5 font-bold w-full">집으로</button>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell title={quiz.title} emoji="✏️">
      <div className="bg-white rounded-3xl p-6 shadow-sm">
        <div className="flex gap-1.5 mb-5">
          {quiz.questions.map((_, idx) => (
            <div key={idx} className={`flex-1 h-2 rounded-full ${idx < i ? 'bg-blue-300' : idx === i ? 'bg-blue-500' : 'bg-gray-100'}`} />
          ))}
        </div>
        <p className="text-lg font-bold text-gray-800 mb-5">{i + 1}. {q.prompt}</p>
        <div className="flex flex-col gap-2.5">
          {q.options.map(opt => {
            const chosen = picked === opt
            let cls = 'bg-gray-50 border-gray-200 text-gray-700'
            if (picked) {
              if (opt === q.correct) cls = 'bg-green-50 border-green-400 text-green-700'
              else if (chosen) cls = 'bg-red-50 border-red-400 text-red-600'
            }
            return (
              <button key={opt} onClick={() => pick(opt)} disabled={!!picked}
                className={`border-2 rounded-2xl py-4 font-bold text-base transition-all active:scale-95 ${cls}`}>
                {opt}
              </button>
            )
          })}
        </div>
        {picked && (
          <button onClick={next} className="w-full mt-5 bg-blue-500 text-white rounded-2xl py-3.5 font-bold active:scale-95 transition-transform">
            {last ? '결과 보기' : '다음 문제'}
          </button>
        )}
      </div>
    </PageShell>
  )
}
