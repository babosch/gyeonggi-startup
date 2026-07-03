// 업무일지 작성 전 답하는 개념 탐구 질문.
// 단계(생산2·교류3·판매4)마다 여러 질문을 두고, 학생의 그 단계 응답 수에 따라 순환한다.
// 각 질문에는 필수 낱말 1개(반드시 답에 포함) + 추천 낱말(선택) + 낱말 뜻이 붙는다.

export interface Inquiry {
  id: string
  stage: number
  conceptKey: string   // 개념 태그 (교사 개념별 열람용)
  question: string
  required: string     // 필수 낱말 (답에 꼭 포함)
  recommended: string[] // 추천 낱말 (선택)
}

// 낱말 뜻 (초4용 한 줄). 기존 퀴즈 해설과 같은 표현.
export const KEYWORD_DEFS: Record<string, string> = {
  '생산': '필요한 물건을 만들어 내는 것',
  '소비': '물건을 사거나 쓰는 것',
  '급여': '일한 대가로 받는 돈',
  '희소성': '원하는 건 많은데 자원이 부족한 것',
  '상호의존': '서로 도우며 의지하는 것',
  '교류': '없는 것을 서로 주고받는 것',
  '특산품': '그 지역이 특히 잘 만드는 것',
  '합리적': '값·필요를 잘 따져 고르는 것',
  '소비생활': '물건을 사고 쓰는 생활',
  '기회비용': '하나를 고르며 포기한 것의 가치',
  '경제활동': '만들고·사고·쓰는 모든 활동',
}

export const INQUIRIES: Record<number, Inquiry[]> = {
  2: [
    { id: 'prod-1', stage: 2, conceptKey: '생산', question: '내가 오늘 만든 물건은 누가, 왜 쓰게 될까?', required: '생산', recommended: ['소비'] },
    { id: 'prod-2', stage: 2, conceptKey: '급여', question: '아무리 일해도 급여가 없다면 어떤 일이 생길까?', required: '급여', recommended: [] },
    { id: 'prod-3', stage: 2, conceptKey: '희소성', question: '재료 살 돈은 정해져 있어요. 무엇을 먼저 사고 만들지 어떻게 정하면 좋을까?', required: '희소성', recommended: [] },
  ],
  3: [
    { id: 'exch-1', stage: 3, conceptKey: '상호의존', question: '우리 도시에 없는 걸 다른 도시에서 얻을 수 있어요. 도시들은 서로 어떤 사이라고 할 수 있을까?', required: '상호의존', recommended: ['교류'] },
    { id: 'exch-2', stage: 3, conceptKey: '교류', question: '서로 필요한 걸 주고받으면, 양쪽 도시에 각각 무엇이 좋아질까?', required: '교류', recommended: [] },
    { id: 'exch-3', stage: 3, conceptKey: '특산품', question: '도시마다 특히 잘 만드는 것이 다른 이유는 무엇일까?', required: '특산품', recommended: [] },
  ],
  4: [
    { id: 'sell-1', stage: 4, conceptKey: '합리적 소비', question: '물건을 살 때 무엇을 따져 봐야 후회하지 않는 똑똑한 소비일까?', required: '합리적', recommended: ['소비'] },
    { id: 'sell-2', stage: 4, conceptKey: '기회비용', question: '돈은 정해져 있어서 하나를 사면 다른 건 못 사요. 나는 무엇을 기준으로 고를까?', required: '기회비용', recommended: [] },
    { id: 'sell-3', stage: 4, conceptKey: '경제활동', question: '만들고·주고받고·사고팔며 지내보니, 경제활동은 결국 무엇일까?', required: '경제활동', recommended: [] },
  ],
}

export const INQUIRY_BY_ID: Record<string, Inquiry> =
  Object.fromEntries(Object.values(INQUIRIES).flat().map(q => [q.id, q]))

// 그 단계 응답 수(answered)에 따라 질문 순환. 탐구 없는 단계면 null.
export function inquiryForStage(stage: number, answered: number): Inquiry | null {
  const list = INQUIRIES[stage]
  if (!list || list.length === 0) return null
  return list[answered % list.length]
}

// 공백·대소문자 무시 포함 검사 (예: "경제 활동"도 "경제활동" 인정)
export function includesKeyword(answer: string, keyword: string): boolean {
  const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase()
  return norm(answer).includes(norm(keyword))
}
