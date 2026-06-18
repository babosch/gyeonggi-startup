# 경기 상생 창업 프로젝트 — 설치 가이드

다른 선생님이 이 앱을 직접 운영하려면 아래 순서대로 진행하세요.  
소요 시간: 약 30분 (Supabase·Vercel·GitHub 계정 보유 기준)

---

## 필요한 계정 (모두 무료)

- [GitHub](https://github.com) — 코드 저장소
- [Supabase](https://supabase.com) — 데이터베이스·인증·실시간
- [Vercel](https://vercel.com) — 웹 호스팅

---

## 1단계 — GitHub 포크

1. 이 저장소 우측 상단 **Fork** 버튼 클릭
2. 내 GitHub 계정에 복사됨 확인

---

## 2단계 — Supabase 프로젝트 생성

1. [supabase.com](https://supabase.com) → **Start your project**
2. **New project** → 프로젝트 이름 입력 (예: `gyeonggi-startup`) → **Create new project**
3. 생성 완료 후 **Project Settings → API** 이동
4. 아래 세 값을 복사해 둡니다:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` 키 → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` 키 → `SUPABASE_SERVICE_ROLE_KEY`

### 데이터베이스 테이블 생성

5. **SQL Editor** 탭 이동
6. `supabase/migrations/` 폴더의 SQL 파일을 **번호 순서대로** 열어서 붙여넣고 **Run** 클릭

---

## 3단계 — Vercel 배포

1. [vercel.com](https://vercel.com) → **Add New Project**
2. **Import Git Repository** → 포크한 저장소 선택
3. **Environment Variables**에 아래 3개 입력:

| 이름 | 값 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon 키 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role 키 |

4. **Deploy** 클릭 → 완료

---

## 4단계 — Supabase 자동 정지 방지 설정

Supabase 무료 티어는 7일 미사용 시 자동 정지됩니다.  
GitHub Actions가 3일마다 자동으로 핑을 보내 정지를 방지합니다.

1. 포크한 저장소 → **Settings → Secrets and variables → Actions**
2. **New repository secret** 두 개 추가:

| 이름 | 값 |
|---|---|
| `SUPABASE_URL` | Supabase Project URL |
| `SUPABASE_ANON_KEY` | Supabase anon 키 |

---

## 5단계 — 첫 접속 및 학생 명단 등록

1. Vercel에서 발급된 URL로 접속
2. 교사 계정으로 가입
3. 반 및 학생 명단 등록 (CSV 업로드 또는 직접 입력)

---

## 문의

문제가 생기면 저장소 Issues 탭에 남겨주세요.
