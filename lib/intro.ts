import type { Role } from '@/lib/types'

export interface Slide {
  emoji: string
  title: string
  body: string
}

// 공통 인트로 3장 (최초 로그인 시)
export const COMMON_INTRO: Slide[] = [
  { emoji: '🏙️', title: '경기도 5개 도시가 모였어요',
    body: '이천·부천·파주·수원·고양이 함께 경제 공동체를 만들기로 했어요. 서로 돕고 교류하며 발전한답니다.' },
  { emoji: '🚀', title: '창업 지원 프로그램 시작!',
    body: '우리 도시에서 멋진 회사를 만들 친구들을 찾고 있어요. 좋은 아이디어가 있다면 도전해 보세요.' },
  { emoji: '🎭', title: '이제 여러분의 차례예요',
    body: '여러분은 창업가(CEO), 직원, 공무원이 될 수 있어요. 지금부터 시작해 볼까요?' },
]

// 역할별 스토리 2장
export const ROLE_INTRO: Record<Role, Slide[]> = {
  applicant: [
    { emoji: '🙋', title: '창업 공고를 발견했어요',
      body: '회사를 만들고 싶다면 사업계획서를 써서 시장님께 제출하세요. 선정되면 CEO가 됩니다!' },
    { emoji: '📝', title: '좋은 계획서의 비밀',
      body: '우리 도시의 특산품을 활용하고, 누구에게 무엇을 팔지 분명하면 선정될 가능성이 높아요.' },
  ],
  ceo: [
    { emoji: '👑', title: 'CEO가 되었어요!',
      body: '회사를 세우고, 직원을 뽑고, 재료를 사서 상품을 만들어요. 지원금을 똑똑하게 써야 해요.' },
    { emoji: '💰', title: '경영자의 하루',
      body: '품의서로 물건을 사고, 직원에게 급여를 주고, 판매로 돈을 벌어요. 신중하게 결정하세요.' },
  ],
  staff: [
    { emoji: '🛠️', title: '직원이 되었어요!',
      body: '회사에서 상품을 만드는 중요한 일을 맡았어요. 매일 한 일을 업무일지에 기록해요.' },
    { emoji: '🛒', title: '일하고 받은 돈으로',
      body: '열심히 일하면 급여를 받아요. 그 돈으로 다른 회사의 좋은 상품을 살 수 있어요.' },
  ],
  officer: [
    { emoji: '📋', title: '공무원이 되었어요!',
      body: '도시의 살림을 맡았어요. 공용 시설을 관리하고, 회사들을 둘러보며 도와줘요.' },
    { emoji: '🚨', title: '도시를 살피는 눈',
      body: '예산이 부족한 회사에 경보를 전하고, 시찰 보고서를 써서 시장님께 알려줘요.' },
  ],
  mayor: [],
}

export function introSlides(role: Role): Slide[] {
  return [...COMMON_INTRO, ...(ROLE_INTRO[role] ?? ROLE_INTRO.applicant)]
}
