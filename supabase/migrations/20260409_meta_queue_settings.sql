create table if not exists public.meta_queue_settings (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null unique references public.whatsapp_meta_connections(id) on delete cascade,
  auto_distribution_enabled boolean not null default false,
  max_simultaneous_enabled boolean not null default false,
  max_simultaneous_per_agent integer,
  auto_close_inactive_enabled boolean not null default false,
  inactive_close_minutes integer,
  updated_by_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_meta_queue_max_simultaneous_positive
    check (max_simultaneous_per_agent is null or max_simultaneous_per_agent >= 1),
  constraint chk_meta_queue_inactive_minutes_positive
    check (inactive_close_minutes is null or inactive_close_minutes >= 1)
);

create index if not exists idx_meta_queue_settings_connection_id
  on public.meta_queue_settings(connection_id);

