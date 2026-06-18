'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PageShell from '@/components/PageShell'
import type { Stage } from '@/lib/types'

const MOODS = ['😄', '🙂', '😐', '😟', '😢']

export default function ReflectForm({ stage, past }: {
  stage: Stage; past: { answer: string; mood: string | null; created_at: string }[]
}) {
  const router = useRouter()
  const [answer, setAnswer] = useState('')
  const [mood, setMood] = useState('🙂')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function submit() {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('reflections').insert({
      user_id: user!.id, stage, prompt: '오늘 배우거나 느낀 점', answer, mood,
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => router.push('/home'), 1000)
  }

  return (
    <PageShell title="성찰" emoji="💭">
      <div className="bg-white rounded-3xl p-6 shadow-sm flex flex-col gap-5">
        <div>
          <label className="block font-medium text-gray-700 mb-2">오늘 기분은 어때요?</label>
          <div className="flex gap-2 justify-between">
            {MOODS.map(m => (
              <button key={m} onClick={() => setMood(m)}
                className={`text-3xl p-2 rounded-2xl flex-1 transition-all active:scale-95
                  ${mood === m ? 'bg-blue-100 scale-110' : 'bg-gray-50'}`}>
                {m}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block font-medium text-gray-700 mb-2">오늘 배우거나 느낀 점을 적어요</label>
          <textarea value={answer} onChange={e => setAnswer(e.target.value)} rows={3} maxLength={200}
            placeholder="한 줄이라도 좋아요"
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-base focus:border-blue-400 outline-none resize-none" />
        </div>

        <button onClick={submit} disabled={saving || saved || !answer}
          className="bg-blue-500 text-white rounded-2xl py-4 font-bold text-lg disabled:opacity-40 active:scale-95 transition-transform">
          {saved ? '✓ 보냈어요!' : saving ? '...' : '오늘 성찰 보내기'}
        </button>
      </div>

      {past.length > 0 && (
        <div className="bg-white rounded-3xl p-6 shadow-sm mt-4">
          <div className="font-bold text-gray-800 mb-3">지난 성찰</div>
          <div className="flex flex-col gap-2">
            {past.map((p, i) => (
              <div key={i} className="flex items-start gap-2 text-sm border-b border-gray-100 pb-2 last:border-0">
                <span className="text-lg">{p.mood ?? '🙂'}</span>
                <span className="text-gray-600 flex-1">{p.answer}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </PageShell>
  )
}
