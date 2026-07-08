-- ============================================================
-- 019_reset_all_students.sql
-- 학생 데이터 전체 초기화 (수업 재시작용)
--
-- ✅ 유지되는 것: 교사(시장) 계정, 반 목록(수원·이천·고양·부천·파주·시흥)
-- ❌ 삭제되는 것: 학생 계정·역할·회사·잔액·거래·품의서·업무일지 등 모든 학생 데이터
-- ⓪ 모든 반의 수업 단계가 0단계(도시탐구)로 초기화됩니다.
--
-- Supabase SQL Editor에서 실행하세요.
-- ============================================================

-- 1. 거래 내역 (accounts 참조 → 먼저 삭제)
DELETE FROM transactions;

-- 2. 계좌
DELETE FROM accounts;

-- 3. 교류 관련
DELETE FROM exchange_logs;
DELETE FROM exchange_matches;
DELETE FROM exchange_cards;
DELETE FROM exchanges;

-- 4. 공무원 활동
DELETE FROM inspection_reports;
DELETE FROM officer_alerts;
DELETE FROM trade_reports;

-- 5. 품의서
DELETE FROM requisitions;

-- 6. 취업지원서
DELETE FROM job_applications;

-- 7. 사업계획서
DELETE FROM business_plans;

-- 8. 도시탐구
DELETE FROM city_research;

-- 9. 업무일지·성찰·개념 퀴즈
DELETE FROM activity_logs;
DELETE FROM reflections;
DELETE FROM concept_responses;

-- 10. 기타 학생 활동
DELETE FROM wordcloud_words;
DELETE FROM word_merges;
DELETE FROM teacher_notes;
DELETE FROM facility_uses;

-- 11. 상품
DELETE FROM products;

-- 12. 회사 (users.company_id는 SET NULL으로 자동 처리)
DELETE FROM companies;

-- 13. 학생 계정 삭제
--     auth.users 삭제 → public.users 자동 CASCADE 삭제
--     mayor- 이메일(교사)은 제외
DELETE FROM auth.users
WHERE email NOT LIKE 'mayor-%@classroom.local';

-- 14. 수업 단계 전체 초기화 (모든 반 0단계로)
UPDATE classes SET stage = 0;
