'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { REFLECTION_TABS, type ReflectionTabId } from '@/lib/reflection'

export default function ReflectionStageControl({ classId, initialActiveTab }: {
  classId: string
  initialActiveTab: ReflectionTabId | null
}) {
  const [activeTab, setActiveTab] = useState<ReflectionTabId | null>(initialActiveTab)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => { setActiveTab(initialActiveTab) }, [initialActiveTab])

  useEffect(() => {
    const supabase = createClient()
    const ch = supabase.channel(`refl-pacing:${classId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'classes' }, (payload) => {
        const row = payload.new as { id: string; reflection_active_tab: ReflectionTabId | null }
        if (row.id !== classId) return
        setActiveTab(row.reflection_active_tab)
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [classId])

  async function setTab(tab: ReflectionTabId | null) {
    setSaving(tab ?? 'free')
    const supabase = createClient()
    await supabase.from('classes').update({ reflection_active_tab: tab }).eq('id', classId)
    setSaving(null)
  }

  return (
    <div className="bg-white rounded-3xl shadow-sm p-5">
      <div className="font-bold text-gray-800 mb-1">🪞 성찰 진행 통제</div>
      <p className="text-xs text-gray-400 mb-3">
        {activeTab
          ? '학생들은 지금 선택된 활동만 볼 수 있어요. 다른 번호를 누르면 전체 화면이 그쪽으로 넘어가요.'
          : '지금은 학생이 5개 활동을 자유롭게 오갈 수 있어요.'}
      </p>
      <div className="flex gap-1.5 mb-2">
        {REFLECTION_TABS.map((t, i) => (
          <button key={t.id} disabled={saving !== null} onClick={() => setTab(t.id)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50
              ${activeTab === t.id ? 'bg-teal-500 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
            <div className="text-sm">{i + 1}</div>
            <div className="mt-0.5 leading-tight">{t.name}</div>
          </button>
        ))}
      </div>
      <button disabled={saving !== null} onClick={() => setTab(null)}
        className={`w-full py-2 rounded-xl text-xs font-bold border-2 transition-all disabled:opacity-50
          ${activeTab === null ? 'border-teal-300 bg-teal-50 text-teal-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
        🔓 전체 활동 자유롭게 열기
      </button>
    </div>
  )
}
