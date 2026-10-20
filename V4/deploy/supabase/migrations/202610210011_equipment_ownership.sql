-- Equipment is earned separately from character cards. Catalogue access is not ownership.
begin;
create table kalistar_private.equipment_grants (
  user_id uuid not null references auth.users(id) on delete restrict,
  equipment_id text not null check(equipment_id ~ '^[a-z0-9][a-z0-9_-]{0,95}$'),
  source text not null,
  granted_at timestamptz not null default clock_timestamp(),
  primary key(user_id,equipment_id)
);
alter table kalistar_private.equipment_grants enable row level security;
revoke all on kalistar_private.equipment_grants from public,anon,authenticated;

create function kalistar_private.owns_equipment(p_user uuid,p_id text) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from kalistar_private.admins where user_id=p_user)
    or exists(select 1 from kalistar_private.equipment_grants where user_id=p_user and equipment_id=p_id);
$$;
alter function public.kalistar_player() rename to kalistar_player_before_equipment;
alter function public.kalistar_player_before_equipment() set schema kalistar_private;
create function public.kalistar_player() returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=kalistar_private.actor();
begin
  return kalistar_private.kalistar_player_before_equipment()||jsonb_build_object('equipment',jsonb_build_object(
    'all',exists(select 1 from kalistar_private.admins where user_id=actor),
    'ids',coalesce((select jsonb_agg(equipment_id order by equipment_id) from kalistar_private.equipment_grants where user_id=actor),'[]'::jsonb)));
end $$;

