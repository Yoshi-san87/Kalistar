-- Four-battle character journeys. Only signed server-engine frames advance them.
begin;
create table kalistar_private.journey_config(id boolean primary key default true check(id), signing_key text not null check(length(signing_key)>=43));
create table kalistar_private.journeys(id text primary key,revision text not null,reward_model_id text not null unique references public.kalistar_models(id),stage_count integer not null check(stage_count=4),enabled boolean not null default true);
create table kalistar_private.journey_progress(
  user_id uuid not null references auth.users(id),book_id text not null references kalistar_private.journeys(id),
  cleared integer not null default 0 check(cleared between 0 and 4),updated_at timestamptz not null default now(),primary key(user_id,book_id)
);
create table kalistar_private.journey_attempts(
  id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),book_id text not null references kalistar_private.journeys(id),
  revision text not null,stage integer not null check(stage between 0 and 3),seed text not null,deck jsonb not null,cards jsonb not null,
  runtime_hash text not null check(runtime_hash ~ '^[a-f0-9]{64}$'),sequence integer not null default 0 check(sequence between 0 and 8000),state jsonb,
  status text not null default 'active' check(status in ('active','won','lost','abandoned')),created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create unique index kalistar_journey_one_active on kalistar_private.journey_attempts(user_id) where status='active';
create index kalistar_journey_attempt_owner on kalistar_private.journey_attempts(user_id,created_at desc);
create table kalistar_private.journey_claims(
  user_id uuid not null references auth.users(id),book_id text not null references kalistar_private.journeys(id),reward_model_id text not null references public.kalistar_models(id),
  collectible_id uuid not null references public.kalistar_collectibles(id),already_owned boolean not null,acknowledged boolean not null default false,created_at timestamptz not null default now(),
  primary key(user_id,book_id),unique(user_id,reward_model_id)
);
alter table kalistar_private.journey_config enable row level security;
alter table kalistar_private.journeys enable row level security;
alter table kalistar_private.journey_progress enable row level security;
alter table kalistar_private.journey_attempts enable row level security;
alter table kalistar_private.journey_claims enable row level security;
revoke all on kalistar_private.journey_config,kalistar_private.journeys,kalistar_private.journey_progress,kalistar_private.journey_attempts,kalistar_private.journey_claims from public,anon,authenticated;

create function kalistar_private.journey_lease(p_user uuid,p_device uuid) returns void language plpgsql security definer set search_path='' as $$
begin
  if p_device is null or not exists(select 1 from kalistar_private.player_saves where user_id=p_user and device_id=p_device and lease_until>clock_timestamp()) then
    raise exception 'Reprends la sauvegarde sur cet appareil avant de jouer.' using errcode='42501';
  end if;
end $$;
create function kalistar_private.journey_view(p_id uuid,p_user uuid) returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object('id',a.id,'bookId',a.book_id,'revision',a.revision,'stage',a.stage,'seed',a.seed,'deck',a.deck,'cards',a.cards,
    'runtimeHash',a.runtime_hash,'sequence',a.sequence,'state',a.state,'status',a.status,'localProfile',p.local_profile,'actorId',p_user)
  from kalistar_private.journey_attempts a join kalistar_private.players p on p.user_id=a.user_id where a.id=p_id and a.user_id=p_user;
$$;
create function public.kalistar_journey_library() returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=kalistar_private.actor(); books jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object('id',j.id,'revision',j.revision,'rewardModelId',j.reward_model_id,'cleared',coalesce(p.cleared,0),
    'completed',coalesce(p.cleared,0)=4,'claimed',c.user_id is not null,'acknowledged',coalesce(c.acknowledged,false),'alreadyOwned',coalesce(c.already_owned,false),
    'activeAttempt',(select jsonb_build_object('id',a.id,'stage',a.stage,'phase',a.state->>'phase') from kalistar_private.journey_attempts a where a.user_id=actor and a.book_id=j.id and a.status='active')) order by j.id),'[]'::jsonb)
    into books from kalistar_private.journeys j left join kalistar_private.journey_progress p on p.book_id=j.id and p.user_id=actor
      left join kalistar_private.journey_claims c on c.book_id=j.id and c.user_id=actor where j.enabled;
  return jsonb_build_object('isAdmin',exists(select 1 from kalistar_private.admins where user_id=actor),'books',books);
