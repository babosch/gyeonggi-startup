# 코드 아키텍처 — 경기 상생 창업 프로젝트

> 다른 AI/개발자가 코드를 이해하고 이어서 작업하기 위한 구조 안내.
> 제품 명세는 `CLAUDE.md`, 진행 상태는 `docs/PROGRESS.md`, 결정 배경은 `docs/DECISIONS.md`.

---

## 전체 그림

```
학생/교사 브라우저 (크롬북)
   │  PIN 로그인 (반→번호→PIN)
   ▼
Next.js (App Router, 서버 컴포넌트 + 클라이언트 컴포넌트)
   │                          │
   │ 읽기: 서버 컴포넌트         │ 쓰기(돈/권한): /api 라우트 (service_role)
   ▼                          ▼
Supabase Postgres (RLS로 반 단위 격리) + Realtime(단계·전직)
```

- **읽기**는 서버 컴포넌트에서 사용자 세션으로 직접 조회 (RLS가 보호).
- **돈 이동·권한 변경**은 반드시 `/api/*` 라우트에서 `service_role`로 처리 (검증·멱등 후).
- **실시간**(단계 변경·역할 전직)은 클라이언트가 Supabase Realtime 구독.

---

## 디렉토리 구조

```
app/
  login/              학생 로그인 (반→번호→PIN 키패드)
  pin-change/         최초 PIN 강제 변경
  intro/              GRASPS 인트로 슬라이드
  home/               역할별 홈 (서버에서 데이터 모아 RoleHome에 전달)
  explore/            도시 탐구 (0단계)
  plan/               사업계획서 (지원자·CEO)
  company/            회사·상품 관리 (CEO)
  hire/               직원 채용 (CEO)
  requisition/        품의서 (CEO)
  worklog/            업무일지 (직원)
  payroll/            급여 지급 (CEO)
  facilities/         시설 관리(공무원)/이용(CEO) — 역할로 분기
  inspection/         기업 시찰 보고서 (공무원)
  ledger/             거래 장부 (공무원·교사)
  exchange/           교류 기록 (CEO·공무원)
  sell/               판매 부스 QR 스캔·결제 (CEO·직원)
  card/               내 QR 체크카드 (구매자가 제시)
  quiz/               쪽지시험 3회
  reflect/            성찰 (전원·상시)
  admin/
    login/            교사 로그인·가입
    page.tsx          관리자 홈 (메뉴)
    setup/            학생 계정 일괄 생성 + 시장 등록
    plans/            사업계획서 심사·선정
    requisitions/     품의서 결재
    officers/         공무원 임명
    board/            현황 보드 (경보·시찰·개념이해도·CSV)
  api/
    admin/create-students   학생 Auth 계정 + 개인 계좌 생성
    admin/register-mayor    교사를 반 시장으로 등록
    admin/select-plan       사업계획서 선정→회사·지원금·CEO전직 / 취소
    admin/appoint-officer   공무원 임명/해제
    admin/approve-requisition  품의서 승인(멱등 차감)/반려
    hire                    CEO 직원 채용
    requisition             품의서 제출
    payroll                 급여 지급 (수업일당 멱등)
    facility-use            시설 이용 (회사→시청)
    pay                     QR 결제 (방어 일체)
    plan/submit             사업계획서 제출·수정
    exchange                교류 기록

components/
  RoleHome.tsx        역할 분기 + 단계 실시간 구독 진입점
  HomeHeader.tsx      도시 컬러 헤더 + 잔액
  StageBanner.tsx     5단계 진행바
  TaskCard.tsx        기능 카드 (활성/잠금 — opensAt vs currentStage)
  MayorControl.tsx    교사 단계 제어 + 멈춤 + 박람회 토글
  RevealWatcher.tsx   역할 전직 팝업 (CEO 플래그 / 직원·공무원 Realtime)
  PageShell.tsx       기능 페이지 공용 셸 (뒤로가기·단계잠금)
  ConceptPopup.tsx    형성평가/micro-concept 공용 팝업

lib/
  supabase/client.ts  브라우저 클라이언트
  supabase/server.ts  서버 컴포넌트 클라이언트 (쿠키 기반)
  supabase/admin.ts   service_role 클라이언트 (API 라우트 전용)
  ledger.ts           transfer() 멱등 이체 + syncCompanyBalance()
  auth.ts             pinToPassword() — PIN→6자 비밀번호 변환
  types/index.ts      Role/Stage, cityTheme(), ROLE_INFO, 상수
  constants.ts        지원금·임금·정원 상수
  cities.ts           경기도 5개 도시 좌표
  intro.ts            인트로 슬라이드 카피
  quiz.ts             쪽지시험 문항
  useStage.ts         단계 Realtime 구독 훅

supabase/migrations/  001~009 SQL (순서대로 실행)
scripts/migrate.mjs   DATABASE_URL로 마이그레이션 직접 적용
```

