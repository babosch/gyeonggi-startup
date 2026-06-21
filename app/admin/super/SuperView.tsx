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
  const [resetDone, setResetDone] = useState(false)
  const [codeFixed, setCodeFixed] = useState(false)

  async function fixClassCodes() {
    setBusy('fix')
    const res = await fetch('/api/admin/super', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'fix_class_codes' }),
    })
    setBusy(null)
    if (res.ok) { setCodeFixed(true); alert('반 코드 복구 완료! 이제 학급비번으로 로그인할 수 있어요.') }
    else alert('복구에 실패했어요.')
  }

  async function resetAllStudents() {
    if (!confirm('⚠️ 모든 반의 학생 데이터를 전체 초기화할까요?\n\n삭제되는 것: 학생 계정·역할·회사·잔액·거래·품의서·업무일지 등\n유지되는 것: 교사(시장) 계정, 반 목록\n\n되돌릴 수 없어요. 계속할까요?')) return
    if (!confirm('정말요? 한 번 더 확인합니다. 전체 학생 데이터가 삭제됩니다.')) return
    setBusy('reset')
    const res = await fetch('/api/admin/super', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset_all_students' }),
    })
    const d = await res.json()
    setBusy(null)
    if (res.ok) {
      setResetDone(true)
      alert(`초기화 완료! 학생 계정 ${d.deleted}개가 삭제됐어요. 모든 반이 0단계로 초기화됐습니다.`)
    } else {
      alert('초기화에 실패했어요: ' + (d.error ?? '알 수 없는 오류'))
    }
  }

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
        <p className="text-gray-500 text-sm mb-1">잘못 등록된 시장·계정을 정리해요</p>
        <p className="text-xs text-red-400 font-medium mb-6">⚠️ 이 메뉴는 개발자만 접근할 수 있습니다. 임의로 조작하지 마세요.</p>

        {/* 반 코드 복구 */}
        <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-6 shadow-sm mb-4">
          <div className="font-bold text-amber-700 mb-1">🔧 반 코드 복구</div>
          <p className="text-sm text-amber-600 mb-4">학급비번(숫자)으로 로그인이 안 될 때 실행하세요. 수원·이천·고양·부천·파주·시흥 코드를 올바르게 설정합니다.</p>
          {codeFixed ? (
            <div className="bg-green-100 text-green-700 rounded-2xl py-3 text-center font-bold text-sm">✅ 복구 완료</div>
          ) : (
            <button onClick={fixClassCodes} disabled={busy === 'fix'}
              className="w-full bg-amber-500 text-white rounded-2xl py-3 font-bold text-base disabled:opacity-40 active:scale-95 transition-transform">
              {busy === 'fix' ? '복구 중...' : '🔧 반 코드 복구 실행'}
            </button>
          )}
        </div>

        {/* 학생 데이터 전체 초기화 */}
        <div className="bg-red-50 border-2 border-red-200 rounded-3xl p-6 shadow-sm mb-4">
          <div className="font-bold text-red-700 mb-1">⚠️ 학생 데이터 전체 초기화</div>
          <p className="text-sm text-red-500 mb-4">모든 반의 학생 계정·역할·회사·잔액·거래 내역을 삭제하고 0단계로 되돌려요. 교사 계정은 유지됩니다. <strong>되돌릴 수 없어요.</strong></p>
          {resetDone ? (
            <div className="bg-green-100 text-green-700 rounded-2xl py-3 text-center font-bold text-sm">
              ✅ 초기화 완료 — 학생들이 새로 로그인하면 깨끗하게 시작해요
            </div>
          ) : (
            <button onClick={resetAllStudents} disabled={busy === 'reset'}
              className="w-full bg-red-500 text-white rounded-2xl py-3 font-bold text-base disabled:opacity-40 active:scale-95 transition-transform">
              {busy === 'reset' ? '초기화 중... (잠시 기다려주세요)' : '🗑️ 전체 초기화 실행'}
            </button>
          )}
        </div>

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
