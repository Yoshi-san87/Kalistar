-- Author-approved Balmhyr print and equipment rewards. No earned object is removed.
begin;
do $$ begin
  if not exists(select 1 from kalistar_private.registry_version where version in (12,13)) then
    raise exception 'Install the narrative Fragment revision first.';
  end if;
  if not exists(select 1 from kalistar_private.journeys where id='balmhyr-retour'
      and revision='journeys-1' and stage_count=7 and reward_model_id in ('49900802','30000007')) then
    raise exception 'Unexpected Balmhyr Fragment definition.';
  end if;
  if (select count(*) from kalistar_private.journey_equipment_rewards where book_id='balmhyr-retour'
      and ((stage=4 and kind='weapon' and equipment_id in ('mythic-iron-gauntlet','fallen-king-axe'))
        or (stage=5 and kind='shield' and equipment_id='durane-rampart')
        or (stage=6 and kind='relic' and equipment_id in ('exiled-king-seal','mythic-iron-gauntlet'))))<>3 then
    raise exception 'Unexpected Balmhyr equipment rewards.';
  end if;
  if exists(select 1 from public.kalistar_models where id='30000007' and character_id<>'balmhyr') then
    raise exception 'The Balmhyr model identity does not match.';
  end if;
end $$;

-- Claims/start operations lock the same profile; preserve the exact old receipts privately.
do $$ begin
  perform user_id from public.kalistar_profiles where user_id in
    (select user_id from kalistar_private.journey_progress where book_id='balmhyr-retour')
    order by user_id for update;
end $$;
create table if not exists kalistar_private.journey_reward_adjustments (
  revision text not null, user_id uuid not null references auth.users(id),
  book_id text not null, stage integer not null, previous_claim jsonb not null,
  equipment_id text not null, already_owned boolean not null,
  created_at timestamptz not null default clock_timestamp(),
  primary key(revision,user_id,book_id,stage)
);
alter table kalistar_private.journey_reward_adjustments enable row level security;
revoke all on kalistar_private.journey_reward_adjustments from public,anon,authenticated;

insert into kalistar_private.journey_reward_adjustments
  (revision,user_id,book_id,stage,previous_claim,equipment_id,already_owned)
select 'balmhyr-iron-gauntlet-1',c.user_id,c.book_id,c.stage,to_jsonb(c),r.equipment_id,
  kalistar_private.owns_equipment(c.user_id,r.equipment_id)
from kalistar_private.journey_equipment_claims c
join (values (4,'mythic-iron-gauntlet','fallen-king-axe'),(6,'exiled-king-seal','mythic-iron-gauntlet'))
  as r(stage,old_id,equipment_id) on c.stage=r.stage and c.equipment_id=r.old_id
where c.book_id='balmhyr-retour' on conflict do nothing;
insert into kalistar_private.equipment_grants(user_id,equipment_id,source)
select user_id,equipment_id,'fragment:balmhyr-retour:revision-1:'||stage
from kalistar_private.journey_reward_adjustments where revision='balmhyr-iron-gauntlet-1'
on conflict do nothing;
update kalistar_private.journey_equipment_claims c
set equipment_id=a.equipment_id,already_owned=a.already_owned
from kalistar_private.journey_reward_adjustments a
where a.revision='balmhyr-iron-gauntlet-1' and c.user_id=a.user_id and c.book_id=a.book_id
  and c.stage=a.stage and c.equipment_id=a.previous_claim->>'equipment_id';

-- Move stage four first: the per-book equipment uniqueness also protects the new finale.
update kalistar_private.journey_equipment_rewards set equipment_id='fallen-king-axe'
  where book_id='balmhyr-retour' and stage=4 and equipment_id='mythic-iron-gauntlet';
update kalistar_private.journey_equipment_rewards set equipment_id='mythic-iron-gauntlet'
  where book_id='balmhyr-retour' and stage=6 and equipment_id='exiled-king-seal';
insert into public.kalistar_models(id,character_id,name,title) values
  ('30000007','balmhyr','BALMHYR','LE ROYAUME A L''HORIZON') on conflict(id) do nothing;
update kalistar_private.journeys set reward_model_id='30000007'
  where id='balmhyr-retour' and reward_model_id='49900802';
-- The library already projects the original print for a previously claimed card.
update kalistar_private.registry_version set version=13 where version=12;
commit;
