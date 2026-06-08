alter table public.employees
  add column if not exists user_id uuid,
  add column if not exists source_email text;

create unique index if not exists idx_employees_user_id_unique
  on public.employees(user_id)
  where user_id is not null;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'employees_name_key'
  ) then
    alter table public.employees
      drop constraint employees_name_key;
  end if;
end
$$;