---

## 핵심 패턴 (반드시 따를 것)

### 1. 단계 잠금
- 각 기능 페이지는 서버에서 `classes.stage`를 읽어 `PageShell`의 `locked` prop으로 차단.
- 클라이언트 `TaskCard`는 `opensAt > currentStage`면 회색 잠금 표시.
- **이중 검증**: UI 잠금 + 서버/RLS. 학생이 URL 직접 입력해도 페이지가 `stage < N`이면 잠금 화면.

### 2. 돈 이동은 항상 `lib/ledger.ts`의 `transfer()`
```ts
await transfer({ admin, fromType, fromId, toType, toId, amount, type, idempotencyKey })
```
- 양의 정수 검증 + 잔액 확인 + 양 계좌 갱신 + `transactions` 기록을 한 번에.
- `gov`(정부)는 무한 발행(지원금). 멱등키로 중복 방지.
- 회사 잔액은 `accounts`가 진실, `companies.balance`는 미러 → `syncCompanyBalance()`로 동기화.
- 멱등키 규칙: 지원금 `grant-{companyId}`, 급여 `payroll:{userId}:{date}`, 품의 `req-{reqId}`, 결제 `{txUuid}`.

### 3. RLS는 SECURITY DEFINER 헬퍼로 (재귀 금지)
- `auth_class_id()`, `auth_role()`, `auth_company_id()` (006 마이그레이션).
- **정책 안에서 같은 테이블을 서브쿼리로 조회하면 무한 재귀** → 반드시 헬퍼 함수 사용.
- 새 테이블 추가 시 이 헬퍼로 정책 작성 (009 참고).

### 4. 역할 전직 타이밍 (RevealWatcher)
- CEO: `users.reveal_pending='ceo'` 플래그 → 다음 로그인 시 소비.
- 직원·공무원: `users.role` 변경을 Realtime 구독 → 즉시 팝업.

### 5. PIN 인증
- 학생 이메일 = `{classCode}-{number}@classroom.local` (가상).
- PIN 4자리 → `pinToPassword()`로 `gg_{pin}` 변환 (Supabase 6자 정책 회피).
- 로그인·PIN변경·계정생성·결제검증 **모든 곳에서 pinToPassword 통과** 필수.

---

## 개발 워크플로

```bash
# 개발 서버
npm run dev                      # http://localhost:3000

# DB 마이그레이션 적용 (.env.local의 DATABASE_URL 사용)
node scripts/migrate.mjs         # 전체
node scripts/migrate.mjs 010     # 010_*.sql 만

# 타입 체크 / 빌드
npx tsc --noEmit
npm run build

# 검증 패턴: scripts/에 일회용 .mjs 작성 → service_role로 시나리오 재현 → 삭제
#   (멱등성·RLS·Realtime은 UI 없이 스크립트로 먼저 검증한 뒤 커밋)
```

**커밋 규칙**: 기능 단위로 커밋, 메시지에 검증 결과 포함. 항상 push.

---

## 흔한 함정 (이미 해결됨 — 재발 주의)

| 함정 | 증상 | 해결 |
|---|---|---|
| RLS 자기참조 | `infinite recursion detected` | DEFINER 헬퍼 함수 (006) |
| PIN 4자리 | `Password should be at least 6 characters` | pinToPassword (`gg_` 접두사) |
| 멱등키에 UUID | 하이픈 파싱 깨짐 | 구분자 콜론 사용 (`payroll:{id}:{date}`) |
| 라우트 삭제 후 stale | `.next` 캐시가 옛 라우트 참조 → 500 | `.next` 삭제 후 재시작 |
| classes 조인 타입 | `me.classes`가 배열로 추론 | `Array.isArray() ? [0] : ...` 패턴 |
| Tailwind 동적 클래스 | 색상 클래스 미생성 | CITY_THEME에 전체 문자열 명시 (safelist) |

---

## 미완 / 알려진 정리거리

- `middleware.ts` → Next 16에서 `proxy.ts` 권장 (현재 동작은 함, 경고만).
- 형성평가 QR(`formative_qr`) 구매자 트리거 미연동 (현재 5종).
- 워드클라우드 시각화 미구현 (city_research 데이터는 수집 중).
- 교사 잔액 보정·거래 취소 UI 미구현 (transactions.voided 컬럼은 있음).
- Vercel 미배포.
