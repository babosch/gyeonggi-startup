'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AdminSetupPage() {
  const router = useRouter()
  const supabase = createClient()

  const [className, setClassName] = useState('')
  const [classId, setClassId] = useState('')
  const [studentCount, setStudentCount] = useState(25)
  const [loading, setLoading] = useState(false)
  const [loadingClass, setLoadingClass] = useState(true)
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/admin/login'); return }

      const { data: me } = await supabase
        .from('users')
        .select('class_id, classes(name)')
        .eq('id', user.id)
        .single()

      if (me?.class_id) {
        setClassId(me.class_id)
        const cls = Array.isArray(me.classes) ? me.classes[0] : me.classes
        setClassName((cls as { name: string } | null)?.name ?? '')
      }
      setLoadingClass(false)
    }
    load()
  }, [])

  async function createStudents() {
    if (!classId) return
    setLoading(true)
    setResult(null)
    setError('')
    const res = await fetch('/api/admin/create-students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classId, count: studentCount }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(`계정 생성 실패: ${data.error}`)
    } else {
      setResult(data)
    }
    setLoading(false)
  }

  if (loadingClass) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-400">불러오는 중...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 p-6 max-w-md mx-auto">
      <button onClick={() => router.push('/admin')} className="text-gray-400 text-sm mb-6">
        ← 관리자 홈
      </button>
      <h1 className="text-xl font-bold text-gray-800 mb-1">학생 계정 생성</h1>
      <p className="text-gray-500 text-sm mb-6">
        <span className="font-semibold text-gray-700">{className}</span> 학생 계정을 일괄 생성합니다
      </p>

      <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
        <label className="block text-sm font-medium text-gray-600 mb-2">학생 수</label>
        <div className="flex items-center gap-3 mb-6">
          <input type="number" min={1} max={40} value={studentCount}
            onChange={e => setStudentCount(parseInt(e.target.value) || 25)}
            className="w-24 border-2 border-gray-200 rounded-xl px-3 py-2 text-gray-800
              focus:border-blue-400 outline-none text-center" />
          <span className="text-gray-500 text-sm">명 (기본 PIN: 1234)</span>
        </div>

        <button onClick={createStudents}
          disabled={loading || !classId}
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
