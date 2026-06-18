import type { Stage } from '@/lib/types'

export interface QuizQ {
  prompt: string
  options: string[]
  correct: string
}

export interface QuizSet {
  kind: 'quiz_1' | 'quiz_2' | 'quiz_final'
  title: string
  questions: QuizQ[]
}

// 쪽지시험 3회 (사양서 5-12)
export const QUIZZES: QuizSet[] = [
  {
    kind: 'quiz_1', title: '1차 쪽지시험 — 경제활동·희소성',
    questions: [
      { prompt: '사람들이 살아가며 필요한 것을 만들고, 사고, 쓰는 모든 활동은?', options: ['경제활동', '운동', '놀이'], correct: '경제활동' },
      { prompt: '원하는 것은 많지만 자원이 부족한 상태는?', options: ['희소성', '풍요', '낭비'], correct: '희소성' },
      { prompt: '여러 개 중 하나를 고를 때 포기한 것의 가치는?', options: ['기회비용', '이익', '용돈'], correct: '기회비용' },
      { prompt: '값·필요·품질을 잘 따져 고르는 것은?', options: ['합리적 선택', '충동구매', '낭비'], correct: '합리적 선택' },
      { prompt: '특정 지역이 특히 잘 만드는 것은?', options: ['특산품', '수입품', '쓰레기'], correct: '특산품' },
    ],
  },
  {
    kind: 'quiz_2', title: '2차 쪽지시험 — 생산·소비·교류',
    questions: [
      { prompt: '재료로 물건을 만들어 내는 활동은?', options: ['생산', '소비', '저축'], correct: '생산' },
      { prompt: '만든 물건을 사거나 쓰는 활동은?', options: ['소비', '생산', '교류'], correct: '소비' },
      { prompt: '일을 하고 그 대가로 받는 돈은?', options: ['급여', '벌금', '세금'], correct: '급여' },
      { prompt: '없는 것을 다른 지역과 주고받는 것은?', options: ['교류', '생산', '낭비'], correct: '교류' },
      { prompt: '지역끼리 서로 도우며 의지하는 것은?', options: ['상호의존', '경쟁', '독립'], correct: '상호의존' },
    ],
  },
  {
    kind: 'quiz_final', title: '최종 쪽지시험 — 전체 통합',
    questions: [
      { prompt: '자원이 한정되어 있어 모두 가질 수 없는 것은?', options: ['희소성', '풍요', '공짜'], correct: '희소성' },
      { prompt: '현명하게 따져 고르는 것은?', options: ['합리적 선택', '충동구매', '낭비'], correct: '합리적 선택' },
      { prompt: '물건을 만드는 활동은?', options: ['생산', '소비', '교류'], correct: '생산' },
      { prompt: '지역끼리 주고받으며 함께 발전하는 것은?', options: ['상호의존', '경쟁', '고립'], correct: '상호의존' },
      { prompt: '값·필요를 따져 현명하게 사는 소비는?', options: ['합리적 소비', '충동 소비', '과소비'], correct: '합리적 소비' },
    ],
  },
]

// 현재 단계에 맞는 쪽지시험 회차
export function quizForStage(stage: Stage): QuizSet {
  if (stage <= 1) return QUIZZES[0]
  if (stage <= 3) return QUIZZES[1]
  return QUIZZES[2]
}
