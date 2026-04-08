create table if not exists public.meta_conversation_management (
  conversation_id uuid primary key references public.meta_conversations(id) on delete cascade,
  connection_id uuid not null references public.whatsapp_meta_connections(id) on delete cascade,
  status text not null default 'open',
  assigned_user_id uuid references public.portal_users(id) on delete set null,
  assigned_user_email text,
  assigned_department text,
  closed_by_user_id uuid references public.portal_users(id) on delete set null,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_meta_conversation_management_status check (status in ('open', 'closed'))
);

create index if not exists idx_meta_conversation_management_connection
  on public.meta_conversation_management(connection_id);

create index if not exists idx_meta_conversation_management_assigned_user
  on public.meta_conversation_management(assigned_user_id);

