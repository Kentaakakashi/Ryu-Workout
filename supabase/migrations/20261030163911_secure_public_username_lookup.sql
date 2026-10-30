drop policy if exists "Public usernames are readable" on public.profiles;
create policy "Public usernames are readable"
  on public.profiles
  for select
  to anon, authenticated
  using (username is not null);

grant select (username) on public.profiles to anon, authenticated;

create or replace function public.is_ryu_username_available(candidate text)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select candidate is not null
    and candidate = lower(candidate)
    and candidate ~ '^[a-z0-9][a-z0-9_]{2,19}$'
    and not exists (
      select 1
      from public.profiles as p
      where lower(p.username) = lower(candidate)
    );
$$;

revoke all on function public.is_ryu_username_available(text) from public;
grant execute on function public.is_ryu_username_available(text) to anon, authenticated;
