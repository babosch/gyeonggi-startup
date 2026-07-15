// 5단계 "성찰" 고정 콘텐츠 — 사양서 6절 "절대 변경 금지" 항목 포함.
// 질문·개념·평가 텍스트는 원문 그대로. UI 라벨/구조만 코드에서 조정.

export type ReflectionTabId =
  | 'consumer_review'
  | 'consumer_deep'
  | 'producer_review'
  | 'producer_deep'
  | 'concept_eval'

export const REFLECTION_TABS: { id: ReflectionTabId; name: string; emoji: string }[] = [
  { id: 'consumer_review', name: '소비자 돌아보기', emoji: '🛒' },
  { id: 'consumer_deep',   name: '소비자 심화질문', emoji: '💭' },
  { id: 'producer_review', name: '생산 단계 돌아보기', emoji: '🏭' },
  { id: 'producer_deep',   name: '생산 단계 심화질문', emoji: '🔎' },
  { id: 'concept_eval',    name: '개념 연결 · 평가', emoji: '🧩' },
]

// ── 탭1: 합리적 선택 체크리스트 (텍스트 수정 금지) ──
export const CHECKLIST_CHOICES = ['했다', '조금 했다', '안 했다'] as const
export const CHECKLIST_ITEMS: { key: string; text: string }[] = [
  { key: 'step1', text: '사기 전에 정말 필요한 물건인지 생각했다' },
  { key: 'step2', text: '쓸 수 있는 돈이 얼마인지 먼저 확인했다' },
  { key: 'step3', text: '나만의 선택 기준(가격, 품질, 디자인 등)을 정했다' },
  { key: 'step4', text: '여러 모둠의 상품을 비교해 보았다' },
  { key: 'step5', text: '기준에 따라 비교한 뒤 선택했다' },
]
export const CHECKLIST_SUMMARY_LABEL = '체크 결과를 보고, 나의 장터 소비를 한 문장으로 평가해 보세요.'

// ── 탭2: 소비자 심화질문 (텍스트 수정 금지) ──
export const CONSUMER_DEEP_QUESTIONS: { no: number; text: string; tag: string }[] = [
  { no: 1, text: '장터에서 돈을 하나도 쓰지 않은 친구가 있다면, 그 친구는 가장 합리적인 선택을 한 걸까?', tag: '안 사는 것 = 합리적?' },
  { no: 2, text: '친구네 모둠을 응원하려고 꼭 필요하지 않은 물건을 샀다면, 이것은 비합리적 선택일까?', tag: '우정·교류도 기준?' },
  { no: 3, text: '가격이 비싸도 내가 정말 좋아하는 물건을 샀다면, 합리적 선택일까 비합리적 선택일까?', tag: '싼 게 무조건 합리적?' },
  { no: 4, text: '충동적으로 물건을 샀는데 결과적으로 아주 마음에 든다면, 합리적 선택이었다고 할 수 있을까?', tag: '과정 vs 결과' },
  { no: 5, text: '같은 물건인데 A모둠은 500원, B모둠은 300원에 판다면 무조건 300원짜리를 사는 게 합리적일까?', tag: '가격 외의 기준' },
  { no: 6, text: "장터가 끝난 뒤 '이걸 왜 샀지?' 하고 후회했다면, 어느 단계에서 문제가 있었을까?", tag: '5단계 적용 분석' },
]
export const DEEP_OPINION_PLACEHOLDER = '모둠에서 나눈 이야기를 떠올리며, 이 질문에 대한 나의 생각을 써 봅시다.'

// ── 탭3: 생산 단계 희소성 성찰 (텍스트 수정 금지) ──
export const PRODUCER_SCARCITY_FIELDS: { key: string; label: string; emphasis?: string }[] = [
  { key: 'scarcity', label: "상품을 만들 때 한정된 것(재료, 시간, 돈)은 무엇이었나요?", emphasis: "→ 이것이 바로 '희소성'입니다" },
  { key: 'choice_made', label: '그 안에서 우리 모둠은 어떤 선택을 했나요? (예: 종류를 줄이고 양을 늘렸다, 재료를 바꿨다 등)' },
  { key: 'customer_criteria', label: '손님(소비자)은 어떤 기준으로 우리 상품을 골랐을까요?' },
]