end $$;
create function public.kalistar_journey_start(p_book_id text,p_deck jsonb,p_device_id uuid,p_runtime_hash text) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=kalistar_private.actor(); book kalistar_private.journeys; progress kalistar_private.journey_progress; attempt kalistar_private.journey_attempts; cards jsonb;
begin
  perform kalistar_private.journey_lease(actor,p_device_id);
  perform 1 from public.kalistar_profiles where user_id=actor for update;
  if not found then raise exception 'Profil Kalistar requis.' using errcode='42501'; end if;
  select * into book from kalistar_private.journeys where id=p_book_id and enabled;
  if book.id is null or p_runtime_hash is null or p_runtime_hash !~ '^[a-f0-9]{64}$' then raise exception 'Parcours indisponible.' using errcode='22023'; end if;
  select * into attempt from kalistar_private.journey_attempts where user_id=actor and status='active' for update;
  if attempt.id is not null then
    if attempt.book_id=book.id then return kalistar_private.journey_view(attempt.id,actor); end if;
    raise exception 'Un autre parcours a un combat en cours.' using errcode='22023';
  end if;
  insert into kalistar_private.journey_progress(user_id,book_id) values(actor,book.id) on conflict do nothing;
  select * into progress from kalistar_private.journey_progress where user_id=actor and book_id=book.id for update;
  if progress.cleared>=4 then raise exception 'Ce livre est deja acheve.' using errcode='22023'; end if;
  if (select count(*) from kalistar_private.journey_attempts where user_id=actor and created_at>clock_timestamp()-interval '1 hour')>=20 then
    raise exception 'Trop de lancements rapproches. Reessaie un peu plus tard.' using errcode='22023';
  end if;
  perform kalistar_private.check_cards(actor,p_deck->'cards',true);
  select jsonb_agg(jsonb_build_object('id',kalistar_private.public_id(c.id),'modelId',c.model_id) order by c.model_id) into cards
    from public.kalistar_collectibles c where c.owner_id=actor and c.status='owned' and c.model_id in(select jsonb_array_elements_text(p_deck->'cards'));
  insert into kalistar_private.journey_attempts(user_id,book_id,revision,stage,seed,deck,cards,runtime_hash)
    values(actor,book.id,book.revision,progress.cleared,encode(extensions.gen_random_bytes(24),'hex'),p_deck,cards,p_runtime_hash) returning * into attempt;
  return kalistar_private.journey_view(attempt.id,actor);
