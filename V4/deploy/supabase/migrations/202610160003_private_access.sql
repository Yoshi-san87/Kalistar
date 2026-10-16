-- Closed access: authorization is bound to both a stable Auth user and verified email.
begin;
create table kalistar_private.players (
  user_id uuid primary key references auth.users(id) on delete restrict,
  email_sha256 bytea not null unique check(octet_length(email_sha256)=32),
  local_profile text not null unique check(local_profile ~ '^user-[a-z0-9_-]{3,40}$'),
  label text not null check(length(label) between 1 and 40)
);
alter table kalistar_private.players enable row level security;
revoke all on kalistar_private.players from public,anon,authenticated;

create or replace function kalistar_private.actor() returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid := auth.uid();
begin
  if actor is null or not exists (
    select 1 from auth.users u join kalistar_private.players p on p.user_id=u.id
    where u.id=actor and u.email_confirmed_at is not null
      and p.email_sha256=extensions.digest(lower(trim(u.email)),'sha256')
  ) then raise exception 'Acces Kalistar non autorise.' using errcode='42501'; end if;
  return actor;
end $$;
create function public.kalistar_access() returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid := kalistar_private.actor(); result jsonb;
begin
  select jsonb_build_object('localProfile',local_profile,'label',label) into result
    from kalistar_private.players where user_id=actor;
  return result;
end $$;
revoke all on function public.kalistar_access() from public,anon,authenticated;
grant execute on function public.kalistar_access() to authenticated;

-- The former public projection is retained internally, not exposed anonymously.
alter function public.kalistar_certificate(text) set schema kalistar_private;
revoke all on function kalistar_private.kalistar_certificate(text) from public,anon,authenticated;
create function public.kalistar_certificate(p_id text) returns jsonb language plpgsql security definer set search_path='' as $$
begin
  perform kalistar_private.actor();
  return kalistar_private.kalistar_certificate(p_id);
end $$;
revoke all on function public.kalistar_certificate(text) from public,anon,authenticated;
grant execute on function public.kalistar_certificate(text) to authenticated;
revoke select on public.kalistar_models from anon;
alter policy kalistar_models_read on public.kalistar_models using ((select public.kalistar_access()) is not null);
alter policy kalistar_profile_self on public.kalistar_profiles using (user_id=(select auth.uid()) and (select public.kalistar_access()) is not null);
alter policy kalistar_cards_self on public.kalistar_collectibles using (owner_id=(select auth.uid()) and (select public.kalistar_access()) is not null);
alter policy kalistar_transfers_self on public.kalistar_transfers using ((select auth.uid()) in (sender_id,recipient_id) and (select public.kalistar_access()) is not null);
update kalistar_private.registry_version set version=2;
commit;
