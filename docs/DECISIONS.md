# 결정 히스토리 — 경기 상생 창업 프로젝트

> "왜 이렇게 만들었는가"를 기록한다. 다른 AI/개발자가 같은 고민을 반복하거나
> 이미 내린 결정을 되돌리지 않도록. 시간순.

---

## 호스팅·DB 스택 (Vercel + Supabase + GitHub)

**고민**: Cloudflare D1, Firebase, Neon+Ably 등 검토.

**결정**: Vercel + Supabase.
- **D1 탈락**: Realtime 없음(단계 변경·전직·결제 즉시 반영이 핵심).
- **Firebase 탈락**: Firestore NoSQL이 13개 관계형 테이블·JOIN·집계와 안 맞음. 무료 읽기 한도(5만/일)도 130명 규모에 빠듯.
- **Cloudflare Pages 탈락**: 무료 대역폭 무제한이지만 이 앱 트래픽(월 1~3GB)엔 무의미하고, `@cloudflare/next-on-pages` 변환·edge 런타임 제약이 비용.
- **Supabase**: Postgres+Auth+Realtime+RLS 올인원. 관계형 스키마 그대로.

**Supabase 7일 정지 우회**: 무료 티어는 7일 미사용 시 정지 → GitHub Actions cron으로 3일마다 ping (`.github/workflows/keep-alive.yml`). 한 학기 수업 앱이라 실용적 선택.

---

## 이식성 (다른 교사가 포크해서 독립 운영)

**결정**: 반당 1개 Supabase 프로젝트 독립 운영. 포크 → Supabase 생성 → 마이그레이션 → Vercel 환경변수 → keep-alive Secrets (약 30분, `SETUP.md`).
- 환경변수 3개(`NEXT_PUBLIC_SUPABASE_URL`, `ANON_KEY`, `SERVICE_ROLE_KEY`)만 채우면 동작하도록 설계.

---

## PIN 인증 방식

**고민**: 초4가 30초 안에 로그인. 이메일/비번 타이핑 불가.

**결정**: 반 선택 → 번호 선택 → 4자리 PIN. 내부적으로 가상 이메일(`{code}-{number}@classroom.local`) + Supabase Auth.
- **함정**: Supabase Auth는 비밀번호 **최소 6자** → 4자리 PIN 거부됨.
- **해결**: `pinToPassword()` = `gg_{pin}` 접두사. 학생은 4자리만 입력, 앱이 변환. **설정 변경 불필요 → 포크 친화적**(다른 교사가 Supabase 설정 안 건드려도 됨).
- 최초 PIN 1234 강제 변경, 1234 재설정 불허, 3회 실패 30초 잠금.

---

## RLS 설계 (반 단위 격리)

**고민**: 학생은 자기 반 데이터만. 교사는 자기 반 전체.

**함정**: 초기엔 정책에서 `class_id IN (SELECT class_id FROM users WHERE id=auth.uid())` 식으로 작성 → **`infinite recursion detected in policy for relation "users"`**. users 정책이 users를 다시 조회하며 RLS 재귀.

**해결 (006)**: `SECURITY DEFINER` 함수 `auth_class_id()`/`auth_role()`/`auth_company_id()`. DEFINER는 RLS를 우회 실행하므로 재귀가 끊김. 이후 모든 정책이 이 헬퍼 사용.

**교훈**: Supabase RLS에서 같은 테이블 자기참조는 항상 DEFINER 헬퍼로.

---

## 돈 처리 (단일 진실 공급원 + 멱등)

**원칙(명세)**: 모형돈 병행 없음. 앱 DB가 유일 진실. (단 QR 카드는 물리 인쇄물 병행)

**결정**:
- `accounts`(잔액 진실) + `transactions`(거래 기록). `companies.balance`는 미러.
- 모든 이동은 `transfer()` 한 곳으로 — 양의정수·잔액·기록을 원자적으로.
- **멱등 필수**: 지원금(회사당 1회), 급여(수업일당 1회), 결제(거래 UUID), 품의(품의 1회). `transactions.idempotency_key` UNIQUE로 중복 거부.
- `gov`(정부)는 잔액 미차감(지원금 발행원).

**검증 방식**: UI 전에 `scripts/*.mjs`로 멱등성 재현(2회 호출 → 잔액 1회만 반영) 확인 후 커밋.

---

## 역할 전직 타이밍

**결정 (명세 v3)**:
- CEO: 교사 선정 후 **다음 로그인 시** 팝업. `reveal_pending` 플래그로 지연 — 선정 순간 학생이 화면을 보고 있지 않을 수 있고, 로그인 시 축하가 자연스러움.
- 직원·공무원: 채용·임명 **즉시** 팝업. Realtime으로 `users.role` 변경 구독.

**이유**: CEO는 교사가 신중히 심사(시차 존재), 직원·공무원은 그 자리에서 호명되는 맥락.

---

## QR 결제 = 체크카드 방식

**고민**: 부스 기기 추가 없이, 초4가 쓸 수 있게.

**결정**: 손님이 자기 QR 카드(개인 크롬북 화면 `/card`)를 판매자에게 제시 → 판매자가 자기 크롬북으로 스캔(`/sell`) → 상품·이유 → 손님 PIN → 결제.
- 별도 부스 기기 없음(개인 크롬북으로 스캔).
- **방어**: 판매자 인증, 손님 PIN 검증(signInWithPassword), 자가구매 차단, 재고0·잔액부족 차단, txUuid 멱등.
- "왜 샀나요?" 입력 = 합리적 소비 평가 자료.

---

## 박람회 = 교류 (판매 아님)

**원칙(명세)**: 돈 거래 없이 재료·기술만. UI에서 "판매/구매/결제" 단어 **금지**, "제공/요청/협력 기록"만.
**현 구현**: 같은 반 회사 간 교류 기록 + `fair_mode` 토글 표시. cross-class(다른 반) 교류는 RLS 때문에 추후 admin API로 확장 예정(MVP는 같은 반).

---

## 디자인 톤: 4학년 친근형

**선택**: 두 시안(친근형 vs 깔끔형) 비교 후 **4학년 친근형 확정**.
- 큰 글씨, 둥근 모서리(`rounded-2xl/3xl`), 이모지 라벨, 밝은 색, 친근한 말투("시장님께 보내기").
- 다크모드 비활성(globals.css에서 밝은 배경 고정) — 초등 교실 환경.
- 도시 컬러: 이천=blue, 부천=purple, 파주=green, 수원=amber, 고양=pink. `cityTheme()`로 Tailwind safelist 문제 회피(동적 클래스명 금지).

---

## 개념 정착을 기능에 내장

**원칙(명세)**: 기능을 만들 때 개념 형성평가를 함께 심는다 (나중에 몰아서 X).
**구현**: `ConceptPopup` 공용 컴포넌트. 핵심 행동 완료(최초 1회) 시 자동:
- 도시조사→특산품, 사업계획서→희소성, 품의서→기회비용, 업무일지→생산·소비, 교류→상호의존.
- 쪽지시험 3회(`/quiz`)는 단계별 회차. 모두 `concept_responses`에 기록 → 교사 보드 정답률 집계.
