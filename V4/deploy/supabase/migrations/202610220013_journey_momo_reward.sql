-- Author-approved future Momo reward. Historical receipts and specimens stay intact.
begin;
do $$ begin
  if not exists(select 1 from kalistar_private.registry_version where version in (11,12)) then
    raise exception 'Install Fragment sequels before the Momo reward revision.';
  end if;
  if not exists(select 1 from kalistar_private.journeys where id='momo-petits-bonheurs'
      and revision='journeys-1' and stage_count=7 and reward_model_id in ('30000001','30000014')) then
    raise exception 'Unexpected Momo Fragment definition; no reward was changed.';
  end if;
  if exists(select 1 from public.kalistar_models where id='30000014' and character_id<>'momo') then
    raise exception 'The approved Momo model identity does not match.';
  end if;
end $$;
-- The published model also needs to exist when restoring into an empty database.
insert into public.kalistar_models(id,character_id,name,title) values
  ('30000014','momo','MOMO','LE BAL DES OBJETS PERDUS') on conflict(id) do nothing;
update kalistar_private.journeys set reward_model_id='30000014'
  where id='momo-petits-bonheurs' and reward_model_id='30000001';

create or replace function public.kalistar_journey_library() returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=kalistar_private.actor(); books jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object('id',j.id,'revision',j.revision,
    'rewardModelId',coalesce(c.reward_model_id,j.reward_model_id),
    'configuredRewardModelId',j.reward_model_id,'claimedRewardModelId',c.reward_model_id,
    'cleared',coalesce(p.cleared,0),
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
revoke all on function public.kalistar_journey_library() from public,anon,authenticated;
grant execute on function public.kalistar_journey_library() to authenticated;
update kalistar_private.registry_version set version=12 where version=11;
commit;
