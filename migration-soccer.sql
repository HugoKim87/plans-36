-- 이미 supabase.sql을 실행한 경우, 이 한 줄만 SQL Editor에서 실행하세요.
alter table public.workout_log add column if not exists soccer boolean;
