-- Immutable, account-private snapshots are independent of the current save.
-- Existing payloads remain intact until a v2 client commits their references.
begin;
create table kalistar_private.player_archives (
  user_id uuid not null references auth.users(id) on delete restrict,
  archive_hash text not null check(archive_hash ~ '^[a-f0-9]{64}$'),
  match_id text not null check(match_id ~ '^match-[a-f0-9-]{36}$'),
  archive_text text not null check(octet_length(archive_text)<=2097152),
  created_at timestamptz not null default clock_timestamp(),
  primary key(user_id,archive_hash)
);
create index player_archives_match on kalistar_private.player_archives(user_id,match_id);
alter table kalistar_private.player_archives enable row level security;
revoke all on kalistar_private.player_archives from public,anon,authenticated;

create function public.kalistar_archive_put(p_device_id uuid,p_expected_revision bigint,p_archives jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=kalistar_private.actor(); s kalistar_private.player_saves; item jsonb; body jsonb; hash text; profile text;
begin
  select * into s from kalistar_private.player_saves where user_id=actor for update;
  if p_device_id is null or s.device_id is distinct from p_device_id or s.lease_until is null or s.lease_until<=clock_timestamp()
    then return jsonb_build_object('ok',false,'code','busy','current',kalistar_private.save_view(actor)); end if;
  if p_expected_revision is null or s.revision<>p_expected_revision
    then return jsonb_build_object('ok',false,'code','conflict','current',kalistar_private.save_view(actor)); end if;
  if jsonb_typeof(p_archives) is distinct from 'array' or jsonb_array_length(p_archives)>8 or octet_length(p_archives::text)>6291456
    then raise exception 'Lot d archives invalide.' using errcode='22023'; end if;
  select local_profile into profile from kalistar_private.players where user_id=actor;
  for item in select value from jsonb_array_elements(p_archives) loop
    if jsonb_typeof(item->'text') is distinct from 'string' or octet_length(item->>'text')>2097152 then raise exception 'Archive invalide.' using errcode='22023'; end if;
    hash:=encode(extensions.digest(item->>'text','sha256'),'hex'); body:=(item->>'text')::jsonb;
    if hash is distinct from item->>'hash' or body->>'id' is distinct from body->'state'->>'matchId'
      or coalesce(body->>'id','') !~ '^match-[a-f0-9-]{36}$' or body->'state'->>'schema' is distinct from '6'
      or body->'state'->>'edition' is distinct from 'V4' or body->'state'->'collection'->>'userId' is distinct from profile
      or jsonb_typeof(body->'profiles') is distinct from 'array' or jsonb_typeof(body->'arenas') is distinct from 'array'
      then raise exception 'Archive d un autre compte ou corrompue.' using errcode='22023'; end if;
    insert into kalistar_private.player_archives(user_id,archive_hash,match_id,archive_text)
      values(actor,hash,body->>'id',item->>'text') on conflict do nothing;
  end loop;
  update kalistar_private.player_saves set lease_until=clock_timestamp()+interval '120 seconds' where user_id=actor;
  return '{"ok":true}'::jsonb;
end $$;

create function public.kalistar_archive_read(p_refs jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=kalistar_private.actor(); result jsonb;
begin
  if jsonb_typeof(p_refs) is distinct from 'array' or jsonb_array_length(p_refs)>8
    or exists(select 1 from jsonb_array_elements(p_refs) r where coalesce(r->>'hash','') !~ '^[a-f0-9]{64}$')
    then raise exception 'Page d archives invalide.' using errcode='22023'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',a.match_id,'hash',a.archive_hash,'text',a.archive_text) order by r.n),'[]'::jsonb) into result
    from jsonb_array_elements(p_refs) with ordinality r(ref,n)
    join kalistar_private.player_archives a on a.user_id=actor and a.archive_hash=r.ref->>'hash' and a.match_id=r.ref->>'id';
  if jsonb_array_length(result)<>jsonb_array_length(p_refs) then raise exception 'Archive indisponible.' using errcode='22023'; end if;
  return result;
end $$;

create function public.kalistar_sync_v2_read(p_known_revision bigint default null) returns jsonb language sql security definer set search_path='' as $$
  select public.kalistar_sync_read(p_known_revision);
$$;
create function public.kalistar_sync_v2_claim(p_device_id uuid,p_expected_revision bigint,p_takeover boolean default false) returns jsonb language sql security definer set search_path='' as $$
  select public.kalistar_sync_claim(p_device_id,p_expected_revision,p_takeover);
$$;
create function public.kalistar_sync_v2_release(p_device_id uuid) returns jsonb language sql security definer set search_path='' as $$
  select public.kalistar_sync_release(p_device_id);
$$;
create function public.kalistar_sync_v2_write(p_device_id uuid,p_expected_revision bigint,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=kalistar_private.actor(); s kalistar_private.player_saves; refs jsonb; legacy jsonb;
begin
  select * into s from kalistar_private.player_saves where user_id=actor for update;
  if p_device_id is null or s.device_id is distinct from p_device_id or s.lease_until is null or s.lease_until<=clock_timestamp()
    then return jsonb_build_object('ok',false,'code','busy','current',kalistar_private.save_view(actor)); end if;
  if p_expected_revision is null or s.revision<>p_expected_revision
    then return jsonb_build_object('ok',false,'code','conflict','current',kalistar_private.save_view(actor)); end if;
  refs:=p_payload->'archives';
  if p_payload->>'schema' is distinct from '2' or octet_length(p_payload::text)>8388608
    or jsonb_typeof(refs) is distinct from 'array' or jsonb_array_length(refs)>10000
    or jsonb_typeof(p_payload->'matches') is distinct from 'array' or jsonb_array_length(p_payload->'matches')>1
    or jsonb_typeof(p_payload->'releasedMatches') is distinct from 'array' or jsonb_array_length(p_payload->'releasedMatches')>10000
    then raise exception 'Progression courante invalide.' using errcode='22023'; end if;
  if exists(select 1 from jsonb_array_elements(refs) r where coalesce(r->>'id','') !~ '^match-[a-f0-9-]{36}$'
      or coalesce(r->>'hash','') !~ '^[a-f0-9]{64}$' or (select count(*) from jsonb_object_keys(r))<>2
      or r->>'id'=p_payload->>'activeMatchId'
      or not exists(select 1 from kalistar_private.player_archives a where a.user_id=actor and a.archive_hash=r->>'hash' and a.match_id=r->>'id'))
    or (select count(distinct r->>'id') from jsonb_array_elements(refs) r)<>jsonb_array_length(refs)
    or exists(select 1 from jsonb_array_elements_text(p_payload->'releasedMatches') id where id is null or id !~ '^match-[a-f0-9-]{36}$')
    or (select count(distinct id) from jsonb_array_elements_text(p_payload->'releasedMatches') id)<>jsonb_array_length(p_payload->'releasedMatches')
    or (jsonb_array_length(p_payload->'matches')=1 and (p_payload->>'activeMatchId' is null or p_payload->'matches'->0->>'id' is distinct from p_payload->>'activeMatchId'))
    then raise exception 'References d archives invalides.' using errcode='22023'; end if;
  -- Reuse the original closed-field and real-specimen checks for the active game.
  legacy:=(p_payload-'archives')||jsonb_build_object('schema',1,'releasedMatches','[]'::jsonb);
  perform kalistar_private.check_save(actor,legacy);
  update kalistar_private.player_saves set payload=p_payload,revision=revision+1,updated_at=clock_timestamp(),lease_until=clock_timestamp()+interval '120 seconds' where user_id=actor;
  return jsonb_build_object('ok',true,'unchanged',true,'payload',null)||
    (kalistar_private.save_view(actor)-'payload');
end $$;

-- Old tabs can read their old save, but cannot overwrite a migrated document.
create or replace function public.kalistar_sync_write(p_device_id uuid,p_expected_revision bigint,p_payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=kalistar_private.actor(); result jsonb; saved_schema text;
begin
  select payload->>'schema' into saved_schema from kalistar_private.player_saves where user_id=actor for update;
  if saved_schema='2' then raise exception 'Recharge Kalistar pour reprendre cette sauvegarde.' using errcode='22023'; end if;
  result:=kalistar_private.kalistar_sync_write(p_device_id,p_expected_revision,p_payload);
  if result->>'ok'='true' then return result||'{"payload":null,"unchanged":true}'::jsonb; end if;
  return result;
end $$;
revoke all on function public.kalistar_archive_put(uuid,bigint,jsonb),public.kalistar_archive_read(jsonb),public.kalistar_sync_v2_read(bigint),public.kalistar_sync_v2_claim(uuid,bigint,boolean),public.kalistar_sync_v2_write(uuid,bigint,jsonb),public.kalistar_sync_v2_release(uuid) from public,anon,authenticated;
grant execute on function public.kalistar_archive_put(uuid,bigint,jsonb),public.kalistar_archive_read(jsonb),public.kalistar_sync_v2_read(bigint),public.kalistar_sync_v2_claim(uuid,bigint,boolean),public.kalistar_sync_v2_write(uuid,bigint,jsonb),public.kalistar_sync_v2_release(uuid) to authenticated;
update kalistar_private.registry_version set version=9;
commit;
