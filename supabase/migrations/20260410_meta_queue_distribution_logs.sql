create table if not exists public.meta_queue_distribution_logs (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.whatsapp_meta_connections(id) on delete cascade,
  conversation_id uuid references public.meta_conversations(id) on delete set null,
  department text,
  status text not null,
  reason text,
  selected_user_id uuid references public.profiles(id) on delete set null,
  selected_user_email text,
  candidates_count integer,
  eligible_count integer,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_meta_queue_distribution_logs_connection_created
  on public.meta_queue_distribution_logs(connection_id, created_at desc);

create index if not exists idx_meta_queue_distribution_logs_conversation
  on public.meta_queue_distribution_logs(conversation_id);

