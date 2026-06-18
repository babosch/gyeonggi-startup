import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import QuizRunner from './QuizRunner'
import { quizForStage } from '@/lib/quiz'
import type { Stage } from '@/lib/types'

export default async function QuizPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('users').select('classes(stage)').eq('id', user.id).single()
  const cls = (Array.isArray(me?.classes) ? me?.classes[0] : me?.classes) as { stage: Stage } | undefined
  const quiz = quizForStage(cls?.stage ?? 0)

  // 이미 친 회차인지
  const { data: done } = await supabase
    .from('concept_responses').select('id').eq('user_id', user.id).eq('kind', quiz.kind).limit(1).maybeSingle()

  return <QuizRunner quiz={quiz} alreadyDone={!!done} stage={cls?.stage ?? 0} />
}
