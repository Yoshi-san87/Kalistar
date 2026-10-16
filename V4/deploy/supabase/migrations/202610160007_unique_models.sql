-- One owned specimen per account and model/version, without rewriting any specimen.
begin;
-- Keep the preflight and index installation atomic with respect to all writers.
lock table public.kalistar_collectibles in share row exclusive mode;
do $$
begin
  if exists (
    select 1 from public.kalistar_collectibles where status='owned'
    group by owner_id,model_id having count(*)>1
  ) then
    raise exception 'duplicate_owned_models' using errcode='23505',
      constraint='kalistar_one_owned_model',
      hint='Existing specimens must be reviewed explicitly; this migration never changes or removes them.';
  end if;
end $$;
create unique index kalistar_one_owned_model
  on public.kalistar_collectibles(owner_id,model_id) where status='owned';

-- Validate the secret before disclosing already_owned. Failed attempts still commit.
create or replace function public.kalistar_activate(p_id text,p_secret text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid := kalistar_private.actor(); rate kalistar_private.attempts; item public.kalistar_collectibles;
declare activation kalistar_private.activations; at_time timestamptz := clock_timestamp(); violated text;
begin
  if not exists(select 1 from public.kalistar_profiles where user_id=actor) then
    raise exception 'Cree ton profil Kalistar avant d activer une carte.' using errcode='42501';
  end if;
  insert into kalistar_private.attempts(user_id,window_at,attempts) values(actor,at_time,0) on conflict do nothing;
  select * into rate from kalistar_private.attempts where user_id=actor for update;
  if at_time-rate.window_at>=interval '1 minute' then rate.attempts:=0; rate.window_at:=at_time; end if;
  if rate.attempts>=5 then return jsonb_build_object('ok',false,'code','rate_limited'); end if;
  update kalistar_private.attempts set attempts=rate.attempts+1,window_at=rate.window_at where user_id=actor;
  select * into item from public.kalistar_collectibles where id=kalistar_private.card_id(p_id) for update;
  select * into activation from kalistar_private.activations where collectible_id=item.id for update;
  if item.id is null or item.status<>'unclaimed' or activation.used_at is not null or activation.secret_hash is null
    or p_secret is null or p_secret !~ '^[a-f0-9]{64}$' or activation.secret_hash<>extensions.digest(p_secret,'sha256') then
    return jsonb_build_object('ok',false,'code','activation_refused');
  end if;
  if exists(select 1 from public.kalistar_collectibles where owner_id=actor and model_id=item.model_id and status='owned') then
    return jsonb_build_object('ok',false,'code','already_owned');
  end if;
  -- A concurrent grant can win after the precheck. Roll back only the claim,
  -- leaving its secret unused and its failed-attempt counter committed.
  begin
    update public.kalistar_collectibles set owner_id=actor,status='owned',activated_at=at_time where id=item.id;
    update kalistar_private.activations set used_at=at_time where collectible_id=item.id;
    update kalistar_private.attempts set attempts=0 where user_id=actor;
    insert into kalistar_private.events(collectible_id,actor_id,kind) values(item.id,actor,'activated');
    return jsonb_build_object('ok',true,'card',public.kalistar_certificate(p_id));
  exception when unique_violation then
    get stacked diagnostics violated=constraint_name;
    if violated is distinct from 'kalistar_one_owned_model' then raise; end if;
    return jsonb_build_object('ok',false,'code','already_owned');
  end;
end $$;

-- 004's public active-match wrapper stays unchanged. Its private callee already
-- exists: rename that callee, not the public wrapper into the occupied name.
alter function kalistar_private.kalistar_offer(text,text) rename to kalistar_offer_before_unique;
create function kalistar_private.kalistar_offer(p_id text,p_recipient text)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid := kalistar_private.actor(); item public.kalistar_collectibles; recipient uuid;
begin
  select * into item from public.kalistar_collectibles where id=kalistar_private.card_id(p_id) for update;
  if item.id is null or item.owner_id is distinct from actor or item.status<>'owned' then
    raise exception 'Seul le proprietaire peut proposer ce transfert.' using errcode='42501';
  end if;
  select user_id into recipient from public.kalistar_profiles where handle=p_recipient;
  if recipient is null or recipient=actor then raise exception 'Destinataire invalide.' using errcode='22023'; end if;
  if exists(select 1 from public.kalistar_collectibles where owner_id=recipient and model_id=item.model_id and status='owned') then
    raise exception 'already_owned' using errcode='23505',constraint='kalistar_one_owned_model';
  end if;
  return kalistar_private.kalistar_offer_before_unique(p_id,p_recipient);
end $$;

alter function public.kalistar_settle(uuid,text) rename to kalistar_settle_before_unique;
alter function public.kalistar_settle_before_unique(uuid,text) set schema kalistar_private;
create function public.kalistar_settle(p_transfer uuid,p_action text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid := kalistar_private.actor(); item public.kalistar_collectibles; transfer public.kalistar_transfers; violated text;
begin
  select * into transfer from public.kalistar_transfers where id=p_transfer and actor in(sender_id,recipient_id);
  if transfer.id is null then raise exception 'Transfert indisponible.' using errcode='42501'; end if;
  -- Preserve the collectible-before-transfer locking order of the original RPC.
  select * into item from public.kalistar_collectibles where id=transfer.collectible_id for update;
  select * into transfer from public.kalistar_transfers where id=p_transfer for update;
  if transfer.status<>'pending' or item.status<>'owned' or item.owner_id<>transfer.sender_id then
    raise exception 'Ce transfert n est plus disponible.' using errcode='22023';
  end if;
  if p_action='accepted' and actor=transfer.recipient_id and exists(
    select 1 from public.kalistar_collectibles where owner_id=actor and model_id=item.model_id and status='owned'
  ) then
    raise exception 'already_owned' using errcode='23505',constraint='kalistar_one_owned_model';
  end if;
  begin
    return kalistar_private.kalistar_settle_before_unique(p_transfer,p_action);
  exception when unique_violation then
    get stacked diagnostics violated=constraint_name;
    if violated is distinct from 'kalistar_one_owned_model' then raise; end if;
    raise exception 'already_owned' using errcode='23505',constraint='kalistar_one_owned_model';
  end;
end $$;

revoke all on schema kalistar_private from public,anon,authenticated;
revoke all on all tables in schema kalistar_private from public,anon,authenticated;
revoke all on all sequences in schema kalistar_private from public,anon,authenticated;
revoke all on all functions in schema kalistar_private from public,anon,authenticated;
revoke all on function public.kalistar_activate(text,text),public.kalistar_offer(text,text),public.kalistar_settle(uuid,text) from public,anon,authenticated;
grant execute on function public.kalistar_activate(text,text),public.kalistar_offer(text,text),public.kalistar_settle(uuid,text) to authenticated;
update kalistar_private.registry_version set version=6;
commit;
