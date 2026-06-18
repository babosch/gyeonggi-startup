'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { introSlides } from '@/lib/intro'
import { cityTheme, type Role } from '@/lib/types'

export default function IntroSlides({ role, color }: { role: Role; color: string }) {
  const router = useRouter()
  const slides = introSlides(role)
  const [i, setI] = useState(0)
  const theme = cityTheme(color)

  async function finish() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) await supabase.from('users').update({ intro_seen: true }).eq('id', user.id)
    router.push('/home')
  }

  const slide = slides[i]
  const last = i === slides.length - 1

  return (
    <div className={`min-h-screen ${theme.solid} flex flex-col items-center justify-center p-8 text-white`}>
      <div className="max-w-md w-full text-center flex flex-col items-center gap-6">
        <div className="text-7xl">{slide.emoji}</div>
        <h1 className="text-3xl font-bold leading-snug">{slide.title}</h1>
        <p className="text-lg leading-relaxed opacity-95">{slide.body}</p>

        {/* 진행 점 */}
        <div className="flex gap-2 mt-2">
          {slides.map((_, idx) => (
            <div key={idx} className={`w-2.5 h-2.5 rounded-full transition-all
              ${idx === i ? 'bg-white w-6' : 'bg-white/40'}`} />
          ))}
        </div>

        <div className="flex gap-3 w-full mt-4">
          {!last && (
            <button onClick={finish} className="flex-1 bg-white/20 rounded-2xl py-4 font-bold text-lg">
              건너뛰기
            </button>
          )}
          <button onClick={() => last ? finish() : setI(i + 1)}
            className="flex-1 bg-white rounded-2xl py-4 font-bold text-lg active:scale-95 transition-transform"
            style={{ color: 'inherit' }}>
            <span className={theme.accent}>{last ? '시작하기 🎉' : '다음 →'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
