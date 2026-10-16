-- Account-scoped progress, optimistic concurrency and one short-lived writer.
begin;
alter table public.kalistar_models add column positions smallint[] not null default '{}';
alter table public.kalistar_models add column element text not null default 'NONE';
alter table kalistar_private.players add column starter_deck jsonb not null default '[]';
create table kalistar_private.starter_grants (
  user_id uuid not null references auth.users(id) on delete restrict,
  grant_key text not null,
  model_id text not null references public.kalistar_models(id) on delete restrict,
  collectible_id uuid not null unique references public.kalistar_collectibles(id) on delete restrict,
  primary key(user_id,grant_key,model_id)
);
create table kalistar_private.player_saves (
  user_id uuid primary key references auth.users(id) on delete restrict,
  revision bigint not null default 0 check(revision>=0),
  payload jsonb,
  updated_at timestamptz,
  device_id uuid,
  lease_until timestamptz
);
alter table kalistar_private.starter_grants enable row level security;
alter table kalistar_private.player_saves enable row level security;
revoke all on kalistar_private.starter_grants,kalistar_private.player_saves from public,anon,authenticated;

create function kalistar_private.save_view(p_user uuid) returns jsonb language sql stable security definer set search_path='' as $$
  select coalesce((select jsonb_build_object('revision',s.revision,'updatedAt',s.updated_at,'payload',s.payload,
    'lease',jsonb_build_object('deviceId',s.device_id,'until',s.lease_until))
    from kalistar_private.player_saves s where s.user_id=p_user),
    '{"revision":0,"updatedAt":null,"payload":null,"lease":{"deviceId":null,"until":null}}'::jsonb);
$$;
create function public.kalistar_sync_read() returns jsonb language plpgsql security definer set search_path='' as $$
begin return kalistar_private.save_view(kalistar_private.actor()); end $$;

create function public.kalistar_player() returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=kalistar_private.actor(); result jsonb;
begin
  select jsonb_build_object('localProfile',p.local_profile,'label',p.label,'starterDeck',p.starter_deck,
    'cards',public.kalistar_my_cards(),
    'pending',coalesce((select jsonb_agg(kalistar_private.public_id(t.collectible_id)) from public.kalistar_transfers t where t.sender_id=actor and t.status='pending'),'[]'::jsonb))
    into result from kalistar_private.players p where p.user_id=actor;
  return result;
end $$;

create function kalistar_private.check_cards(p_user uuid,p_cards jsonb,p_full boolean default false) returns void language plpgsql security definer set search_path='' as $$
declare ids text[]; required record; covered boolean;
begin
  if jsonb_typeof(p_cards) is distinct from 'array' or jsonb_array_length(p_cards)>10 then raise exception 'Dix cartes maximum.' using errcode='22023'; end if;
  select coalesce(array_agg(x),'{}'::text[]) into ids from jsonb_array_elements_text(p_cards) x;
  if p_full and cardinality(ids)<>10 then raise exception 'Dix cartes requises.' using errcode='22023'; end if;
  -- Shared locks serialize ownership checks with issuance/transfer updates.
  perform c.id from public.kalistar_collectibles c where c.owner_id=p_user and c.model_id=any(ids) order by c.id for share;
  for required in select x as id,count(*) as n from unnest(ids) x group by x loop
    if (select count(*) from public.kalistar_collectibles c where c.owner_id=p_user and c.status='owned' and c.model_id=required.id
      and not exists(select 1 from public.kalistar_transfers t where t.collectible_id=c.id and t.status='pending')) < required.n
      then raise exception 'Une carte du deck n est pas disponible dans ta collection.' using errcode='42501'; end if;
  end loop;
  if not p_full then return; end if;
  if (select count(distinct m.character_id) from public.kalistar_models m where m.id=any(ids))<>10 then raise exception 'Un seul exemplaire par personnage dans le deck.' using errcode='22023'; end if;
  if (select count(*) from public.kalistar_models m where m.id=any(ids) and m.element='RAINBOW')>1 then raise exception 'Une seule carte Rainbow.' using errcode='22023'; end if;
  if exists(select 1 from generate_series(1,5) p where (select count(*) from public.kalistar_models m where m.id=any(ids) and p=any(m.positions))<2) then raise exception 'Deux cartes compatibles par position requises.' using errcode='22023'; end if;
  with recursive lineup(pos,used) as (
    select 1,'{}'::text[] union all
    select l.pos+1,l.used||m.id from lineup l join public.kalistar_models m on m.id=any(ids) and l.pos=any(m.positions) and not m.id=any(l.used) where l.pos<=5
  ) select exists(select 1 from lineup where pos=6) into covered;
  if not covered then raise exception 'Formation P1 a P5 impossible.' using errcode='22023'; end if;