// ── 탭4: 생산 단계 심화질문 (텍스트 수정 금지) ──
export const PRODUCER_DEEP_QUESTIONS: { no: number; text: string; tag: string }[] = [
  { no: 1, text: '우리 모둠의 상품이 안 팔렸다면, 상품이 나빴기 때문일까 아니면 다른 이유가 있을까?', tag: '판매 부진의 원인' },
  { no: 2, text: '재료가 부족해서 원래 계획을 바꿔야 했다면, 그때의 선택은 합리적이었을까?', tag: '희소성과 선택' },
  { no: 3, text: '가격을 싸게 하면 많이 팔리지만 남는 게 없다. 어떻게 정하는 것이 합리적일까?', tag: '가격 결정의 기준' },
  { no: 4, text: '비슷한 상품을 파는 다른 모둠이 있었다면, 경쟁에서 쓴 방법은 모두 바람직한가?', tag: '경쟁과 윤리' },
  { no: 5, text: '예쁘게 만드는 데 시간을 쓸까, 많이 만드는 데 쓸까? 이때 포기한 것은 무엇일까?', tag: '기회비용' },
  { no: 6, text: '다른 모둠과 재료나 기술을 나눠 쓸 수 있었다면, 상품이 더 좋아졌을까? 왜 교류가 필요할까?', tag: '교류와 상호 의존' },
]

// ── 탭5: 개념-경험 연결 (텍스트 수정 금지) ──
export const CONCEPT_ROWS: { key: string; concept: string; meaning: string }[] = [
  { key: 'concept_scarcity',  concept: '희소성',       meaning: '자원(돈, 시간, 재료)이 한정된 상태' },
  { key: 'concept_rational',  concept: '합리적 선택',   meaning: '기준을 세워 비교하고 최선을 고르는 것' },
  { key: 'concept_prod_cons', concept: '생산·소비',     meaning: '물건을 만들고(생산) 사서 쓰는 것(소비)' },
  { key: 'concept_exchange',  concept: '교류·상호 의존', meaning: '서로 물건·도움을 주고받으며 발전하는 것' },
]
export const CONCEPT_CELL_LABEL = '장터에서 이 개념을 경험한 장면'
export const CORE_SENTENCE_LABEL = '이 프로젝트를 통해 알게 된 것을 한 문장으로 정리해 봅시다.'
export const CORE_SENTENCE_EXAMPLE = '예시) 자원은 한정되어 있기 때문에 기준을 세워 선택해야 하고, 다른 모둠과 교류하면 서로에게 도움이 된다.'

// ── 탭5: 자기 평가 (텍스트 수정 금지) ──
export const SELF_EVAL_CHOICES = ['잘함', '보통', '노력 필요'] as const
export const SELF_EVAL_ITEMS: { key: string; area: string; text: string }[] = [
  { key: 'knowledge', area: '지식·이해', text: '합리적 선택이 왜 필요한지 설명할 수 있다' },
  { key: 'process',   area: '과정·기능', text: '기준을 세워 선택하는 과정을 경험했다' },
  { key: 'attitude',  area: '가치·태도', text: '친구들과 소통하며 협력했다' },
]

// CSV/모니터링용 필드 순서 참고 (사양서 3-2)
export const TAB_FIELD_IDS: Record<ReflectionTabId, string[]> = {
  consumer_review: ['purchase_reasons', 'checklist', 'checklist_summary'],
  consumer_deep:   ['selected_question', 'my_opinion'],
  producer_review: ['sales_data', 'scarcity', 'choice_made', 'customer_criteria'],
  producer_deep:   ['selected_question', 'my_opinion'],
  concept_eval:    ['concept_scarcity', 'concept_rational', 'concept_prod_cons', 'concept_exchange', 'core_sentence', 'self_eval'],
}
