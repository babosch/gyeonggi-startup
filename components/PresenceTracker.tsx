'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

// 학생 페이지에서 교사 모니터링 채널로 접속 상태를 broadcast한다.
// 교사(mayor)는 제외.
export default function PresenceTracker() {
  const pathname = usePathname()
  const channelRef = useRef<RealtimeChannel | null>(null)
  const userInfoRef = useRef<{ userId: string; nickname: string } | null>(null)
  const supabaseRef = useRef(createClient())

  useEffect(() => {
    const supabase = supabaseRef.current

    const doInit = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: me } = await supabase
        .from('users').select('role, class_id, nickname, number')
        .eq('id', user.id).single()

      // 교사(mayor)는 presence를 broadcast하지 않는다
      if (!me || me.role === 'mayor' || !me.class_id) return

      const nick = me.nickname ?? `${me.number}번`
      userInfoRef.current = { userId: user.id, nickname: nick }

      const ch = supabase.channel(`monitor:${me.class_id}`)
      channelRef.current = ch

      const trackNow = () => {
        ch.track({
          userId: user.id,
          nickname: nick,
          role: me.role,
          page: window.location.pathname,
          hidden: document.hidden,
        })
      }

      ch.subscribe(status => {
        if (status === 'SUBSCRIBED') trackNow()
      })

      const onVisibility = () => trackNow()
      document.addEventListener('visibilitychange', onVisibility)
      return () => document.removeEventListener('visibilitychange', onVisibility)
    }

    let cleanup: (() => void) | undefined
    doInit().then(fn => { cleanup = fn })

    return () => {
      cleanup?.()
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [])

  // 페이지 이동 시 page 경로 업데이트
  useEffect(() => {
    if (!channelRef.current || !userInfoRef.current) return
    channelRef.current.track({
      ...userInfoRef.current,
      page: pathname,
      hidden: document.hidden,
    })
  }, [pathname])

  return null
}
