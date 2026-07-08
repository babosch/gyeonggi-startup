-- 026: 탐구 질문 응답 반려
-- 교사가 제대로 안 쓴 탐구 답을 반려하면, 학생은 업무일지 화면에서 같은 질문을
-- 반려 사유와 함께 다시 받아 재작성한다. (reflections.feedback를 반려 사유로 재사용)

ALTER TABLE reflections ADD COLUMN IF NOT EXISTS rejected boolean NOT NULL DEFAULT false;
