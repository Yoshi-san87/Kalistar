-- Four character battles, followed by three separately claimed secret chapters.
begin;
alter table kalistar_private.journeys drop constraint journeys_stage_count_check;
alter table kalistar_private.journeys add constraint journeys_stage_count_check check(stage_count in (4,7));
alter table kalistar_private.journey_progress drop constraint journey_progress_cleared_check;
alter table kalistar_private.journey_progress add constraint journey_progress_cleared_check check(cleared between 0 and 7);
alter table kalistar_private.journey_attempts drop constraint journey_attempts_stage_check;
alter table kalistar_private.journey_attempts add constraint journey_attempts_stage_check check(stage between 0 and 6);

create table kalistar_private.journey_equipment_rewards (
  book_id text not null references kalistar_private.journeys(id),
  stage integer not null check(stage between 4 and 6),
  equipment_id text not null check(equipment_id ~ '^[a-z0-9][a-z0-9_-]{0,95}$'),
  kind text not null check(kind in ('weapon','shield','relic')),
  primary key(book_id,stage), unique(book_id,equipment_id),
  check((stage=4 and kind='weapon') or (stage=5 and kind='shield') or (stage=6 and kind='relic'))
);
create table kalistar_private.journey_equipment_claims (
  user_id uuid not null references auth.users(id), book_id text not null, stage integer not null,
  equipment_id text not null, already_owned boolean not null, acknowledged boolean not null default false,
  created_at timestamptz not null default clock_timestamp(), primary key(user_id,book_id,stage),
  foreign key(book_id,stage) references kalistar_private.journey_equipment_rewards(book_id,stage),
  foreign key(user_id,equipment_id) references kalistar_private.equipment_grants(user_id,equipment_id)
);
alter table kalistar_private.journey_equipment_rewards enable row level security;
alter table kalistar_private.journey_equipment_claims enable row level security;
revoke all on kalistar_private.journey_equipment_rewards,kalistar_private.journey_equipment_claims from public,anon,authenticated;
insert into kalistar_private.journey_equipment_rewards(book_id,stage,equipment_id,kind) values
 ('momo-petits-bonheurs',4,'little-joys-flute','weapon'),
 ('momo-petits-bonheurs',5,'kalistar-chroma-harness','shield'),
 ('momo-petits-bonheurs',6,'little-joys-box','relic'),
 ('balmhyr-retour',4,'mythic-iron-gauntlet','weapon'),
 ('balmhyr-retour',5,'durane-rampart','shield'),
 ('balmhyr-retour',6,'exiled-king-seal','relic'),
 ('kaylis-prochain-pas',4,'white-oath-rapier','weapon'),
 ('kaylis-prochain-pas',5,'kaylis-next-step-boots','shield'),
 ('kaylis-prochain-pas',6,'kaylis-colours-ribbon','relic');
update kalistar_private.journeys set stage_count=7 where id in ('momo-petits-bonheurs','balmhyr-retour','kaylis-prochain-pas');

create or replace function public.kalistar_journey_library() returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=kalistar_private.actor(); books jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object('id',j.id,'revision',j.revision,'rewardModelId',j.reward_model_id,'cleared',coalesce(p.cleared,0),
    'completed',coalesce(p.cleared,0)>=4,'claimed',c.user_id is not null,'acknowledged',coalesce(c.acknowledged,false),'alreadyOwned',coalesce(c.already_owned,false),
    'finished',coalesce(p.cleared,0)=j.stage_count and c.user_id is not null and
      (select count(*) from kalistar_private.journey_equipment_claims ec where ec.user_id=actor and ec.book_id=j.id)=j.stage_count-4,
    'equipmentClaims',coalesce((select jsonb_agg(jsonb_build_object('stage',ec.stage,'equipmentId',ec.equipment_id,'kind',er.kind,
      'alreadyOwned',ec.already_owned,'acknowledged',ec.acknowledged) order by ec.stage)
      from kalistar_private.journey_equipment_claims ec join kalistar_private.journey_equipment_rewards er using(book_id,stage)
      where ec.user_id=actor and ec.book_id=j.id),'[]'::jsonb),
    'activeAttempt',(select jsonb_build_object('id',a.id,'stage',a.stage,'phase',a.state->>'phase') from kalistar_private.journey_attempts a
      where a.user_id=actor and a.book_id=j.id and a.status='active')) order by j.id),'[]'::jsonb)
    into books from kalistar_private.journeys j left join kalistar_private.journey_progress p on p.book_id=j.id and p.user_id=actor
      left join kalistar_private.journey_claims c on c.book_id=j.id and c.user_id=actor where j.enabled;
  return jsonb_build_object('isAdmin',exists(select 1 from kalistar_private.admins where user_id=actor),'books',books);
