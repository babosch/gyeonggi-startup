'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Stage } from '@/lib/types'

// 반의 단계·일시정지·열린 활동을 실시간으로 구독한다.
// 교사가 단계나 수업 보드를 바꾸면 모든 학생 화면이 즉시 갱신된다.
export function useStage(classId: string, initialStage: Stage, initialOpen: string[] = [], initialPaused = false) {
  const [stage, setStage] = useState<Stage>(initialStage)
  const [paused, setPaused] = useState(initialPaused)
  const [openActivities, setOpenActivities] = useState<string[]>(initialOpen)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`class-${classId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'classes', filter: `id=eq.${classId}` },
        (payload) => {
          const next = payload.new as { stage: Stage; paused: boolean; open_activities: string[] }
          setStage(next.stage)
          setPaused(next.paused)
          setOpenActivities(next.open_activities ?? [])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [classId])

  return { stage, paused, openActivities }
}
