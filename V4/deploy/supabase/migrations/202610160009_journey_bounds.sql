-- Bound direct RPC input too; keep the installed 008 functions unchanged privately.
begin;
alter function public.kalistar_journey_start(text,jsonb,uuid,text) rename to kalistar_journey_start_before_bounds;
alter function public.kalistar_journey_start_before_bounds(text,jsonb,uuid,text) set schema kalistar_private;
create function public.kalistar_journey_start(p_book_id text,p_deck jsonb,p_device_id uuid,p_runtime_hash text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=kalistar_private.actor(); slot record;
begin
  perform kalistar_private.journey_lease(actor,p_device_id);
  if p_deck is null or jsonb_typeof(p_deck) is distinct from 'object' or octet_length(p_deck::text)>16384 then
    raise exception 'Composition de parcours invalide ou trop volumineuse.' using errcode='22023';
  end if;
  -- Validate types before using the object/array iterators on untrusted JSON.
  if (select count(*) from jsonb_object_keys(p_deck))<>5
    or exists(select 1 from jsonb_object_keys(p_deck) k where k not in ('name','cards','formation','captain','equipment'))
    or jsonb_typeof(p_deck->'name') is distinct from 'string'
    or jsonb_typeof(p_deck->'cards') is distinct from 'array'
    or jsonb_typeof(p_deck->'formation') is distinct from 'array'
    or jsonb_typeof(p_deck->'captain') is distinct from 'string'
    or jsonb_typeof(p_deck->'equipment') is distinct from 'object' then
    raise exception 'Composition de parcours invalide ou trop volumineuse.' using errcode='22023';
  end if;
  if length(p_deck->>'name')>50 or (p_deck->>'name') ~ '[[:cntrl:]]'
    or jsonb_array_length(p_deck->'cards')<>10 or jsonb_array_length(p_deck->'formation')<>5
    or exists(select 1 from jsonb_array_elements((p_deck->'cards')||(p_deck->'formation')) c
      where jsonb_typeof(c.value) is distinct from 'string' or (c.value#>>'{}') !~ '^[34][0-9]{7}$')
    or (select count(distinct id) from jsonb_array_elements_text(p_deck->'cards') id)<>10
    or (select count(distinct id) from jsonb_array_elements_text(p_deck->'formation') id)<>5
    or exists(select 1 from jsonb_array_elements_text(p_deck->'formation') id where not (p_deck->'cards') ? id)
    or not (p_deck->'formation') ? (p_deck->>'captain') then
    raise exception 'Composition de parcours invalide ou trop volumineuse.' using errcode='22023';
  end if;
  if (select count(*) from jsonb_object_keys(p_deck->'equipment'))<>3
    or exists(select 1 from jsonb_object_keys(p_deck->'equipment') k where k not in ('weapon','shield','relic')) then
    raise exception 'Composition de parcours invalide ou trop volumineuse.' using errcode='22023';
  end if;
  for slot in select * from jsonb_each(p_deck->'equipment') loop
    if jsonb_typeof(slot.value) is distinct from 'object' then
      raise exception 'Composition de parcours invalide ou trop volumineuse.' using errcode='22023';
    end if;
    if (select count(*) from jsonb_object_keys(slot.value))>10 or exists(
      select 1 from jsonb_each(slot.value) e where e.key !~ '^[a-z0-9][a-z0-9_-]{0,79}$'
        or jsonb_typeof(e.value) is distinct from 'string' or (e.value#>>'{}') !~ '^[-a-z0-9]{1,80}$'
        or not exists(select 1 from public.kalistar_models m
          where m.character_id=e.key and (p_deck->'cards') ? m.id)
    ) then
      raise exception 'Composition de parcours invalide ou trop volumineuse.' using errcode='22023';
    end if;
  end loop;
  -- Ownership, deck rules, stage, lease and rate checks remain the 008 contract.
  return kalistar_private.kalistar_journey_start_before_bounds(p_book_id,p_deck,p_device_id,p_runtime_hash);
end $$;

alter function public.kalistar_offer(text,text) rename to kalistar_offer_before_bounds;
alter function public.kalistar_offer_before_bounds(text,text) set schema kalistar_private;
create function public.kalistar_offer(p_id text,p_recipient text)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=kalistar_private.actor(); canonical text;
begin
  canonical:=kalistar_private.public_id(kalistar_private.card_id(p_id));
  -- Both 008's journey guard and 004's active-match guard compare canonical KC IDs.
  -- The unchanged delegation chain also retains 007's recipient ownership check.
  return kalistar_private.kalistar_offer_before_bounds(canonical,p_recipient);
end $$;

revoke all on schema kalistar_private from public,anon,authenticated;
revoke all on all functions in schema kalistar_private from public,anon,authenticated;
revoke all on function public.kalistar_journey_start(text,jsonb,uuid,text),public.kalistar_offer(text,text) from public,anon,authenticated;
grant execute on function public.kalistar_journey_start(text,jsonb,uuid,text),public.kalistar_offer(text,text) to authenticated;
update kalistar_private.registry_version set version=8;
commit;