create function kalistar_private.check_equipment(p_user uuid,p_loadout jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare slot record; item record;
begin
  if p_loadout is null then return; end if;
  if jsonb_typeof(p_loadout)<>'object' then raise exception 'Equipements invalides.' using errcode='22023'; end if;
  for slot in select * from jsonb_each(p_loadout) loop
    if slot.key not in ('weapon','shield','relic') or jsonb_typeof(slot.value)<>'object' then raise exception 'Emplacement invalide.' using errcode='22023'; end if;
    for item in select * from jsonb_each(slot.value) loop
      if jsonb_typeof(item.value)<>'string' or not kalistar_private.owns_equipment(p_user,item.value#>>'{}')
        then raise exception 'Cet equipement ne fait pas partie de ton arsenal.' using errcode='42501'; end if;
    end loop;
  end loop;
end $$;

create function kalistar_private.filter_equipment(p_user uuid,p_loadout jsonb) returns jsonb
language sql stable security definer set search_path='' as $$
  select case when p_loadout is null then null else coalesce((select jsonb_object_agg(slot.key,
    coalesce((select jsonb_object_agg(item.key,item.value) from jsonb_each(slot.value) item
      where kalistar_private.owns_equipment(p_user,item.value#>>'{}')),'{}'::jsonb))
    from jsonb_each(p_loadout) slot),'{}'::jsonb) end;
$$;
-- Reversible account-specific transition; historical match/archive snapshots stay intact.
create table kalistar_private.equipment_reset_backups (
  user_id uuid primary key references auth.users(id) on delete restrict,
  revision bigint not null,
  payload jsonb not null,
  created_at timestamptz not null default clock_timestamp()
);
alter table kalistar_private.equipment_reset_backups enable row level security;
revoke all on kalistar_private.equipment_reset_backups from public,anon,authenticated;
create function kalistar_private.reset_unowned_equipment(p_user uuid) returns boolean
language plpgsql security definer set search_path='' as $$
declare saved kalistar_private.player_saves; cleaned jsonb; teams jsonb;
begin
  select * into saved from kalistar_private.player_saves where user_id=p_user for update;
  if saved.payload is null then return false; end if;
  cleaned:=saved.payload;
  if cleaned#>'{equipment,slots}' is not null then
    cleaned:=jsonb_set(cleaned,'{equipment,slots}',kalistar_private.filter_equipment(p_user,cleaned#>'{equipment,slots}'));
  end if;
  if cleaned#>'{preferences,teamDraft,equipment}' is not null then
    cleaned:=jsonb_set(cleaned,'{preferences,teamDraft,equipment}',kalistar_private.filter_equipment(p_user,cleaned#>'{preferences,teamDraft,equipment}'));
  end if;
  if jsonb_typeof(cleaned#>'{deckLibrary,decks}')='array' then
    select coalesce(jsonb_agg(case when team ? 'equipment' then jsonb_set(team,'{equipment}',kalistar_private.filter_equipment(p_user,team->'equipment')) else team end order by n),'[]'::jsonb)
      into teams from jsonb_array_elements(cleaned#>'{deckLibrary,decks}') with ordinality as d(team,n);
    cleaned:=jsonb_set(cleaned,'{deckLibrary,decks}',teams);
  end if;
  if cleaned=saved.payload then return false; end if;
  insert into kalistar_private.equipment_reset_backups(user_id,revision,payload) values(p_user,saved.revision,saved.payload) on conflict do nothing;
  update kalistar_private.player_saves set payload=cleaned,revision=revision+1,updated_at=clock_timestamp(),device_id=null,lease_until=null where user_id=p_user;
  return true;
end $$;

alter function kalistar_private.check_save(uuid,jsonb) rename to check_save_before_equipment;
create function kalistar_private.check_save(p_user uuid,p_payload jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare team jsonb; active jsonb; previous jsonb;
begin
  perform kalistar_private.check_save_before_equipment(p_user,p_payload);
  perform kalistar_private.check_equipment(p_user,p_payload#>'{equipment,slots}');
  perform kalistar_private.check_equipment(p_user,p_payload#>'{preferences,teamDraft,equipment}');
  for team in select value from jsonb_array_elements(p_payload#>'{deckLibrary,decks}') loop
    perform kalistar_private.check_equipment(p_user,team->'equipment');
  end loop;
  if p_payload->>'activeMatchId' is null then return; end if;
  select value->'state' into active from jsonb_array_elements(p_payload->'matches') where value->>'id'=p_payload->>'activeMatchId';
  select m->'state' into previous from kalistar_private.player_saves s,
    lateral jsonb_array_elements(s.payload->'matches') m
    where s.user_id=p_user and m->>'id'=p_payload->>'activeMatchId';
  -- Already started games retain their exact equipment snapshot, never their next deck.
  if previous is not null and previous->'equipment'->'loadouts' is not distinct from active->'equipment'->'loadouts' then return; end if;
  perform kalistar_private.check_equipment(p_user,active#>'{equipment,loadouts,0}');
end $$;

alter function public.kalistar_journey_start(text,jsonb,uuid,text) rename to kalistar_journey_start_before_equipment;
alter function public.kalistar_journey_start_before_equipment(text,jsonb,uuid,text) set schema kalistar_private;
create function public.kalistar_journey_start(p_book_id text,p_deck jsonb,p_device_id uuid,p_runtime_hash text)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  perform kalistar_private.check_equipment(kalistar_private.actor(),p_deck->'equipment');
  return kalistar_private.kalistar_journey_start_before_equipment(p_book_id,p_deck,p_device_id,p_runtime_hash);
end $$;

revoke all on function kalistar_private.owns_equipment(uuid,text),kalistar_private.check_equipment(uuid,jsonb),
  kalistar_private.filter_equipment(uuid,jsonb),kalistar_private.reset_unowned_equipment(uuid),
  kalistar_private.check_save(uuid,jsonb),kalistar_private.check_save_before_equipment(uuid,jsonb),
  kalistar_private.kalistar_player_before_equipment(),kalistar_private.kalistar_journey_start_before_equipment(text,jsonb,uuid,text)
  from public,anon,authenticated;
revoke all on function public.kalistar_player(),public.kalistar_journey_start(text,jsonb,uuid,text) from public,anon,authenticated;
grant execute on function public.kalistar_player(),public.kalistar_journey_start(text,jsonb,uuid,text) to authenticated;
select kalistar_private.reset_unowned_equipment(user_id) from kalistar_private.players where local_profile='user-tokyo';
update kalistar_private.registry_version set version=10;
commit;
