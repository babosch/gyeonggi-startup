import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { activityLocked } from '@/lib/guard'
import ActivityLocked from '@/components/ActivityLocked'
import QrCard from './QrCard'

export default async function CardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (await activityLocked('card')) return <ActivityLocked activityKey="card" />

  const { data: me } = await supabase
    .from('users').select('number, nickname, classes(name, color)').eq('id', user.id).single()
  if (!me) redirect('/home')

  const cls = (Array.isArray(me.classes) ? me.classes[0] : me.classes) as { name: string; color: string }
  const { data: acct } = await supabase
    .from('accounts').select('balance').eq('owner_type', 'user').eq('owner_id', user.id).maybeSingle()

  return (
    <QrCard
      userId={user.id} cityName={cls.name} color={cls.color}
      number={me.number} nickname={me.nickname} balance={acct?.balance ?? 0}
    />
  )
}
