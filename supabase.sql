-- 36주 홈트 플랜: 체중·운동 완료 기록 테이블
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run

create table if not exists public.workout_log (
  user_id    uuid        not null default auth.uid() references auth.users(id) on delete cascade,
  date       date        not null,
  weight     numeric(5,1) check (weight is null or (weight between 40 and 200)),
  done       boolean     not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

-- 수정할 때마다 updated_at 갱신
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists workout_log_touch on public.workout_log;
create trigger workout_log_touch
  before update on public.workout_log
  for each row execute function public.touch_updated_at();

-- Data API 권한: 'Automatically expose new tables'를 꺼둔 경우 필요 (켜져 있어도 무해)
-- 비로그인(anon)에는 권한을 주지 않음
revoke all on public.workout_log from anon;
grant select, insert, update, delete on public.workout_log to authenticated;

-- RLS: 로그인한 본인 행만 읽기/쓰기
alter table public.workout_log enable row level security;

drop policy if exists "own rows select" on public.workout_log;
drop policy if exists "own rows insert" on public.workout_log;
drop policy if exists "own rows update" on public.workout_log;
drop policy if exists "own rows delete" on public.workout_log;

create policy "own rows select" on public.workout_log
  for select to authenticated using (auth.uid() = user_id);
create policy "own rows insert" on public.workout_log
  for insert to authenticated with check (auth.uid() = user_id);
create policy "own rows update" on public.workout_log
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows delete" on public.workout_log
  for delete to authenticated using (auth.uid() = user_id);
