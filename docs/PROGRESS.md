# 빌드 진행 상태

> AI가 이어서 작업할 때 현재 상태를 파악하기 위한 문서.
> 기능이 완료될 때마다 이 파일을 업데이트할 것. 변경 이력은 `CHANGELOG.md`.
> 마지막 업데이트: 2026-06-22

---

## 현재 상태 요약

**단계: 전 기능 구현 + Vercel 배포 + 운영 도구(슈퍼어드민·CI) 완료. 실서비스 운영 가능.**

- 배포본: https://gyeonggi-startup.vercel.app (서울 리전, keep-alive 동작)
- 교사 로그인: babo@babosam.net / 987612 (= SUPER_ADMIN_EMAIL, 슈퍼어드민)
- 전 기능 타입체크·빌드 통과, CI 자동 검사 동작. 머니 플로우 멱등성·Realtime 검증 완료.
- 협업 체계 준비됨(브랜치·CI·문서). 현재는 단독 작업이라 main 직접 푸시 중.

다음 권장: 두 브라우저로 교사↔학생 전체 시나리오 리허설, 미세 UX 다듬기, Vercel 배포.

---

## 완료된 것

### 인프라·설정
- [x] GitHub 레포 생성 (`babosch/gyeonggi-startup`)
- [x] Next.js 14 (App Router) + TypeScript + Tailwind CSS 초기화
- [x] `@supabase/supabase-js`, `@supabase/ssr` 패키지 설치
- [x] `.env.example` 환경변수 템플릿
- [x] `.github/workflows/keep-alive.yml` (Supabase 정지 방지 cron)
- [x] `supabase/migrations/` 디렉토리 생성
- [x] `SETUP.md` 포크 가이드
- [x] `CLAUDE.md` AI 작업 컨텍스트
- [x] `README.md` 프로젝트 개요

### 기획·설계
- [x] 요구사항 사양서 v4 (`docs/base_idea/웹앱_요구사항_사양서_v4.md`)
- [x] 기술 스택 확정 (Next.js + Supabase + Vercel + GitHub)
- [x] 이식성 설계 완료 (포크 → 30분 세팅)

---

## 미완료 — 빌드 우선순위 순서

### 1순위: MVP (거의 완료)

> 목표: 로그인하고 역할별 홈 화면이 보이며, 교사가 단계를 바꾸면 학생 화면이 실시간으로 반응하는 상태

- [x] Supabase 클라이언트 설정 (`lib/supabase/`)
- [x] DB 마이그레이션: 001~007 (테이블·RLS·realtime). RLS는 SECURITY DEFINER 헬퍼로 재귀 해결(006)
- [x] 로그인 화면: 반 선택 → 번호 선택 → PIN 4자리 (검증 완료)
- [x] 최초 로그인 시 PIN 강제 변경 (1234 불허). PIN은 pinToPassword로 6자 변환
- [x] PIN 3회 실패 → 30초 쿨다운
- [x] 교사 계정 가입·시장 등록·학생 계정 일괄 생성 (admin/setup)
- [x] 역할별 홈 화면 (시장·CEO·직원·공무원·지원자 각각) — RoleHome
- [x] 단계 제어: 교사 단계 변경 → Realtime → 학생 화면 즉시 반영 (검증 완료)
- [x] 4학년 친근형 디자인 톤 확정 + 공용 컴포넌트
- [x] 계좌 잔액 조회 (역할별, 데이터 없으면 0)
- [ ] 교사 현황 보드: 반 진행 현황·잔액 요약 (단계 제어만 있음, 현황 지표 미구현)
- [ ] 교사 기능: 거래 취소·잔액 보정·PIN 초기화·단계 되돌리기 (단계 변경만 있음)

### 2~10순위: 전부 구현 완료 ✅

- [x] GRASPS 인트로(공통3+역할별2) + 역할 전직 팝업(CEO 로그인/직원·공무원 Realtime)
- [x] 도시 탐구: 지도 찾기 + 조사 + 형성평가(특산품)
- [x] 창업: 사업계획서(예비비·특산품·품목표) + 교사 선정/취소 + 지원금 멱등 + CEO전직
- [x] 회사 설립(상품 등록) + 직원 채용(CEO) + 공무원 임명(교사) + 품의서(기회비용)+결재
- [x] 생산: 업무일지 + 급여(멱등) + 시설 관리/이용 + 공무원 시찰 보고서·경보 + 거래장부
- [x] 판매 QR 결제(체크카드): /card QR, /sell 스캔, 자가구매·재고·잔액·멱등 방어
- [x] 교류·박람회: 협력 기록("판매" 단어 배제) + 박람회 토글
- [x] 교사 현황 보드: 예산경보·시찰보고·개념이해도·CSV 내보내기
- [x] 개념 정착: 형성평가 5종(ConceptPopup) + 쪽지시험 3회(/quiz)

### 운영·협업 도구: 완료 ✅ (2026-06-19)
- [x] Vercel 배포 + 서울 리전(icn1) + keep-alive Secrets
- [x] 슈퍼어드민(/admin/super) — 시장·계정 정리, SUPER_ADMIN_EMAIL 게이트
- [x] 시장 등록 중복 친절한 안내
- [x] 루트(/) 기본 템플릿 버그 수정
- [x] CI(타입체크·빌드) + 협업 가이드 문서

### 남은 다듬기 (선택)
- [ ] 형성평가 QR(formative_qr) 구매자 트리거 (현재 5종, QR 미연동)
- [ ] 워드클라우드(교사 송출용) — 조사 데이터는 수집 중, 시각화 미구현
- [ ] 핵심 문장 완성(단원 마무리) — 쪽지시험으로 대체 가능
- [ ] 교사 잔액 보정·거래 취소 UI (DB 구조는 있음)
- [ ] middleware.ts → proxy.ts 마이그레이션 (Next 16 권장, 현재 동작은 함)

> 위 2~10순위 세부 항목의 구현 완료 내역은 `CHANGELOG.md`와 `git log` 참고.

---

## 주요 결정 사항 (재논의 불필요)

| 결정 | 내용 |
|---|---|
| 호스팅 | Vercel (무료) |
| DB | Supabase (무료, keep-alive cron으로 7일 정지 우회) |
| QR 방식 | 체크카드 방식 (손님 제시 → 판매자 스캔) |
| 박람회 | 교류의 장 (돈 거래 없음) |
| 임금 | CEO 11,000 / 공무원 10,400 / 직원 10,400 (2026년 최저시급 기준) |
| 급여 한도 | 학생당 전체 6회 / 하루 2회 / 30분 쿨다운 / 업무일지 필수 |
| CEO 역할 전직 | 다음 로그인 시 (reveal_pending 플래그) |
| 직원·공무원 전직 | 채용·임명 즉시 Realtime 푸시 |
| 공무원 채용 주체 | 교사(시장)가 임명 |
| 직원 채용 주체 | CEO가 직접 채용 |
| 이식성 | GitHub 포크 → Supabase 마이그레이션 → Vercel 배포 (약 30분) |

---

## 환경변수 현황

- [x] `.env.example` 작성 완료 (SUPER_ADMIN_EMAIL·DATABASE_URL 포함)
- [x] `.env.local` — Supabase 키 + DATABASE_URL + SUPER_ADMIN_EMAIL 입력 완료
- [x] Vercel 환경변수 — Supabase 키 3개 + SUPER_ADMIN_EMAIL 설정 완료
- [x] GitHub Secrets — keep-alive용 SUPABASE_URL·ANON_KEY 설정 완료
