create table if not exists public.meta_queue_agent_availability (
  connection_id uuid not null references public.whatsapp_meta_connections(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  is_active boolean not null default true,
  updated_by_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (connection_id, user_id)
);

create index if not exists idx_meta_queue_agent_availability_connection
  on public.meta_queue_agent_availability(connection_id);

create index if not exists idx_meta_queue_agent_availability_user
  on public.meta_queue_agent_availability(user_id);

create table if not exists public.meta_queue_rotation_state (
  connection_id uuid not null references public.whatsapp_meta_connections(id) on delete cascade,
  department text not null,
  last_assigned_user_id uuid references public.profiles(id) on delete set null,
  last_assigned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (connection_id, department)
);

create index if not exists idx_meta_queue_rotation_state_connection
  on public.meta_queue_rotation_state(connection_id);

