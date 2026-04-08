create table if not exists public.meta_chatbot_flows (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null unique references public.whatsapp_meta_connections(id) on delete cascade,
  draft_flow jsonb not null default '{"nodes":[],"edges":[]}'::jsonb,
  published_flow jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create index if not exists idx_meta_chatbot_flows_connection_id
  on public.meta_chatbot_flows(connection_id);

create table if not exists public.meta_chatbot_sessions (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.whatsapp_meta_connections(id) on delete cascade,
  conversation_id uuid not null references public.meta_conversations(id) on delete cascade,
  current_node_id text,
  state text not null default 'active',
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (connection_id, conversation_id)
);

create index if not exists idx_meta_chatbot_sessions_connection_id
  on public.meta_chatbot_sessions(connection_id);

create index if not exists idx_meta_chatbot_sessions_conversation_id
  on public.meta_chatbot_sessions(conversation_id);

