// 4자리 PIN을 Supabase Auth 비밀번호로 변환한다.
// Supabase Auth는 최소 6자 비밀번호를 요구하므로 고정 접두사를 붙인다.
// 학생은 4자리 PIN만 입력하고, 변환은 앱이 처리한다.
export function pinToPassword(pin: string): string {
  return `gg_${pin}`
}

export const DEFAULT_PIN = '1234'
