create table if not exists public.meta_conversation_notes (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.meta_conversations(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  user_email text,
  note text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_meta_conversation_notes_conversation_id
  on public.meta_conversation_notes(conversation_id, created_at desc);

create table if not exists public.meta_conversation_reminders (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null unique references public.meta_conversations(id) on delete cascade,
  connection_id uuid not null references public.whatsapp_meta_connections(id) on delete cascade,
  scheduled_for timestamptz not null,
  description text not null,
  created_by_user_id uuid references public.profiles(id) on delete set null,
  created_by_user_email text,
  completed_at timestamptz,
  completed_by_user_id uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_meta_conversation_reminders_connection_due
  on public.meta_conversation_reminders(connection_id, scheduled_for)
  where completed_at is null;
