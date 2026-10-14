-- 컨디션·통증 기록 칼럼
-- SQL Editor에서 한 번 실행하세요. 여러 번 실행해도 안전합니다.
alter table public.workout_log add column if not exists cond jsonb;
