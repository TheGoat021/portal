alter table public.voice_calls
  add column if not exists called_number text null,
  add column if not exists did_number text null,
  add column if not exists dialed_extension text null;

create index if not exists idx_voice_calls_called_number
  on public.voice_calls (called_number)
  where called_number is not null;

create index if not exists idx_voice_calls_did_number
  on public.voice_calls (did_number)
  where did_number is not null;

create index if not exists idx_voice_calls_dialed_extension
  on public.voice_calls (dialed_extension)
  where dialed_extension is not null;
