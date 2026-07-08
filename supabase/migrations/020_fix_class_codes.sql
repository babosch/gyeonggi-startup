-- 020_fix_class_codes.sql
-- 초기 시드(003)에서 영문 코드로 들어간 반 코드를 학급비번(숫자)으로 교정

UPDATE classes SET code = '3643441' WHERE name = '수원시';
UPDATE classes SET code = '3643442' WHERE name = '이천시';
UPDATE classes SET code = '3643443' WHERE name = '고양시';
UPDATE classes SET code = '3643444' WHERE name = '부천시';
UPDATE classes SET code = '3643445' WHERE name = '파주시';

INSERT INTO classes (name, code, color, stage)
VALUES ('시흥시', '3643410', 'teal', 0)
ON CONFLICT (code) DO NOTHING;
