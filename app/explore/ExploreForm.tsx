'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PageShell from '@/components/PageShell'
import ConceptPopup from '@/components/ConceptPopup'
import FeedbackBanner from '@/components/FeedbackBanner'
import { CITIES } from '@/lib/cities'
import type { Stage } from '@/lib/types'

interface Research {
  map_selected: boolean
  specialties: string | null
  strengths: string | null
  oneliner: string | null
  feedback?: string | null
}

export default function ExploreForm({
  classCode, cityName, color, stage, existing,
}: {
  classCode: string; cityName: string; color: string; stage: Stage; existing: Research | null
}) {
  const router = useRouter()
  const supabase = createClient()

  // 보드로 열려 있는 동안은 항상 편집 가능 (미완 학생이 이어서 마무리)
  const readOnly = false
  const [mapDone, setMapDone] = useState(existing?.map_selected ?? false)
  const [wrongAt, setWrongAt] = useState<string | null>(null)
  const [specialties, setSpecialties] = useState(existing?.specialties ?? '')
  const [strengths, setStrengths] = useState(existing?.strengths ?? '')
  const [oneliner, setOneliner] = useState(existing?.oneliner ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showConcept, setShowConcept] = useState(false)

  function pickCity(code: string) {
    if (readOnly || mapDone) return
    if (code === classCode) {
      setMapDone(true)
      setWrongAt(null)
    } else {
      setWrongAt(code)
      setTimeout(() => setWrongAt(null), 1500)
    }
  }

  async function submit() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('city_research').upsert({
      user_id: user!.id,
      class_id: (await supabase.from('users').select('class_id').eq('id', user!.id).single()).data!.class_id,
      map_selected: true,
      specialties, strengths, oneliner,
    }, { onConflict: 'user_id' })
    setSaving(false)
    setSaved(true)
    if (!existing) setShowConcept(true)  // 첫 제출 시 형성평가
  }

  return (
    <PageShell title="도시 탐구" emoji="🗺️">
      <div className="flex flex-col gap-4">

        <FeedbackBanner feedback={existing?.feedback} />

        {/* 1. 우리 도시 찾기 */}
        <div className="bg-white rounded-3xl p-6 shadow-sm">
          <div className="font-bold text-gray-800 mb-1">① 우리 도시를 찾아요</div>
          <p className="text-sm text-gray-500 mb-4">경기도에서 <b>{cityName}</b>는 어디일까요?</p>
          <div className="relative bg-green-50 rounded-2xl h-64 border-2 border-green-100">
            {CITIES.map(c => {
              const isMine = c.code === classCode
              const correct = mapDone && isMine
              const wrong = wrongAt === c.code
              return (
                <button key={c.code}
                  onClick={() => pickCity(c.code)}
                  disabled={readOnly || mapDone}
                  style={{ left: `${c.x}%`, top: `${c.y}%` }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 px-3 py-2 rounded-xl font-bold text-sm
                    transition-all ${
                    correct ? 'bg-green-500 text-white scale-110' :
                    wrong ? 'bg-red-400 text-white animate-pulse' :
                    mapDone ? 'bg-white text-gray-400 border border-gray-200' :
                    'bg-white text-gray-700 border-2 border-gray-200 hover:border-green-400 active:scale-95'
                  }`}>
                  {mapDone && !isMine ? '도시' : c.name}
                </button>
              )
            })}
            {mapDone && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-green-500 text-white text-sm font-medium px-4 py-1.5 rounded-full">
                ✓ 우리 도시를 찾았어요!
              </div>
            )}
            {wrongAt && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-red-100 text-red-600 text-sm px-4 py-1.5 rounded-full">
                다시 생각해 봐요 (잠깐 기다리기)
              </div>
            )}
          </div>
        </div>

        {/* 2. 조사 입력 */}
        {mapDone && (
          <div className="bg-white rounded-3xl p-6 shadow-sm flex flex-col gap-4">
            <div className="font-bold text-gray-800">② 우리 도시를 조사해요</div>

            <Field label="🍙 우리 도시의 특산품·자원은?" value={specialties}
              onChange={setSpecialties} readOnly={readOnly} placeholder="예: 도자기, 쌀" />
            <Field label="💪 우리 도시의 자랑·강점은?" value={strengths}
              onChange={setStrengths} readOnly={readOnly} placeholder="예: 깨끗한 자연" />
            <Field label="✏️ 우리 도시 한 줄 소개" value={oneliner}
              onChange={setOneliner} readOnly={readOnly} placeholder="예: 도자기로 유명한 도시" />

            {!readOnly && (
              <button onClick={submit} disabled={saving || !specialties || !strengths || !oneliner}
                className="bg-green-500 text-white rounded-2xl py-4 font-bold text-lg disabled:opacity-40 active:scale-95 transition-transform">
                {saving ? '저장 중...' : saved ? '✓ 저장됐어요! 다시 저장' : '조사 내용 저장하기'}
              </button>
            )}
            {readOnly && (
              <p className="text-center text-gray-400 text-sm">탐구 단계가 끝나 읽기만 할 수 있어요</p>
            )}
            {saved && !showConcept && (
              <p className="text-center text-green-600 font-medium">저장됐어요! 👍</p>
            )}
          </div>
        )}
      </div>

      {showConcept && (
        <ConceptPopup
          kind="formative_research"
          stage={0}
          prompt="특정 지역이 특히 잘 만들거나 많이 나는 것을 무엇이라고 할까요?"
          options={['특산품', '수입품', '공산품']}
          correct="특산품"
          explanation="맞아요! 지역마다 자연환경과 기술이 달라 특별히 잘 만드는 것이 있어요. 그것을 특산품이라고 해요."
          onClose={() => { setShowConcept(false); router.push('/home') }}
        />
      )}
    </PageShell>
  )
}

function Field({ label, value, onChange, readOnly, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; readOnly: boolean; placeholder: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 mb-1.5">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} readOnly={readOnly}
        placeholder={placeholder} maxLength={40}
        className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-base
          focus:border-green-400 outline-none read-only:bg-gray-50 read-only:text-gray-500" />
    </div>
  )
}
