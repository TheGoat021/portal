create extension if not exists pgcrypto;

create or replace function public.set_voice_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.voice_agents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  name text not null,
  extension text not null,
  status text not null default 'offline' check (status in ('offline', 'available', 'ringing', 'in_call', 'paused')),
  current_call_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.voice_queues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text null,
  strategy text not null default 'ringall',
  max_wait_seconds integer not null default 300,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.voice_calls (
  id uuid primary key default gen_random_uuid(),
  external_call_id text null,
  unique_id text null,
  linked_id text null,
  direction text not null check (direction in ('inbound', 'outbound')),
  phone text not null,
  normalized_phone text not null,
  status text not null check (status in ('ringing', 'queued', 'answered', 'missed', 'abandoned', 'transferred', 'ended', 'failed')),
  queue_id uuid null references public.voice_queues(id) on delete set null,
  agent_id uuid null references public.voice_agents(id) on delete set null,
  cliente_id uuid null,
  lead_id uuid null,
  started_at timestamptz not null default now(),
  answered_at timestamptz null,
  ended_at timestamptz null,
  wait_seconds integer null,
  duration_seconds integer null,
  recording_url text null,
  transcription text null,
  summary text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.voice_agents
  add constraint voice_agents_current_call_id_fkey
  foreign key (current_call_id)
  references public.voice_calls(id)
  on delete set null;

create table if not exists public.voice_queue_agents (
  id uuid primary key default gen_random_uuid(),
  queue_id uuid not null references public.voice_queues(id) on delete cascade,
  agent_id uuid not null references public.voice_agents(id) on delete cascade,
  priority integer not null default 1,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.voice_call_events (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null references public.voice_calls(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.voice_recordings (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null references public.voice_calls(id) on delete cascade,
  file_path text not null,
  public_url text null,
  duration_seconds integer null,
  created_at timestamptz not null default now()
);

create index if not exists idx_voice_calls_status on public.voice_calls(status);
create index if not exists idx_voice_calls_queue_id on public.voice_calls(queue_id);
create index if not exists idx_voice_calls_agent_id on public.voice_calls(agent_id);
create index if not exists idx_voice_calls_unique_id on public.voice_calls(unique_id);
create index if not exists idx_voice_calls_external_call_id on public.voice_calls(external_call_id);
create index if not exists idx_voice_calls_normalized_phone on public.voice_calls(normalized_phone);
create index if not exists idx_voice_call_events_call_id on public.voice_call_events(call_id);
create index if not exists idx_voice_recordings_call_id on public.voice_recordings(call_id);
create unique index if not exists idx_voice_queue_agents_unique on public.voice_queue_agents(queue_id, agent_id);

drop trigger if exists trg_voice_agents_updated_at on public.voice_agents;
create trigger trg_voice_agents_updated_at
before update on public.voice_agents
for each row execute function public.set_voice_updated_at();

drop trigger if exists trg_voice_queues_updated_at on public.voice_queues;
create trigger trg_voice_queues_updated_at
before update on public.voice_queues
for each row execute function public.set_voice_updated_at();

drop trigger if exists trg_voice_calls_updated_at on public.voice_calls;
create trigger trg_voice_calls_updated_at
before update on public.voice_calls
for each row execute function public.set_voice_updated_at();