end $$;

-- The existing public -> equipment -> input-bounds wrappers remain in place.
-- Replace only their innermost start operation, retaining locks, rate and ownership checks.
create or replace function kalistar_private.kalistar_journey_start_before_bounds(p_book_id text,p_deck jsonb,p_device_id uuid,p_runtime_hash text)
returns jsonb language plpgsql security definer set search_path='' as $$
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
  if progress.cleared>=book.stage_count then raise exception 'Ce livre est deja acheve.' using errcode='22023'; end if;
  if progress.cleared>=4 and not exists(select 1 from kalistar_private.journey_claims where user_id=actor and book_id=book.id and acknowledged) then
    raise exception 'Recois la carte et decouvre la suite du livre.' using errcode='42501';
  end if;
  if progress.cleared>=5 and not exists(select 1 from kalistar_private.journey_equipment_claims
      where user_id=actor and book_id=book.id and stage=progress.cleared-1 and acknowledged) then
    raise exception 'Recois la recompense du chapitre precedent.' using errcode='42501';
  end if;
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

create or replace function public.kalistar_journey_claim(p_book_id text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=kalistar_private.actor(); book kalistar_private.journeys; claim kalistar_private.journey_claims; item public.kalistar_collectibles; existed boolean;
begin
  perform 1 from public.kalistar_profiles where user_id=actor for update;
  if not found then raise exception 'Profil Kalistar requis.' using errcode='42501'; end if;
  select * into book from kalistar_private.journeys where id=p_book_id and enabled;
  if book.id is null or not exists(select 1 from kalistar_private.journey_progress where user_id=actor and book_id=book.id and cleared>=4) then
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

create function public.kalistar_journey_equipment_claim(p_book_id text,p_stage integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=kalistar_private.actor(); reward kalistar_private.journey_equipment_rewards; claim kalistar_private.journey_equipment_claims; existed boolean;
begin
  perform 1 from public.kalistar_profiles where user_id=actor for update;
  if not found then raise exception 'Profil Kalistar requis.' using errcode='42501'; end if;
  select r.* into reward from kalistar_private.journey_equipment_rewards r join kalistar_private.journeys j on j.id=r.book_id
    where r.book_id=p_book_id and r.stage=p_stage and j.enabled;
  if reward.book_id is null or not exists(select 1 from kalistar_private.journey_progress where user_id=actor and book_id=p_book_id and cleared>=p_stage+1)
    or not exists(select 1 from kalistar_private.journey_claims where user_id=actor and book_id=p_book_id and acknowledged) then
    raise exception 'Termine ce chapitre pour recevoir son equipement.' using errcode='42501';
  end if;
  select * into claim from kalistar_private.journey_equipment_claims where user_id=actor and book_id=p_book_id and stage=p_stage;
  if claim.user_id is not null then return jsonb_build_object('equipmentId',claim.equipment_id,'kind',reward.kind,'stage',p_stage,'alreadyOwned',claim.already_owned,'replayed',true); end if;
  if p_stage>4 and not exists(select 1 from kalistar_private.journey_equipment_claims where user_id=actor and book_id=p_book_id and stage=p_stage-1 and acknowledged) then
    raise exception 'Recois la recompense du chapitre precedent.' using errcode='42501';
  end if;
  existed:=kalistar_private.owns_equipment(actor,reward.equipment_id);
  insert into kalistar_private.equipment_grants(user_id,equipment_id,source) values(actor,reward.equipment_id,'fragment:'||p_book_id||':'||p_stage) on conflict do nothing;
  insert into kalistar_private.journey_equipment_claims(user_id,book_id,stage,equipment_id,already_owned) values(actor,p_book_id,p_stage,reward.equipment_id,existed);
  return jsonb_build_object('equipmentId',reward.equipment_id,'kind',reward.kind,'stage',p_stage,'alreadyOwned',existed,'replayed',false);
end $$;
create function public.kalistar_journey_equipment_ack(p_book_id text,p_stage integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=kalistar_private.actor();
begin
  update kalistar_private.journey_equipment_claims set acknowledged=true where user_id=actor and book_id=p_book_id and stage=p_stage;
  return public.kalistar_journey_library();
end $$;
revoke all on function public.kalistar_journey_equipment_claim(text,integer),public.kalistar_journey_equipment_ack(text,integer) from public,anon,authenticated;
grant execute on function public.kalistar_journey_equipment_claim(text,integer),public.kalistar_journey_equipment_ack(text,integer) to authenticated;
revoke all on all functions in schema kalistar_private from public,anon,authenticated;
update kalistar_private.registry_version set version=11;
commit;
