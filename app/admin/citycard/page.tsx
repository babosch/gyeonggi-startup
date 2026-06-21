import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CityCardView from './CityCardView'

export default async function CityCardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: mayor } = await supabase
    .from('users').select('role, class_id, classes(name, color)').eq('id', user.id).single()
  if (!mayor || mayor.role !== 'mayor') redirect('/admin')

  const cls = (Array.isArray(mayor.classes) ? mayor.classes[0] : mayor.classes) as { name: string; color: string }

  // 반 학생 전체 도시탐구 데이터
  const { data: research } = await supabase
    .from('city_research')
    .select('user_id, specialties, strengths, oneliner, users(number, nickname)')
    .eq('class_id', mayor.class_id)
    .not('specialties', 'is', null)

  // 파싱하여 카테고리별 단어 목록 추출
  const specialties: string[] = []
  const resources: string[] = []
  const strengthWords: string[] = []
  const oneliners: string[] = []
  const studentCount = { submitted: 0 }

  for (const r of research ?? []) {
    studentCount.submitted++
    try {
      const sp = JSON.parse(r.specialties ?? '{}')
      if (sp.s) (sp.s as string[]).filter(Boolean).forEach(w => specialties.push(w.trim()))
      if (sp.r) (sp.r as string[]).filter(Boolean).forEach(w => resources.push(w.trim()))
    } catch {}
    try {
      const st = JSON.parse(r.strengths ?? '[]')
      if (Array.isArray(st)) st.filter(Boolean).forEach((w: string) => strengthWords.push(w.trim()))
    } catch {}
    if (r.oneliner?.trim()) oneliners.push(r.oneliner.trim())
  }

  return (
    <CityCardView
      cityName={cls.name}
      color={cls.color}
      submitted={studentCount.submitted}
      specialties={specialties}
      resources={resources}
      strengths={strengthWords}
      oneliners={oneliners}
    />
  )
}
