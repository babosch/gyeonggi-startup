'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ACTIVITIES, ACTIVITY_BY_KEY } from '@/lib/activities'
import { ROLE_INFO, STAGE_SHORT, type Role, type Stage } from '@/lib/types'

const STAGE_GROUPS: Stage[] = [0, 1, 2, 3, 4]

// 교사 수업 보드: 활동 켜기/끄기 + 드래그로 순서 배열.
// 변경 즉시 classes.open_activities 저장 → 학생 화면 실시간 반영.
// open은 부모(useStage 실시간)에서 내려오며, 단계 변경 등 외부 변경도 반영한다.
export default function ActivityBoard({ classId, open: openProp }: { classId: string; open: string[] }) {
  const [open, setOpen] = useState<string[]>(openProp)
  const [saving, setSaving] = useState(false)
  const dragFrom = useRef<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)

  // 외부(단계 변경 등)로 open_activities가 바뀌면 동기화
  useEffect(() => { setOpen(openProp) }, [openProp])

  const closed = ACTIVITIES.filter(a => !open.includes(a.key))

  async function persist(next: string[]) {
    setOpen(next)
    setSaving(true)
    const supabase = createClient()
    await supabase.from('classes').update({ open_activities: next }).eq('id', classId)
    setSaving(false)
  }

  function addActivity(key: string) { persist([...open, key]) }
  function removeActivity(key: string) { persist(open.filter(k => k !== key)) }

  function onDrop(to: number) {
    const from = dragFrom.current
    dragFrom.current = null
    setDragOver(null)
    if (from === null || from === to) return
    const next = [...open]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    persist(next)
  }

  function rolesText(roles: Role[]) {
    if (roles.length >= 4) return '전원'
    return roles.map(r => ROLE_INFO[r].label).join('·')
  }

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-bold text-gray-800">📋 수업 보드</div>
          <p className="text-xs text-gray-400 mt-0.5">학생에게 보여줄 활동을 켜고, 드래그로 순서를 정해요</p>
        </div>
        {saving && <span className="text-xs text-blue-400">저장 중…</span>}
      </div>

      {/* 열린 활동 — 드래그 순서 */}
      <div>
        <div className="text-sm font-medium text-gray-600 mb-2">지금 열린 활동 (위에서부터 학생에게 보여요)</div>
        {open.length === 0 ? (
          <div className="bg-gray-50 rounded-2xl p-5 text-center text-gray-400 text-sm">
            아직 연 활동이 없어요. 아래에서 추가하세요.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {open.map((key, i) => {
              const a = ACTIVITY_BY_KEY[key]
              if (!a) return null
              return (
                <div key={key} draggable
                  onDragStart={() => { dragFrom.current = i }}
                  onDragOver={e => { e.preventDefault(); setDragOver(i) }}
                  onDrop={() => onDrop(i)}
                  onDragEnd={() => { dragFrom.current = null; setDragOver(null) }}
                  className={`flex items-center gap-3 bg-blue-50 border-2 rounded-2xl px-4 py-3 cursor-grab active:cursor-grabbing
                    ${dragOver === i ? 'border-blue-400' : 'border-blue-100'}`}>
                  <span className="text-gray-400 text-lg select-none">⠿</span>
                  <span className="text-xl">{a.emoji}</span>
                  <div className="flex-1">
                    <div className="font-bold text-blue-800 text-sm">{i + 1}. {a.label}</div>
                    <div className="text-xs text-blue-500">{rolesText(a.roles)}</div>
                  </div>
                  <button onClick={() => removeActivity(key)}
                    className="text-red-400 text-sm px-2 py-1 rounded-lg hover:bg-red-50">끄기</button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 닫힌 활동 — 단계별로 묶어서, 클릭해서 추가 */}
      {closed.length > 0 && (
        <div>
          <div className="text-sm font-medium text-gray-600 mb-2">추가할 수 있는 활동</div>
          <div className="flex flex-col gap-3">
            {STAGE_GROUPS.map(st => {
              const group = closed.filter(a => a.stage === st)
              if (group.length === 0) return null
              return (
                <div key={st}>
                  <div className="text-xs font-bold text-gray-400 mb-1.5">{st} {STAGE_SHORT[st]} 단계</div>
                  <div className="flex flex-wrap gap-2">
                    {group.map(a => (
                      <button key={a.key} onClick={() => addActivity(a.key)}
                        className="flex items-center gap-1.5 bg-gray-50 border-2 border-gray-200 rounded-full px-3 py-2
                          text-sm font-medium text-gray-600 hover:border-blue-400 active:scale-95 transition-all">
                        <span>{a.emoji}</span>{a.label}
                        <span className="text-xs text-gray-400">+</span>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
