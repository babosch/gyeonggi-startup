'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Stage } from '@/lib/types'

// 반의 단계·일시정지·열린 활동을 실시간으로 구독한다.
// 교사가 단계나 수업 보드를 바꾸면 모든 학생 화면이 즉시 갱신된다.
export function useStage(classId: string, initialStage: Stage, initialOpen: string[] = [], initialPaused = false, initialFair = false) {
  const [stage, setStage] = useState<Stage>(initialStage)
  const [paused, setPaused] = useState(initialPaused)
  const [fairMode, setFairMode] = useState(initialFair)
  const [openActivities, setOpenActivities] = useState<string[]>(initialOpen)

  // 서버에서 새 초기값이 내려오면(router.refresh 후) 상태 동기화
  useEffect(() => { setStage(initialStage) }, [initialStage])
  useEffect(() => { setPaused(initialPaused) }, [initialPaused])
  useEffect(() => { setFairMode(initialFair) }, [initialFair])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setOpenActivities(initialOpen) }, [JSON.stringify(initialOpen)])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`class-${classId}`)
      .on(
        'postgres_changes',
        // 서버 측 필터 없이 구독 — 필터 파싱 오류를 피하고 클라이언트에서 classId 검사
        { event: 'UPDATE', schema: 'public', table: 'classes' },
        (payload) => {
          if ((payload.new as { id: string }).id !== classId) return
          const next = payload.new as { stage: Stage; paused: boolean; fair_mode: boolean; open_activities: string[] }
          setStage(next.stage)
          setPaused(next.paused)
          setFairMode(next.fair_mode)
          setOpenActivities(next.open_activities ?? [])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [classId])

  return { stage, paused, fairMode, openActivities }
}
