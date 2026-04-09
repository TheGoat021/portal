create table if not exists public.conversation_management (
  conversation_id uuid primary key references public.conversations(id) on delete cascade,
  status text not null default 'open',
  closed_by_user_id uuid,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_conversation_management_status check (status in ('open', 'closed'))
);

create index if not exists idx_conversation_management_status
  on public.conversation_management(status);
