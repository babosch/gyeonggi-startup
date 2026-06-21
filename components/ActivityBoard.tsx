'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ACTIVITIES, ACTIVITY_BY_KEY, allActivitiesForStage, allActivitiesUpToStage } from '@/lib/activities'
import { ROLE_INFO, STAGE_SHORT, type Role, type Stage } from '@/lib/types'

export default function ActivityBoard({ classId, open: openProp, stage }: {
  classId: string; open: string[]; stage: Stage
}) {
  const [open, setOpen] = useState<string[]>(openProp)
  const [saving, setSaving] = useState(false)

  useEffect(() => { setOpen(openProp) }, [openProp])

  // 처음 열릴 때 open이 비어있으면 0~현재 단계 활동 자동 추가
  useEffect(() => {
    if (openProp.length === 0) {
      const defaults = allActivitiesUpToStage(stage)
      if (defaults.length > 0) persist(defaults)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const closed = ACTIVITIES.filter(a => !open.includes(a.key))
  const openActivities = open.map(k => ACTIVITY_BY_KEY[k]).filter(Boolean)

  async function persist(next: string[]) {
    setOpen(next)
    setSaving(true)
    const supabase = createClient()
    await supabase.from('classes').update({ open_activities: next }).eq('id', classId)
    setSaving(false)
  }

  function addActivity(key: string) { persist([...open, key]) }
  function removeActivity(key: string) { persist(open.filter(k => k !== key)) }

  function rolesText(roles: Role[]) {
    if (roles.length >= 4) return '전원'
    return roles.map(r => ROLE_INFO[r].label).join('·')
  }

  async function resetToStage() {
    persist(allActivitiesUpToStage(stage))
  }

  return (
    <div className="flex flex-col gap-2">
      {/* 현재 단계로 초기화 */}
      <div className="flex items-center justify-between">
        {saving && <span className="text-xs text-blue-400">저장 중…</span>}
        {!saving && <span />}
        <button onClick={resetToStage}
          className="text-xs text-orange-500 border border-orange-200 rounded-lg px-2.5 py-1 hover:bg-orange-50 active:scale-95 transition-all font-medium">
          🔄 현재 단계로 초기화
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* 왼쪽: 열린 활동 */}
        <div className="flex flex-col">
          <div className="bg-blue-50 border-2 border-blue-100 rounded-t-2xl px-3 py-2 flex items-center justify-between">
            <span className="text-xs font-bold text-blue-700">📌 열린 활동 (학생에게 보임)</span>
            <span className="text-xs bg-blue-200 text-blue-700 rounded-full px-2 py-0.5 font-bold">{open.length}</span>
          </div>
          <div className="border-2 border-blue-100 border-t-0 rounded-b-2xl p-2 min-h-[80px]">
            {openActivities.length === 0 ? (
              <div className="text-xs text-gray-400 text-center py-5">없음</div>
            ) : (
              <div className="grid grid-cols-2 gap-1.5">
                {openActivities.map(a => (
                  <button key={a.key} onClick={() => removeActivity(a.key)}
                    title="클릭해서 닫기"
                    className="relative bg-blue-50 border-2 border-blue-200 rounded-xl p-2 text-left
                      hover:bg-red-50 hover:border-red-200 active:scale-95 transition-all group">
                    <div className="text-lg mb-0.5">{a.emoji}</div>
                    <div className="text-[11px] font-bold text-blue-800 leading-tight">{a.label}</div>
                    <div className="text-[9px] text-blue-400 mt-0.5">{rolesText(a.roles)}</div>
                    <div className="absolute top-1 right-1.5 opacity-0 group-hover:opacity-100 text-red-400 text-xs font-black transition-opacity">✕</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="text-[10px] text-gray-400 text-center mt-1.5">클릭 → 닫기 (오른쪽으로)</div>
        </div>

        {/* 오른쪽: 닫힌 활동 */}
        <div className="flex flex-col">
          <div className="bg-gray-50 border-2 border-gray-200 rounded-t-2xl px-3 py-2 flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500">🔒 닫힌 활동 (학생 못 봄)</span>
            <span className="text-xs bg-gray-200 text-gray-500 rounded-full px-2 py-0.5 font-bold">{closed.length}</span>
          </div>
          <div className="border-2 border-gray-200 border-t-0 rounded-b-2xl p-2 min-h-[80px]">
            {closed.length === 0 ? (
              <div className="text-xs text-gray-400 text-center py-5">없음</div>
            ) : (
              <div className="grid grid-cols-2 gap-1.5">
                {closed.map(a => (
                  <button key={a.key} onClick={() => addActivity(a.key)}
                    title="클릭해서 열기"
                    className="relative bg-gray-50 border-2 border-gray-200 rounded-xl p-2 text-left
                      hover:bg-blue-50 hover:border-blue-300 active:scale-95 transition-all group">
                    <div className="text-lg mb-0.5 opacity-50">{a.emoji}</div>
                    <div className="text-[11px] font-bold text-gray-500 leading-tight">{a.label}</div>
                    <div className="text-[9px] text-gray-400 mt-0.5">{rolesText(a.roles)}</div>
                    <div className="absolute top-1 right-1 bg-gray-100 text-gray-400 text-[9px] font-bold rounded px-1">
                      {STAGE_SHORT[a.stage]}
                    </div>
                    <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 text-blue-500 text-xs font-black transition-opacity">+</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="text-[10px] text-gray-400 text-center mt-1.5">클릭 → 열기 (왼쪽으로)</div>
        </div>
      </div>
    </div>
  )
}
