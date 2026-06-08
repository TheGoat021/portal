alter table public.voice_queues
  add column if not exists greeting_audio_url text null,
  add column if not exists greeting_audio_name text null;
