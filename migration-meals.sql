-- 식단 기록 칼럼 (끼니별 계획대로/건너뜀/먹은 음식, 추가 간식)
-- SQL Editor에서 한 번 실행하세요. 여러 번 실행해도 안전합니다.
alter table public.workout_log add column if not exists meals jsonb;