end $$;
create function public.kalistar_journey_context(p_attempt_id uuid,p_device_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=kalistar_private.actor(); result jsonb;
begin
  perform kalistar_private.journey_lease(actor,p_device_id);
  result:=kalistar_private.journey_view(p_attempt_id,actor);
  if result is null then raise exception 'Combat de parcours indisponible.' using errcode='42501'; end if;
  return result;
end $$;
create function public.kalistar_journey_commit(p_frame text,p_signature text,p_device_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=kalistar_private.actor(); frame jsonb; secret text; attempt kalistar_private.journey_attempts; game jsonb; binding record;
begin
  perform kalistar_private.journey_lease(actor,p_device_id);
  if p_frame is null or octet_length(p_frame)>1048576 or p_signature is null or p_signature !~ '^[a-f0-9]{64}$' then raise exception 'Preuve de combat invalide.' using errcode='42501'; end if;
  select signing_key into secret from kalistar_private.journey_config where id;
  if secret is null or extensions.hmac(convert_to('kalistar-journey-v1:'||p_frame,'UTF8'),convert_to(secret,'UTF8'),'sha256')<>decode(p_signature,'hex') then
    raise exception 'Preuve de combat invalide.' using errcode='42501';
  end if;
  frame:=p_frame::jsonb;game:=frame->'state';
  if frame->>'actorId' is distinct from actor::text then raise exception 'Preuve d un autre compte.' using errcode='42501'; end if;
  select * into attempt from kalistar_private.journey_attempts where id=(frame->>'attemptId')::uuid and user_id=actor for update;
  if attempt.id is null or attempt.status<>'active' or (frame->>'sequence')::integer<>attempt.sequence+1 or frame->>'runtimeHash' is distinct from attempt.runtime_hash
    or game->>'matchId' is distinct from 'match-'||attempt.id::text or game->'journey'->>'attemptId' is distinct from attempt.id::text
    or game->'journey'->>'bookId' is distinct from attempt.book_id or (game->'journey'->>'stage')::integer<>attempt.stage
    or (game->'journey'->>'sequence')::integer<>attempt.sequence+1 or game->'collection'->>'userId' is distinct from (select local_profile from kalistar_private.players where user_id=actor)
    then raise exception 'Ce combat a change. Reprends son etat sauvegarde.' using errcode='22023'; end if;
  for binding in select key,value from jsonb_each_text(game->'collection'->'bindings') loop
    if not exists(select 1 from public.kalistar_collectibles c where c.id=kalistar_private.card_id(binding.value) and c.owner_id=actor and c.status='owned') then
      raise exception 'Un exemplaire du combat n est plus disponible.' using errcode='42501';
    end if;
  end loop;
  update kalistar_private.journey_attempts set state=game,sequence=attempt.sequence+1,updated_at=clock_timestamp(),
    status=case when game->>'phase'='over' then case when game->>'winner'='0' then 'won' else 'lost' end else 'active' end where id=attempt.id;
  if game->>'phase'='over' and game->>'winner'='0' then
    update kalistar_private.journey_progress set cleared=attempt.stage+1,updated_at=clock_timestamp() where user_id=actor and book_id=attempt.book_id and cleared=attempt.stage;
    if not found then raise exception 'Etape de parcours incoherente.' using errcode='22023'; end if;
  end if;
  return kalistar_private.journey_view(attempt.id,actor);
end $$;
create function public.kalistar_journey_abandon(p_attempt_id uuid,p_device_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=kalistar_private.actor();
begin
  perform kalistar_private.journey_lease(actor,p_device_id);
  update kalistar_private.journey_attempts set status='abandoned',updated_at=clock_timestamp() where id=p_attempt_id and user_id=actor and status='active';
  return public.kalistar_journey_library();
end $$;
create function public.kalistar_journey_claim(p_book_id text) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=kalistar_private.actor(); book kalistar_private.journeys; claim kalistar_private.journey_claims; item public.kalistar_collectibles; existed boolean;
begin
  perform 1 from public.kalistar_profiles where user_id=actor for update;
  if not found then raise exception 'Profil Kalistar requis.' using errcode='42501'; end if;
  select * into book from kalistar_private.journeys where id=p_book_id and enabled;
  if book.id is null or not exists(select 1 from kalistar_private.journey_progress where user_id=actor and book_id=book.id and cleared=4) then
    raise exception 'Termine les quatre combats pour recevoir cette carte.' using errcode='42501';
  end if;
  select * into claim from kalistar_private.journey_claims where user_id=actor and book_id=book.id;
  if claim.user_id is not null then return jsonb_build_object('card',public.kalistar_certificate(kalistar_private.public_id(claim.collectible_id)),'alreadyOwned',claim.already_owned,'replayed',true); end if;
  select * into item from public.kalistar_collectibles where owner_id=actor and model_id=book.reward_model_id and status='owned' for update;
  existed:=item.id is not null;
  if not existed then
    insert into public.kalistar_collectibles(model_id,owner_id,status,pilot,activated_at) values(book.reward_model_id,actor,'owned',false,clock_timestamp()) returning * into item;
    insert into kalistar_private.activations(collectible_id,secret_hash,used_at) values(item.id,extensions.digest(extensions.gen_random_bytes(32),'sha256'),clock_timestamp());
    insert into kalistar_private.events(collectible_id,actor_id,kind) values(item.id,actor,'issued'),(item.id,actor,'activated');
  end if;
  insert into kalistar_private.journey_claims(user_id,book_id,reward_model_id,collectible_id,already_owned) values(actor,book.id,book.reward_model_id,item.id,existed);
  return jsonb_build_object('card',public.kalistar_certificate(kalistar_private.public_id(item.id)),'alreadyOwned',existed,'replayed',false);
end $$;
create function public.kalistar_journey_ack(p_book_id text) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=kalistar_private.actor();
begin
  update kalistar_private.journey_claims set acknowledged=true where user_id=actor and book_id=p_book_id;
  return public.kalistar_journey_library();
end $$;
create function kalistar_private.journey_transfer_guard() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if (new.owner_id is distinct from old.owner_id or new.status is distinct from old.status) and exists(
    select 1 from kalistar_private.journey_attempts a where a.user_id=old.owner_id and a.status='active'
      and a.cards @> jsonb_build_array(jsonb_build_object('id',kalistar_private.public_id(old.id)))
  ) then raise exception 'Cette carte est engagee dans un parcours. Termine ou abandonne le combat avant son transfert.' using errcode='22023'; end if;
  return new;
end $$;
create trigger kalistar_journey_bound_transfer before update on public.kalistar_collectibles for each row execute function kalistar_private.journey_transfer_guard();

alter function public.kalistar_offer(text,text) rename to kalistar_offer_before_journey;
alter function public.kalistar_offer_before_journey(text,text) set schema kalistar_private;
create function public.kalistar_offer(p_id text,p_recipient text) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=kalistar_private.actor();
begin
  perform 1 from public.kalistar_collectibles where id=kalistar_private.card_id(p_id) and owner_id=actor for update;
  if exists(select 1 from kalistar_private.journey_attempts a where a.user_id=actor and a.status='active'
    and a.cards @> jsonb_build_array(jsonb_build_object('id',p_id))) then
    raise exception 'Cette carte est engagee dans un parcours. Termine ou abandonne le combat avant son transfert.' using errcode='22023';
  end if;
  return kalistar_private.kalistar_offer_before_journey(p_id,p_recipient);
end $$;

-- These two published versions are already in the live catalogue; empty test databases also need their metadata.
insert into public.kalistar_models(id,character_id,name,title) values
  ('49900802','balmhyr','BALMHYR','LE POIDS DU RETOUR'),
  ('49055457','kaylis','KAYLIS','L''ELAN DES COULEURS') on conflict(id) do nothing;
insert into kalistar_private.journeys(id,revision,reward_model_id,stage_count) values
  ('momo-petits-bonheurs','journeys-1','30000001',4),
  ('balmhyr-retour','journeys-1','49900802',4),
  ('kaylis-prochain-pas','journeys-1','49055457',4);
revoke all on all functions in schema kalistar_private from public,anon,authenticated;
revoke all on function public.kalistar_journey_library(),public.kalistar_journey_start(text,jsonb,uuid,text),public.kalistar_journey_context(uuid,uuid),public.kalistar_journey_commit(text,text,uuid),public.kalistar_journey_abandon(uuid,uuid),public.kalistar_journey_claim(text),public.kalistar_journey_ack(text) from public,anon,authenticated;
grant execute on function public.kalistar_journey_library(),public.kalistar_journey_start(text,jsonb,uuid,text),public.kalistar_journey_context(uuid,uuid),public.kalistar_journey_commit(text,text,uuid),public.kalistar_journey_abandon(uuid,uuid),public.kalistar_journey_claim(text),public.kalistar_journey_ack(text) to authenticated;
revoke all on function public.kalistar_offer(text,text) from public,anon,authenticated;
grant execute on function public.kalistar_offer(text,text) to authenticated;
update kalistar_private.registry_version set version=7;
commit;
