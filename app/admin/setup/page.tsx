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
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null)
  const [mayorSetup, setMayorSetup] = useState<Record<string, boolean>>({})

  useEffect(() => {
    supabase.from('classes').select('*').order('name').then(({ data }) => {
      if (data) setClasses(data as ClassRow[])
    })
  }, [])

  async function createStudents() {
    if (!selectedClassId) return
    setLoading(true)
    setResult(null)
    const res = await fetch('/api/admin/create-students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classId: selectedClassId, count: studentCount }),
    })
    const data = await res.json()
    setResult(data)
    setLoading(false)
  }

  async function registerAsMayor() {
    if (!selectedClassId) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const admin_res = await fetch('/api/admin/register-mayor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classId: selectedClassId }),
    })
    if (admin_res.ok) {
      setMayorSetup(prev => ({ ...prev, [selectedClassId]: true }))
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 max-w-md mx-auto">
      <button onClick={() => router.push('/admin')} className="text-gray-400 text-sm mb-6">
        ← 관리자 홈
      </button>
      <h1 className="text-xl font-bold text-gray-800 mb-6">학생 계정 일괄 생성</h1>

      <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
        <label className="block text-sm font-medium text-gray-600 mb-2">반 선택</label>
        <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)}
          className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:border-blue-400 outline-none">
          <option value="">반을 선택하세요</option>
          {classes.map(cls => (
            <option key={cls.id} value={cls.id}>{cls.name}</option>
          ))}
        </select>

        <label className="block text-sm font-medium text-gray-600 mt-4 mb-2">학생 수</label>
        <input type="number" min={1} max={40} value={studentCount}
          onChange={e => setStudentCount(parseInt(e.target.value) || 25)}
          className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:border-blue-400 outline-none" />

        <div className="mt-4 p-3 bg-blue-50 rounded-xl text-sm text-blue-700">
          기본 PIN: <strong>1234</strong> — 학생이 첫 로그인 시 반드시 변경해야 합니다.
        </div>

        <button onClick={registerAsMayor} disabled={!selectedClassId || mayorSetup[selectedClassId]}
          className="mt-4 w-full py-3 border-2 border-blue-400 text-blue-600 rounded-xl font-bold disabled:opacity-40">
          {mayorSetup[selectedClassId] ? '✅ 시장(교사)으로 등록됨' : '이 반의 시장(교사)으로 등록'}
        </button>

        <button onClick={createStudents}
          disabled={loading || !selectedClassId}
          className="mt-3 w-full py-3 bg-blue-600 text-white rounded-xl font-bold disabled:opacity-50">
          {loading ? '생성 중...' : `${studentCount}명 학생 계정 생성`}
        </button>
      </div>

      {result && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <p className="font-bold text-gray-800 mb-2">결과</p>
          <p className="text-green-600">✅ 새로 생성: {result.created}명</p>
          <p className="text-gray-400">⏭️ 이미 존재(스킵): {result.skipped}명</p>
        </div>
      )}
    </div>
  )
}
