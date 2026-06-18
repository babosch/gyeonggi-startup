'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PageShell from '@/components/PageShell'
import ConceptPopup from '@/components/ConceptPopup'
import type { Stage } from '@/lib/types'

export default function WorklogForm({ stage, role, past }: {
  stage: Stage; role: string; past: { payload: { text?: string }; created_at: string }[]
}) {
  const router = useRouter()
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [showConcept, setShowConcept] = useState(false)
  const firstEver = past.length === 0

  if (role !== 'staff' && role !== 'ceo' && role !== 'officer') {
    return <PageShell title="업무일지" emoji="📒">
      <div className="bg-white rounded-3xl p-8 text-center text-gray-500">직원·CEO·공무원만 사용해요.</div>
    </PageShell>
  }
  if (stage < 2) return <PageShell title="업무일지" emoji="📒" locked={{ opensAt: '생산' }}>{null}</PageShell>

  async function submit() {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data: u } = await supabase.from('users').select('class_id').eq('id', user!.id).single()
    await supabase.from('activity_logs').insert({
      user_id: user!.id, class_id: u!.class_id, action: 'worklog', payload: { text },
    })
    setSaving(false)
    if (firstEver) setShowConcept(true)
    else router.push('/home')
  }

  return (
    <PageShell title="업무일지" emoji="📒">
      <div className="bg-white rounded-3xl p-6 shadow-sm flex flex-col gap-4">
        <div>
          <label className="block font-medium text-gray-700 mb-2">오늘 한 일을 적어요</label>
          <textarea value={text} onChange={e => setText(e.target.value)} rows={4} maxLength={200}
            placeholder="예: 책갈피 10개를 코팅했어요"
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-base focus:border-blue-400 outline-none resize-none" />
        </div>
        <button onClick={submit} disabled={saving || !text}
          className="bg-blue-500 text-white rounded-2xl py-4 font-bold text-lg disabled:opacity-40 active:scale-95 transition-transform">
          {saving ? '...' : '오늘 일지 저장'}
        </button>
        <p className="text-xs text-gray-400 text-center">일지를 쓰면 CEO가 확인하고 급여를 줄 수 있어요</p>
      </div>

      {past.length > 0 && (
        <div className="bg-white rounded-3xl p-6 shadow-sm mt-4">
          <div className="font-bold text-gray-800 mb-3">지난 일지</div>
          {past.map((p, i) => (
            <div key={i} className="text-sm text-gray-600 border-b border-gray-100 py-2 last:border-0">
              📝 {p.payload?.text}
            </div>
          ))}
        </div>
      )}

      {showConcept && (
        <ConceptPopup kind="formative_work" stage={2}
          prompt="재료를 사서 물건을 만드는 활동을 무엇이라고 할까요?"
          options={['생산', '소비', '교환']} correct="생산"
          explanation="필요한 것을 만들어 내는 활동을 생산이라고 해요. 만든 물건을 쓰거나 사는 것은 소비예요."
          onClose={() => { setShowConcept(false); router.push('/home') }} />
      )}
    </PageShell>
  )
}
