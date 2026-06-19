# 경기 상생 창업 프로젝트

초등 4학년 사회 「경제활동과 지역 간 교류」 단원을 위한 **창업 시뮬레이션 웹앱**.  
경기도 5개 반(이천·부천·파주·수원·고양)이 각자 가상 도시 경제를 운영하며 희소성·합리적 선택·교류·상호의존 개념을 체험한다.

## 기술 스택

| 역할 | 기술 |
|---|---|
| 프레임워크 | Next.js 14 (App Router) + TypeScript + Tailwind CSS |
| DB / Auth / Realtime | Supabase (PostgreSQL + RLS) |
| 호스팅 | Vercel |
| 코드 저장소 | GitHub |
| Supabase 정지 방지 | GitHub Actions cron (3일마다 ping) |

## 운영 규모

- 반당 약 25명 × 5개 반 + 교사 5명 = **약 130명**
- 반당 4개 기업(CEO + 직원) + 시청(공무원 2~3명)
- 역할: 시장(교사) / CEO / 직원 / 공무원 / 지원자

## 주요 문서

AI가 이어서 작업한다면 **`CLAUDE.md`부터** 읽으세요 (읽는 순서가 거기 안내돼 있습니다).

| 문서 | 위치 | 설명 |
|---|---|---|
| **AI 작업 컨텍스트** | `CLAUDE.md` | 제품 규칙·역할·단계·디자인. **AI 진입점** |
| 코드 아키텍처 | `docs/ARCHITECTURE.md` | 디렉토리 구조·핵심 패턴·개발 워크플로·함정 |
| 결정 히스토리 | `docs/DECISIONS.md` | 왜 이렇게 만들었는지 (스택·RLS·PIN·멱등 등) |
| 빌드 진행 상태 | `docs/PROGRESS.md` | 완료된 것·남은 것 |
| 협업 가이드 | `docs/협업가이드.md` | 둘이 같이 수정할 때 규칙(브랜치·충돌·DB) |
| 요구사항 사양서 v4 | `docs/base_idea/웹앱_요구사항_사양서_v4.md` | 전체 기능 명세 (가장 상세) |
| 15차시 수업계획 | `docs/base_idea/사회3단원_15차시_상세수업계획.md` | 수업 흐름·차시별 활동 |
| 포크 설치 가이드 | `SETUP.md` | 다른 선생님이 독립 인스턴스 구축하는 방법 |

## 로컬 개발 시작

```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 설정 (.env.example 참고)
cp .env.example .env.local
# .env.local 열어서 Supabase URL·키 입력

# 3. 개발 서버 실행
npm run dev
# → http://localhost:3000
```

## 환경변수

```env
NEXT_PUBLIC_SUPABASE_URL=         # Supabase Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=    # Supabase anon 키
SUPABASE_SERVICE_ROLE_KEY=        # Supabase service_role 키
```

Vercel 배포 시 대시보드 → Environment Variables에 동일하게 입력.

## 데이터베이스 마이그레이션

```bash
# Supabase SQL Editor에서 아래 파일을 번호 순서대로 실행
supabase/migrations/001_init.sql
supabase/migrations/002_rls.sql
...
```

## 다른 선생님이 포크해서 운영하기

→ [SETUP.md](SETUP.md) 참고
