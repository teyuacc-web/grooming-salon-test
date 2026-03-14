alter table public.dog_breeds enable row level security;
alter table public.grooming_services enable row level security;
alter table public.availability_rules enable row level security;
alter table public.appointments enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'dog_breeds' and policyname = 'Public can read dog breeds'
  ) then
    create policy "Public can read dog breeds" on public.dog_breeds for select using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'grooming_services' and policyname = 'Public can read services'
  ) then
    create policy "Public can read services" on public.grooming_services for select using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'availability_rules' and policyname = 'Public can read availability'
  ) then
    create policy "Public can read availability" on public.availability_rules for select using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'appointments' and policyname = 'Public can read appointments for scheduling'
  ) then
    create policy "Public can read appointments for scheduling" on public.appointments for select using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'appointments' and policyname = 'Public can create appointments'
  ) then
    create policy "Public can create appointments" on public.appointments for insert with check (true);
  end if;
end $$;
