create or replace function public.handle_new_ryu_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate_username text := lower(coalesce(new.raw_user_meta_data ->> 'username', ''));
  candidate_display_name text := coalesce(
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'name', '')), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Ryu member'
  );
begin
  insert into public.profiles (id, username, display_name, updated_at)
  values (new.id, nullif(candidate_username, ''), candidate_display_name, now());
  return new;
end;
$$;

revoke all on function public.handle_new_ryu_profile() from public, anon, authenticated;
