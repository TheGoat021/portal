do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'voice_agents_user_id_fkey'
  ) then
    alter table public.voice_agents
      drop constraint voice_agents_user_id_fkey;
  end if;
end
$$;

alter table public.voice_agents
  add constraint voice_agents_user_id_fkey
  foreign key (user_id)
  references public.portal_users(id)
  on delete set null;

update public.voice_agents va
set name = coalesce(nullif(btrim(va.name), ''), pu.email, 'Usuario sem nome')
from public.portal_users pu
where va.user_id = pu.id
  and (va.name is null or btrim(va.name) = '');

create or replace view public.voice_agent_directory_view as
select
  va.id,
  va.user_id,
  coalesce(nullif(btrim(va.name), ''), pu.email, 'Usuario sem nome') as name,
  pu.email,
  va.extension,
  va.status,
  va.current_call_id,
  va.created_at,
  va.updated_at
from public.voice_agents va
join public.portal_users pu on pu.id = va.user_id;
