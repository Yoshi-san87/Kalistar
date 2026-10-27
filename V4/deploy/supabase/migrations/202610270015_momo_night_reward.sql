-- Restore the author's nocturnal Momo reward for future claims only.
begin;

do $$ begin
  if not exists(select 1 from kalistar_private.registry_version where version in (13,14)) then
    raise exception 'Install the previous journey migrations before the Momo night reward.';
  end if;
  if not exists(select 1 from kalistar_private.journeys where id='momo-petits-bonheurs'
      and revision='journeys-1' and stage_count=7 and reward_model_id in ('30000001','30000014')) then
    raise exception 'Unexpected Momo journey definition; no reward was changed.';
  end if;
  if not exists(select 1 from public.kalistar_models where id='30000001' and character_id='momo') then
    raise exception 'The approved nocturnal Momo model is missing or has a different identity.';
  end if;
end $$;

-- kalistar_journey_library/claim already preserve the model on a historical receipt.
-- Do not rewrite claims, owned specimens, equipment, progress or active attempts.
update kalistar_private.journeys set reward_model_id='30000001'
  where id='momo-petits-bonheurs' and reward_model_id='30000014';
update kalistar_private.registry_version set version=14 where version=13;

commit;
