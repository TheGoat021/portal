update public.voice_agents va
set name = coalesce(nullif(btrim(va.name), ''), p.email, 'Usuario sem nome')
from public.profiles p
where va.user_id = p.id
  and (va.name is null or btrim(va.name) = '');

create or replace view public.voice_agent_directory_view as
select
  va.id,
  va.user_id,
  coalesce(nullif(btrim(va.name), ''), p.email, 'Usuario sem nome') as name,
  p.email,
  p.role,
  va.extension,
  va.status,
  va.current_call_id,
  va.created_at,
  va.updated_at
from public.voice_agents va
join public.profiles p on p.id = va.user_id;
