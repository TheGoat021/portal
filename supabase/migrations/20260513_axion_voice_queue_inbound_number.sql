alter table public.voice_queues
  add column if not exists inbound_number text null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'voice_queues_inbound_number_not_blank_chk'
  ) then
    alter table public.voice_queues
      add constraint voice_queues_inbound_number_not_blank_chk
      check (inbound_number is null or char_length(btrim(inbound_number)) > 0);
  end if;
end
$$;

create unique index if not exists idx_voice_queues_inbound_number_unique
  on public.voice_queues (inbound_number)
  where inbound_number is not null;
