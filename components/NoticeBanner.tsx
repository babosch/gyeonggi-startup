'use client'

import { useState } from 'react'

interface Notice {
  id: string
  title: string
  body: string
  created_at: string
}

// 교사가 '학생 공개'로 표시한 공통사항을 학생 홈 상단에 띄우는 공지 배너.
export default function NoticeBanner({ notices }: { notices: Notice[] }) {
  const [openId, setOpenId] = useState<string | null>(notices[0]?.id ?? null)
  if (notices.length === 0) return null

  return (
    <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-lg">📢</span>
        <span className="font-bold text-amber-800">선생님 공지</span>
        {notices.length > 1 && (
          <span className="text-xs bg-amber-200 text-amber-800 font-bold rounded-full px-2 py-0.5">
            {notices.length}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        {notices.map(n => {
          const open = openId === n.id
          return (
            <div key={n.id} className="bg-white rounded-2xl border border-amber-100 overflow-hidden">
              <button onClick={() => setOpenId(open ? null : n.id)}
                className="w-full flex items-center justify-between px-4 py-3 text-left">
                <span className="font-bold text-gray-800 text-sm">{n.title}</span>
                <span className="text-amber-400 text-sm shrink-0 ml-2">{open ? '▲' : '▼'}</span>
              </button>
              {open && (
                <div className="px-4 pb-3 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {n.body}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
