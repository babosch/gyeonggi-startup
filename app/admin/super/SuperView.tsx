'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cityTheme } from '@/lib/types'

interface ClassRow { id: string; name: string; color: string; mayorId: string | null; mayorEmail: string | null }
interface Orphan { id: string; email: string; registered: boolean }

export default function SuperView({ classRows, orphanAccounts }: {
  classRows: ClassRow[]; orphanAccounts: Orphan[]
}) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [rows, setRows] = useState(classRows)
  const [orphans, setOrphans] = useState(orphanAccounts)

  async function removeMayor(classId: string, name: string) {
    if (!confirm(`${name}의 시장을 해제할까요? (학생·회사 데이터는 그대로 남아요)`)) return
    setBusy(classId)
    const res = await fetch('/api/admin/super', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove_mayor', classId }),
    })
    setBusy(null)
    if (res.ok) setRows(rows.map(r => r.id === classId ? { ...r, mayorId: null, mayorEmail: null } : r))
    else alert('해제에 실패했어요.')
  }

  async function deleteAccount(userId: string, email: string) {
    if (!confirm(`${email} 계정을 완전히 삭제할까요? 되돌릴 수 없어요.`)) return
    setBusy(userId)
    const res = await fetch('/api/admin/super', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_account', userId }),
    })
    const d = await res.json()
    setBusy(null)
    if (res.ok) {
      setOrphans(orphans.filter(o => o.id !== userId))
      setRows(rows.map(r => r.mayorId === userId ? { ...r, mayorId: null, mayorEmail: null } : r))
    } else alert(d.message ?? '삭제에 실패했어요.')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-3xl mx-auto">
        <button onClick={() => router.push('/admin')} className="text-gray-400 text-sm mb-4">← 관리자 홈</button>
        <h1 className="text-2xl font-bold text-gray-800 mb-1">🛡️ 슈퍼어드민</h1>
        <p className="text-gray-500 text-sm mb-6">잘못 등록된 시장·계정을 정리해요</p>

        {/* 반별 시장 현황 */}
        <div className="bg-white rounded-3xl p-6 shadow-sm mb-4">
          <div className="font-bold text-gray-800 mb-3">반별 시장 현황</div>
          <div className="flex flex-col gap-2">
            {rows.map(r => {
              const theme = cityTheme(r.color)
              return (
                <div key={r.id} className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className={`w-3 h-3 rounded-full ${theme.solid}`} />
                    <span className="font-medium text-gray-800">{r.name}</span>
                    {r.mayorEmail
                      ? <span className="text-sm text-gray-500">{r.mayorEmail}</span>
                      : <span className="text-sm text-gray-300">시장 없음</span>}
                  </div>
                  {r.mayorId && (
                    <button onClick={() => removeMayor(r.id, r.name)} disabled={busy === r.id}
                      className="text-sm px-4 py-1.5 rounded-xl border-2 border-red-200 text-red-500 font-medium disabled:opacity-40">
                      {busy === r.id ? '...' : '시장 해제'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* 교사 계정 */}
        <div className="bg-white rounded-3xl p-6 shadow-sm">
          <div className="font-bold text-gray-800 mb-1">교사 계정</div>
          <p className="text-xs text-gray-400 mb-3">미배정 계정은 정리할 수 있어요 (학생 계정은 보호됨)</p>
          {orphans.length === 0 ? (
            <p className="text-gray-400 text-sm">교사 계정이 없어요.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {orphans.map(o => (
                <div key={o.id} className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-3">
                  <div>
                    <span className="font-medium text-gray-800">{o.email}</span>
                    <span className={`text-xs ml-2 px-2 py-0.5 rounded-full ${o.registered ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'}`}>
                      {o.registered ? '시장 등록됨' : '미배정'}
                    </span>
                  </div>
                  <button onClick={() => deleteAccount(o.id, o.email)} disabled={busy === o.id}
                    className="text-sm px-4 py-1.5 rounded-xl border-2 border-red-200 text-red-500 font-medium disabled:opacity-40">
                    {busy === o.id ? '...' : '계정 삭제'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
