'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Stage } from '@/lib/types'

// 반의 현재 단계를 실시간으로 구독한다.
// 교사가 단계를 바꾸면 모든 학생 화면이 즉시 갱신된다.
export function useStage(classId: string, initialStage: Stage) {
  const [stage, setStage] = useState<Stage>(initialStage)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`class-${classId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'classes', filter: `id=eq.${classId}` },
        (payload) => {
          const next = payload.new as { stage: Stage; paused: boolean }
          setStage(next.stage)
          setPaused(next.paused)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [classId])

  return { stage, paused }
}
