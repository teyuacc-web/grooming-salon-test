-- Grooming salon booking schema for Supabase

create extension if not exists pgcrypto;

create table if not exists public.dog_breeds (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  size_category text not null check (size_category in ('small', 'medium', 'large')),
  typical_duration_minutes integer not null default 90,
  created_at timestamptz not null default now()
);

create table if not exists public.grooming_services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  duration_minutes integer not null,
  price_from integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  weekday integer not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  slot_step_minutes integer not null default 30,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.blocked_slots (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  owner_name text not null,
  phone text not null,
  dog_name text not null,
  dog_breed_id uuid references public.dog_breeds(id) on delete restrict,
  custom_breed text,
  service_id uuid not null references public.grooming_services(id) on delete restrict,
  last_grooming_bucket text not null check (
    last_grooming_bucket in (
      'never',
      'less_than_1_month',
      'one_to_two_months',
      'two_to_three_months',
      'more_than_3_months'
    )
  ),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  notes text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled')),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index if not exists idx_appointments_starts_at on public.appointments(starts_at);
create index if not exists idx_appointments_status on public.appointments(status);
create index if not exists idx_blocked_slots_range on public.blocked_slots(starts_at, ends_at);
create index if not exists idx_availability_rules_weekday on public.availability_rules(weekday);

insert into public.grooming_services (slug, name, description, duration_minutes, price_from)
values
  ('hygiene', 'Гігієнічний грумінг', 'Купання, сушіння, лапки, вушка, кігтики.', 90, 500),
  ('full', 'Повний грумінг', 'Комплексний догляд зі стрижкою та укладкою.', 120, 800),
  ('spa', 'SPA-догляд', 'Додатковий догляд і косметика для шерсті.', 60, 600),
  ('express', 'Експрес-послуга', 'Швидкі локальні процедури.', 30, 250)
on conflict (slug) do nothing;

insert into public.availability_rules (weekday, start_time, end_time, slot_step_minutes)
values
  (1, '09:00', '19:00', 30),
  (2, '09:00', '19:00', 30),
  (3, '09:00', '19:00', 30),
  (4, '09:00', '19:00', 30),
  (5, '09:00', '19:00', 30),
  (6, '10:00', '18:00', 30)
on conflict do nothing;

insert into public.dog_breeds (name, size_category, typical_duration_minutes)
values
  ('Йоркширський тер’єр', 'small', 90),
  ('Шпіц', 'small', 90),
  ('Мальтіпу', 'small', 90),
  ('Кокер-спанієль', 'medium', 120),
  ('Бордер-колі', 'medium', 120),
  ('Лабрадор', 'large', 150),
  ('Золотистий ретривер', 'large', 150)
on conflict (name) do nothing;
