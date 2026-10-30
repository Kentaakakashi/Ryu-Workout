create or replace function public.handle_new_ryu_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate_username text := lower(coalesce(new.raw_user_meta_data ->> 'username', ''));
  candidate_display_name text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '');
begin
  insert into public.profiles (id, username, display_name, updated_at)
  values (
    new.id,
    nullif(candidate_username, ''),
    coalesce(candidate_display_name, nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 'Ryu member'),
    now()
  );
  return new;
end;
$$;

revoke all on function public.handle_new_ryu_profile() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_ryu_profile on auth.users;
create trigger on_auth_user_created_ryu_profile
  after insert on auth.users
  for each row execute function public.handle_new_ryu_profile();
