-- 010_activity_board.sql — 교사 수업 보드
-- 교사가 이번 차시에 열 활동과 순서를 정한다. (순서 있는 key 배열)
-- 예: ["explore","plan"] → 학생은 도시탐구 다음 사업계획서 순으로 봄.

ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS open_activities jsonb NOT NULL DEFAULT '[]';
