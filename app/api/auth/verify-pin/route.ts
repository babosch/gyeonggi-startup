import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const { userId, pin } = await req.json()

  if (!userId || !pin || typeof pin !== 'string' || pin.length !== 4) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: user, error } = await admin
    .from('users')
    .select('id, pin_hash, role, class_id, reveal_pending')
    .eq('id', userId)
    .single()

  if (error || !user) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const match = await bcrypt.compare(pin, user.pin_hash)
  if (!match) {
    return NextResponse.json({ error: 'wrong_pin' }, { status: 401 })
  }

  // Supabase custom token 발급 (service_role로 sign-in)
  const { data: session, error: signInErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: `user-${userId}@classroom.local`,
  })

  if (signInErr || !session) {
    return NextResponse.json({ error: 'session_error' }, { status: 500 })
  }

  return NextResponse.json({
    token: session.properties?.hashed_token ?? '',
    role: user.role,
    reveal_pending: user.reveal_pending,
  })
}
