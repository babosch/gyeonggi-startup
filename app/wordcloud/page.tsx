import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import WordCloudView from './WordCloudView'

export default async function WordCloudPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('users').select('role, class_id').eq('id', user.id).single()
  if (!me) redirect('/home')

  // 보이는 단어만 조회 (교사는 숨긴 것도 포함)
  const query = supabase
    .from('wordcloud_words')
    .select('id, word, hidden, user_id')
    .eq('class_id', me.class_id)

  const { data: words } = me.role === 'mayor'
    ? await query.order('created_at', { ascending: false })
    : await query.eq('hidden', false).order('created_at', { ascending: false })

  // 내가 이번에 제출한 단어 수 (오늘)
  const today = new Date().toISOString().slice(0, 10)
  const myCount = (words ?? []).filter(w => w.user_id === user.id).length

  return (
    <WordCloudView
      words={(words ?? []).map(w => ({ id: w.id, word: w.word, hidden: w.hidden }))}
      isMayor={me.role === 'mayor'}
      myWordCount={myCount}
    />
  )
}
