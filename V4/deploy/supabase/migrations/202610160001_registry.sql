-- Kalistar registry V1. The local demo and its player data are not imported.
begin;
create schema if not exists kalistar_private;
revoke all on schema kalistar_private from public, anon, authenticated;
create extension if not exists pgcrypto with schema extensions;

create table public.kalistar_models (
  id text primary key check (id ~ '^[34][0-9]{7}$'),
  character_id text not null,
  name text not null,
  title text not null,
  created_at timestamptz not null default now()
);
create table public.kalistar_profiles (
  user_id uuid primary key references auth.users(id) on delete restrict,
  handle text not null unique check (handle ~ '^[a-z0-9_]{3,24}$'),
  display_name text not null check (length(display_name) between 1 and 40),
  publish_owner boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.kalistar_collectibles (
  id uuid primary key default gen_random_uuid(),
  serial bigint generated always as identity unique,
  model_id text not null references public.kalistar_models(id) on delete restrict,
  owner_id uuid references public.kalistar_profiles(user_id) on delete restrict,
  status text not null default 'unclaimed' check (status in ('unclaimed','owned','revoked')),
  pilot boolean not null default true,
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  check ((status = 'owned' and owner_id is not null and activated_at is not null)
    or (status = 'unclaimed' and owner_id is null and activated_at is null)
    or status = 'revoked')
);
create index kalistar_collectibles_owner on public.kalistar_collectibles(owner_id);
create table public.kalistar_transfers (
  id uuid primary key default gen_random_uuid(),
  collectible_id uuid not null references public.kalistar_collectibles(id) on delete restrict,
  sender_id uuid not null references public.kalistar_profiles(user_id) on delete restrict,
  recipient_id uuid not null references public.kalistar_profiles(user_id) on delete restrict,
  status text not null default 'pending' check (status in ('pending','accepted','cancelled','rejected')),
  created_at timestamptz not null default now(),
  settled_at timestamptz,
  check (sender_id <> recipient_id),
  check ((status='pending') = (settled_at is null))
);
create unique index kalistar_one_pending_transfer on public.kalistar_transfers(collectible_id) where status='pending';
create index kalistar_transfer_recipient on public.kalistar_transfers(recipient_id,created_at desc);
create index kalistar_transfer_sender on public.kalistar_transfers(sender_id,created_at desc);
create table kalistar_private.admins (user_id uuid primary key references auth.users(id) on delete restrict);
create table kalistar_private.activations (
  collectible_id uuid primary key references public.kalistar_collectibles(id) on delete restrict,
  secret_hash bytea not null,
  used_at timestamptz
);
create table kalistar_private.attempts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_at timestamptz not null,
  attempts integer not null check (attempts between 0 and 5)
);
create table kalistar_private.events (
  id bigint generated always as identity primary key,
  collectible_id uuid not null references public.kalistar_collectibles(id) on delete restrict,
  actor_id uuid not null references auth.users(id) on delete restrict,
  kind text not null check (kind in ('issued','activated','offered','accepted','cancelled','rejected')),
  transfer_id uuid references public.kalistar_transfers(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index kalistar_event_card on kalistar_private.events(collectible_id,id desc);

alter table public.kalistar_models enable row level security;
alter table public.kalistar_profiles enable row level security;
alter table public.kalistar_collectibles enable row level security;
alter table public.kalistar_transfers enable row level security;
alter table kalistar_private.admins enable row level security;
alter table kalistar_private.activations enable row level security;
alter table kalistar_private.attempts enable row level security;
alter table kalistar_private.events enable row level security;
revoke all on public.kalistar_models, public.kalistar_profiles, public.kalistar_collectibles, public.kalistar_transfers from public, anon, authenticated;
revoke all on all tables in schema kalistar_private from public, anon, authenticated;
revoke all on all sequences in schema kalistar_private from public, anon, authenticated;
revoke all on sequence public.kalistar_collectibles_serial_seq from public, anon, authenticated;
grant select on public.kalistar_models to anon, authenticated;
grant select on public.kalistar_profiles, public.kalistar_collectibles, public.kalistar_transfers to authenticated;
create policy kalistar_models_read on public.kalistar_models for select to anon, authenticated using (true);
create policy kalistar_profile_self on public.kalistar_profiles for select to authenticated using (user_id=(select auth.uid()));
create policy kalistar_cards_self on public.kalistar_collectibles for select to authenticated using (owner_id=(select auth.uid()));
create policy kalistar_transfers_self on public.kalistar_transfers for select to authenticated using ((select auth.uid()) in (sender_id,recipient_id));

create function kalistar_private.actor() returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid := auth.uid();
begin
  if actor is null or not exists (select 1 from auth.users where id=actor and email_confirmed_at is not null) then
    raise exception 'Connexion avec une adresse email verifiee requise.' using errcode='42501';
  end if;
  return actor;
end $$;
create function kalistar_private.public_id(value uuid) returns text language sql immutable set search_path='' as $$
  select 'KC-'||replace(value::text,'-','');
$$;
create function kalistar_private.card_id(value text) returns uuid language sql immutable set search_path='' as $$
  select case when value ~ '^KC-[a-f0-9]{32}$' then substring(value from 4)::uuid else null end;
$$;

create function public.kalistar_me() returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid := kalistar_private.actor(); result jsonb;
begin
  select jsonb_build_object('handle',handle,'displayName',display_name,'publishOwner',publish_owner)
    into result from public.kalistar_profiles where user_id=actor;
  return jsonb_build_object('profile',result,'isAdmin',exists(select 1 from kalistar_private.admins where user_id=actor));
end $$;
create function public.kalistar_set_profile(p_handle text,p_display_name text,p_publish_owner boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid := kalistar_private.actor();
begin
  if p_handle is null or p_handle !~ '^[a-z0-9_]{3,24}$' or p_display_name is null
    or length(trim(p_display_name)) not between 1 and 40 or p_publish_owner is null then
    raise exception 'Pseudo ou nom public invalide.' using errcode='22023';
  end if;
  insert into public.kalistar_profiles(user_id,handle,display_name,publish_owner)
    values(actor,p_handle,trim(p_display_name),p_publish_owner)
    on conflict(user_id) do update set handle=excluded.handle,display_name=excluded.display_name,publish_owner=excluded.publish_owner;
  return public.kalistar_me();
end $$;

-- Only this projection is public: no owner UUID, email, activation hash or secret.
create function public.kalistar_certificate(p_id text) returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object('id',kalistar_private.public_id(c.id),'serial',lpad(c.serial::text,greatest(6,length(c.serial::text)),'0'),
    'modelId',c.model_id,'name',m.name,'title',m.title,'status',c.status,'pilot',c.pilot,
    'createdAt',c.created_at,'activatedAt',c.activated_at,
    'owner',case when p.publish_owner and c.status='owned' then jsonb_build_object('handle',p.handle,'displayName',p.display_name) else null end)
  from public.kalistar_collectibles c join public.kalistar_models m on m.id=c.model_id
    left join public.kalistar_profiles p on p.user_id=c.owner_id
  where c.id=kalistar_private.card_id(p_id);
$$;
create function public.kalistar_my_cards() returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid := kalistar_private.actor(); result jsonb;
begin
  select coalesce(jsonb_agg(public.kalistar_certificate(kalistar_private.public_id(c.id)) order by c.serial),'[]'::jsonb)
    into result from public.kalistar_collectibles c where c.owner_id=actor;
  return result;
end $$;
create function public.kalistar_my_transfers() returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid := kalistar_private.actor(); result jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object('id',t.id,'card',public.kalistar_certificate(kalistar_private.public_id(t.collectible_id)),
    'sender',s.handle,'recipient',r.handle,'incoming',t.recipient_id=actor,'status',t.status,'createdAt',t.created_at) order by t.created_at desc),'[]'::jsonb)
    into result from public.kalistar_transfers t join public.kalistar_profiles s on s.user_id=t.sender_id
    join public.kalistar_profiles r on r.user_id=t.recipient_id where actor in (t.sender_id,t.recipient_id);
  return result;
end $$;

create function public.kalistar_issue(p_model_id text,p_pilot boolean default true)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid := kalistar_private.actor(); item public.kalistar_collectibles; secret text;
begin
  if not exists(select 1 from kalistar_private.admins where user_id=actor) then
    raise exception 'Emission reservee a l administration.' using errcode='42501';
  end if;
  if p_pilot is null then raise exception 'Serie requise.' using errcode='22023'; end if;
  secret := encode(extensions.gen_random_bytes(32),'hex');
  insert into public.kalistar_collectibles(model_id,pilot) values(p_model_id,p_pilot) returning * into item;
  insert into kalistar_private.activations(collectible_id,secret_hash) values(item.id,extensions.digest(secret,'sha256'));
  insert into kalistar_private.events(collectible_id,actor_id,kind) values(item.id,actor,'issued');
  return jsonb_build_object('card',public.kalistar_certificate(kalistar_private.public_id(item.id)),'secret',secret);
end $$;

-- Failed attempts return normally so the rate limit is committed, never rolled back by an exception.
create function public.kalistar_activate(p_id text,p_secret text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid := kalistar_private.actor(); rate kalistar_private.attempts; item public.kalistar_collectibles;
declare activation kalistar_private.activations; at_time timestamptz := clock_timestamp();
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
  update public.kalistar_collectibles set owner_id=actor,status='owned',activated_at=at_time where id=item.id;
  update kalistar_private.activations set used_at=at_time where collectible_id=item.id;
  update kalistar_private.attempts set attempts=0 where user_id=actor;
  insert into kalistar_private.events(collectible_id,actor_id,kind) values(item.id,actor,'activated');
  return jsonb_build_object('ok',true,'card',public.kalistar_certificate(p_id));
end $$;

create function public.kalistar_offer(p_id text,p_recipient text)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid := kalistar_private.actor(); item public.kalistar_collectibles; recipient uuid; transfer_id uuid;
begin
  select * into item from public.kalistar_collectibles where id=kalistar_private.card_id(p_id) for update;
  if item.id is null or item.owner_id is distinct from actor or item.status<>'owned' then
    raise exception 'Seul le proprietaire peut proposer ce transfert.' using errcode='42501';
  end if;
  select user_id into recipient from public.kalistar_profiles where handle=p_recipient;
  if recipient is null or recipient=actor then raise exception 'Destinataire invalide.' using errcode='22023'; end if;
  insert into public.kalistar_transfers(collectible_id,sender_id,recipient_id) values(item.id,actor,recipient) returning id into transfer_id;
  insert into kalistar_private.events(collectible_id,actor_id,kind,transfer_id) values(item.id,actor,'offered',transfer_id);
  return transfer_id;
end $$;
create function public.kalistar_settle(p_transfer uuid,p_action text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid := kalistar_private.actor(); item public.kalistar_collectibles; transfer public.kalistar_transfers;
begin
  select * into transfer from public.kalistar_transfers where id=p_transfer and actor in(sender_id,recipient_id);
  if transfer.id is null then raise exception 'Transfert indisponible.' using errcode='42501'; end if;
  -- All transfer operations lock the collectible before the transfer, consistently.
  select * into item from public.kalistar_collectibles where id=transfer.collectible_id for update;
  select * into transfer from public.kalistar_transfers where id=p_transfer for update;
  if transfer.status<>'pending' or item.status<>'owned' or item.owner_id<>transfer.sender_id then
    raise exception 'Ce transfert n est plus disponible.' using errcode='22023';
  end if;
  if p_action='accepted' and actor=transfer.recipient_id then
    update public.kalistar_collectibles set owner_id=actor where id=item.id;
  elsif not ((p_action='cancelled' and actor=transfer.sender_id) or (p_action='rejected' and actor=transfer.recipient_id)) then
    raise exception 'Action non autorisee.' using errcode='42501';
  end if;
  update public.kalistar_transfers set status=p_action,settled_at=clock_timestamp() where id=p_transfer;
  insert into kalistar_private.events(collectible_id,actor_id,kind,transfer_id) values(item.id,actor,p_action,p_transfer);
  return public.kalistar_certificate(kalistar_private.public_id(item.id));
end $$;

revoke all on all functions in schema kalistar_private from public, anon, authenticated;
revoke all on function public.kalistar_certificate(text),public.kalistar_me(),public.kalistar_set_profile(text,text,boolean),
  public.kalistar_my_cards(),public.kalistar_my_transfers(),public.kalistar_issue(text,boolean),
  public.kalistar_activate(text,text),public.kalistar_offer(text,text),public.kalistar_settle(uuid,text) from public, anon, authenticated;
grant execute on function public.kalistar_certificate(text) to anon, authenticated;
grant execute on function public.kalistar_me(),public.kalistar_set_profile(text,text,boolean),public.kalistar_my_cards(),
  public.kalistar_my_transfers(),public.kalistar_issue(text,boolean),public.kalistar_activate(text,text),
  public.kalistar_offer(text,text),public.kalistar_settle(uuid,text) to authenticated;

-- Pilot models only. Additional approved model versions are imported by the publisher, not the browser.
insert into public.kalistar_models(id,character_id,name,title) values
  ('30000001','momo','MOMO','L artiste magique'),
  ('30000007','balmhyr','BALMHYR','Le royaume a l horizon');
comment on schema kalistar_private is 'Server-only issuance, activation hashes and audit. No browser access.';
comment on table public.kalistar_collectibles is 'Registered specimens, never automatically seeded from a local demo.';
commit;
