'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { ClassRow } from '@/lib/types'

export default function AdminSetupPage() {
  const router = useRouter()
  const supabase = createClient()

  const [classes, setClasses] = useState<ClassRow[]>([])
  const [selectedClassId, setSelectedClassId] = useState('')
  const [studentCount, setStudentCount] = useState(25)
  const [loading, setLoading] = useState(false)
  const [mayorLoading, setMayorLoading] = useState(false)
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null)
  const [mayorDone, setMayorDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.from('classes').select('*').order('name').then(({ data }) => {
      if (data) setClasses(data as ClassRow[])
    })
  }, [])

  async function registerAsMayor() {
    if (!selectedClassId) return
    setMayorLoading(true)
    setError('')
    const res = await fetch('/api/admin/register-mayor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classId: selectedClassId }),
    })
    const data = await res.json()
    if (res.ok) {
      setMayorDone(true)
    } else {
      setError(`시장 등록 실패: ${data.error}`)
    }
    setMayorLoading(false)
  }

  async function createStudents() {
    if (!selectedClassId) return
    setLoading(true)
    setResult(null)
    setError('')
    const res = await fetch('/api/admin/create-students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classId: selectedClassId, count: studentCount }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(`계정 생성 실패: ${data.error}`)
    } else {
      setResult(data)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 max-w-md mx-auto">
      <button onClick={() => router.push('/admin')} className="text-gray-400 text-sm mb-6">
        ← 관리자 홈
      </button>
      <h1 className="text-xl font-bold text-gray-800 mb-2">반 초기 설정</h1>
      <p className="text-gray-500 text-sm mb-6">① 반 선택 → ② 시장 등록 → ③ 학생 계정 생성 순서로 진행하세요</p>

      <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">

        {/* 반 선택 */}
        <label className="block text-sm font-medium text-gray-600 mb-2">① 반 선택</label>
        <select value={selectedClassId}
          onChange={e => { setSelectedClassId(e.target.value); setMayorDone(false); setResult(null); setError('') }}
          className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:border-blue-400 outline-none">
          <option value="">반을 선택하세요</option>
          {classes.map(cls => (
            <option key={cls.id} value={cls.id}>{cls.name}</option>
          ))}
        </select>

        {/* 시장 등록 */}
        <label className="block text-sm font-medium text-gray-600 mt-6 mb-2">② 시장(교사) 등록</label>
        <button onClick={registerAsMayor}
          disabled={!selectedClassId || mayorDone || mayorLoading}
          className="w-full py-3 border-2 border-blue-400 text-blue-600 rounded-xl font-bold
            disabled:opacity-40 disabled:cursor-not-allowed">
          {mayorLoading ? '등록 중...' : mayorDone ? '✅ 시장으로 등록 완료' : '이 반의 시장(교사)으로 등록'}
        </button>

        {/* 학생 계정 생성 */}
        <label className="block text-sm font-medium text-gray-600 mt-6 mb-2">③ 학생 계정 일괄 생성</label>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-gray-600 text-sm whitespace-nowrap">학생 수</span>
          <input type="number" min={1} max={40} value={studentCount}
            onChange={e => setStudentCount(parseInt(e.target.value) || 25)}
            className="w-24 border-2 border-gray-200 rounded-xl px-3 py-2 text-gray-800 focus:border-blue-400 outline-none text-center" />
          <span className="text-gray-500 text-sm">명 (기본 PIN: 1234)</span>
        </div>

        <button onClick={createStudents}
          disabled={loading || !selectedClassId}
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold disabled:opacity-50">
          {loading ? '생성 중... (잠시 기다려주세요)' : `${studentCount}명 학생 계정 생성`}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {result && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <p className="font-bold text-gray-800 mb-3">생성 결과</p>
          <p className="text-green-600 font-medium">✅ 새로 생성: {result.created}명</p>
          {result.skipped > 0 &&
            <p className="text-gray-400 text-sm mt-1">⏭️ 이미 존재(스킵): {result.skipped}명</p>}
          {result.created > 0 && (
            <div className="mt-4 p-3 bg-green-50 rounded-xl text-sm text-green-700">
              학생들은 <strong>반 선택 → 번호 → PIN 1234</strong>로 로그인할 수 있습니다.
              첫 로그인 시 PIN을 변경해야 합니다.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
