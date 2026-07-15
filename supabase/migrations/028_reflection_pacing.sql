-- 028: 성찰 단계 진행 통제
--
-- 교사가 성찰(5단계)의 5개 탭 중 지금 학생들이 볼 수 있는 탭을 하나로 지정할 수 있게 한다.
-- NULL = 제한 없음(학생이 자유롭게 5개 탭 이동, 기존 동작).
-- 값이 있으면 학생 화면은 그 탭만 보여주고 다른 탭으로 이동 못 하게 한다.
-- classes 테이블은 이미 realtime publication에 포함되어 있어(007) 추가 설정 불필요.

ALTER TABLE classes ADD COLUMN IF NOT EXISTS reflection_active_tab text
  CHECK (reflection_active_tab IN ('consumer_review', 'consumer_deep', 'producer_review', 'producer_deep', 'concept_eval'));
