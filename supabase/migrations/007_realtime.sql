-- 007_realtime.sql — Realtime 활성화
-- 교사가 단계를 바꾸면 학생 화면이 즉시 반영되도록
-- classes 테이블을 realtime publication에 추가한다.

ALTER PUBLICATION supabase_realtime ADD TABLE classes;
ALTER PUBLICATION supabase_realtime ADD TABLE users;
