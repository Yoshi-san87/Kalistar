-- Explicit NULL checks: a released or absent lease is never a writer grant.
begin;
create or replace function public.kalistar_sync_write(p_device_id uuid,p_expected_revision bigint,p_payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=kalistar_private.actor(); s kalistar_private.player_saves;
begin
  select * into s from kalistar_private.player_saves where user_id=actor for update;
  if p_device_id is null or s.user_id is null or s.device_id is null or s.lease_until is null
    or s.device_id is distinct from p_device_id or s.lease_until<=clock_timestamp()
    then return jsonb_build_object('ok',false,'code','busy','current',kalistar_private.save_view(actor)); end if;
  if p_expected_revision is null or s.revision<>p_expected_revision then return jsonb_build_object('ok',false,'code','conflict','current',kalistar_private.save_view(actor)); end if;
  perform kalistar_private.check_save(actor,p_payload);
  update kalistar_private.player_saves set payload=p_payload,revision=revision+1,updated_at=clock_timestamp(),lease_until=clock_timestamp()+interval '120 seconds' where user_id=actor;
  return jsonb_build_object('ok',true)||kalistar_private.save_view(actor);
end $$;
revoke all on function public.kalistar_sync_write(uuid,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.kalistar_sync_write(uuid,bigint,jsonb) to authenticated;
update kalistar_private.registry_version set version=4;
commit;
