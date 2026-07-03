-- 025: 성찰(탐구 질문 응답)에 개념 태그 추가
-- 업무일지 전 탐구 질문 응답을 reflections에 저장하며 concept_key로 개념을 태깅한다.
-- (일반 성찰은 concept_key NULL, 탐구 응답은 개념 키 포함 → 교사가 개념별로 열람 가능)

ALTER TABLE reflections ADD COLUMN IF NOT EXISTS concept_key text;
