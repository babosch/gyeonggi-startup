import { redirect } from 'next/navigation'

// 루트 진입 → 홈으로. (미들웨어가 인증을 처리: 미로그인이면 /login)
export default function Index() {
  redirect('/home')
}