end $$;
create function public.kalistar_validate_deck(p_cards jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
begin perform kalistar_private.check_cards(kalistar_private.actor(),p_cards,true); return jsonb_build_object('ok',true); end $$;

create function kalistar_private.check_save(p_user uuid,p_payload jsonb) returns void language plpgsql security definer set search_path='' as $$
declare profile text; active jsonb; binding record; own_cards jsonb; row jsonb;
begin
  select local_profile into profile from kalistar_private.players where user_id=p_user;
  if p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>8388608
    or p_payload->>'schema' is distinct from '1' or p_payload->>'edition' is distinct from 'V4'
    or p_payload->>'localProfile' is distinct from profile
    or exists(select 1 from jsonb_object_keys(p_payload) k where k not in ('schema','edition','localProfile','preferences','deckLibrary','equipment','matches','activeMatchId','releasedMatches'))
    or jsonb_typeof(p_payload->'preferences') is distinct from 'object'
    or jsonb_typeof(p_payload->'deckLibrary') is distinct from 'object'
    or jsonb_typeof(p_payload->'equipment') is distinct from 'object'
    or jsonb_typeof(p_payload->'matches') is distinct from 'array'
    or jsonb_array_length(p_payload->'matches')>500
    or jsonb_typeof(p_payload->'releasedMatches') is distinct from 'array'
    or jsonb_array_length(p_payload->'releasedMatches')>500
    then raise exception 'Sauvegarde de progression invalide ou trop volumineuse.' using errcode='22023'; end if;
  if exists(select 1 from jsonb_object_keys(p_payload->'preferences') k where k not in ('deck','deckName','teamDraft','favorites','deckPreset','enemyDeckPreset','story-progress','boardScale','arena','openingMatch'))
    or p_payload->'equipment'->>'id' is distinct from profile then raise exception 'Profil de progression invalide.' using errcode='22023'; end if;
  for row in select value from jsonb_array_elements(p_payload->'matches') loop
    if row->>'id' is null or row->>'id' is distinct from row->'state'->>'matchId'
      or row->'state'->>'schema' is distinct from '6' or row->'state'->>'edition' is distinct from 'V4'
      or row->'state'->'collection'->>'userId' is distinct from profile
      then raise exception 'Rencontre d un autre compte ou schema invalide.' using errcode='22023'; end if;
  end loop;
  if p_payload->>'activeMatchId' is null then return; end if;
  select value into active from jsonb_array_elements(p_payload->'matches') where value->>'id'=p_payload->>'activeMatchId';
  if active is null or active->'state'->>'phase'='over' or jsonb_typeof(active->'state'->'collection'->'bindings') is distinct from 'object' then raise exception 'Partie active absente.' using errcode='22023'; end if;
  select coalesce(jsonb_agg(u->>'cardId'),'[]'::jsonb) into own_cards from (
    select value u from jsonb_array_elements(active->'state'->'players'->0->'board') where value<>'null'::jsonb
    union all select value from jsonb_array_elements(active->'state'->'players'->0->'reserve')
    union all select value from jsonb_array_elements(active->'state'->'players'->0->'dead')
  ) units;
  perform kalistar_private.check_cards(p_user,own_cards,true);
  if (select count(*) from jsonb_each_text(active->'state'->'collection'->'bindings'))<>10
    or (select count(distinct value) from jsonb_each_text(active->'state'->'collection'->'bindings'))<>10
    then raise exception 'Exemplaires de partie dupliques.' using errcode='22023'; end if;
  for binding in select u->>'instanceId' instance_id,u->>'cardId' model_id from (
    select value u from jsonb_array_elements(active->'state'->'players'->0->'board') where value<>'null'::jsonb
    union all select value from jsonb_array_elements(active->'state'->'players'->0->'reserve')
    union all select value from jsonb_array_elements(active->'state'->'players'->0->'dead')
  ) units loop
    if not exists(select 1 from public.kalistar_collectibles c where c.id=kalistar_private.card_id(active->'state'->'collection'->'bindings'->>binding.instance_id)
      and c.owner_id=p_user and c.status='owned' and c.model_id=binding.model_id) then raise exception 'Exemplaire actif non possede.' using errcode='42501'; end if;
  end loop;
end $$;

create function public.kalistar_sync_claim(p_device_id uuid,p_expected_revision bigint,p_takeover boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=kalistar_private.actor(); s kalistar_private.player_saves;
begin
  if p_device_id is null or p_expected_revision is null or p_takeover is null then raise exception 'Appareil invalide.' using errcode='22023'; end if;
  insert into kalistar_private.player_saves(user_id) values(actor) on conflict do nothing;
  select * into s from kalistar_private.player_saves where user_id=actor for update;
  if s.revision<>p_expected_revision then return jsonb_build_object('ok',false,'code','conflict','current',kalistar_private.save_view(actor)); end if;
  if s.device_id is distinct from p_device_id and s.lease_until>clock_timestamp() and not p_takeover then return jsonb_build_object('ok',false,'code','busy','current',kalistar_private.save_view(actor)); end if;
  update kalistar_private.player_saves set device_id=p_device_id,lease_until=clock_timestamp()+interval '120 seconds' where user_id=actor;
  return jsonb_build_object('ok',true)||kalistar_private.save_view(actor);
end $$;
create function public.kalistar_sync_write(p_device_id uuid,p_expected_revision bigint,p_payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=kalistar_private.actor(); s kalistar_private.player_saves;
begin
  select * into s from kalistar_private.player_saves where user_id=actor for update;
  if s.user_id is null or s.device_id is distinct from p_device_id or s.lease_until<=clock_timestamp() then return jsonb_build_object('ok',false,'code','busy','current',kalistar_private.save_view(actor)); end if;
  if p_expected_revision is null or s.revision<>p_expected_revision then return jsonb_build_object('ok',false,'code','conflict','current',kalistar_private.save_view(actor)); end if;
  perform kalistar_private.check_save(actor,p_payload);
  update kalistar_private.player_saves set payload=p_payload,revision=revision+1,updated_at=clock_timestamp(),lease_until=clock_timestamp()+interval '120 seconds' where user_id=actor;
  return jsonb_build_object('ok',true)||kalistar_private.save_view(actor);
end $$;
create function public.kalistar_sync_release(p_device_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
begin update kalistar_private.player_saves set device_id=null,lease_until=null where user_id=kalistar_private.actor() and device_id=p_device_id; return '{"ok":true}'::jsonb; end $$;

-- A specimen already used by the synchronized active match cannot be offered.
alter function public.kalistar_offer(text,text) set schema kalistar_private;
create function public.kalistar_offer(p_id text,p_recipient text) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=kalistar_private.actor(); active jsonb;
begin
  perform c.id from public.kalistar_collectibles c where c.id=kalistar_private.card_id(p_id) and c.owner_id=actor for update;
  select m->'state' into active from kalistar_private.player_saves s,
    lateral jsonb_array_elements(s.payload->'matches') m where s.user_id=actor and m->>'id'=s.payload->>'activeMatchId';
  if active->>'phase'<>'over' and exists(select 1 from jsonb_each_text(active->'collection'->'bindings') b where b.value=p_id) then raise exception 'Cet exemplaire participe a une partie active.' using errcode='42501'; end if;
  return kalistar_private.kalistar_offer(p_id,p_recipient);
end $$;
revoke all on all functions in schema kalistar_private from public,anon,authenticated;
revoke all on function public.kalistar_player(),public.kalistar_validate_deck(jsonb),public.kalistar_sync_read(),public.kalistar_sync_claim(uuid,bigint,boolean),public.kalistar_sync_write(uuid,bigint,jsonb),public.kalistar_sync_release(uuid),public.kalistar_offer(text,text) from public,anon,authenticated;
grant execute on function public.kalistar_player(),public.kalistar_validate_deck(jsonb),public.kalistar_sync_read(),public.kalistar_sync_claim(uuid,bigint,boolean),public.kalistar_sync_write(uuid,bigint,jsonb),public.kalistar_sync_release(uuid),public.kalistar_offer(text,text) to authenticated;
update kalistar_private.registry_version set version=3;
commit;
