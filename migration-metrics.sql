-- 체력 측정 결과 칼럼 (턱걸이·푸시업·플랭크·로잉 10분·허리둘레)
-- SQL Editor에서 한 번 실행하세요. 여러 번 실행해도 안전합니다.
alter table public.workout_log add column if not exists metrics jsonb;
