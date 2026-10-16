-- Unchanged revisions and successful writes do not resend the complete history.
begin;
alter function public.kalistar_sync_read() set schema kalistar_private;
create function public.kalistar_sync_read(p_known_revision bigint default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb:=kalistar_private.save_view(kalistar_private.actor());
begin
  if (result->>'revision')::bigint=p_known_revision then return result||'{"payload":null,"unchanged":true}'::jsonb; end if;
  return result;
end $$;
alter function public.kalistar_sync_claim(uuid,bigint,boolean) set schema kalistar_private;
create function public.kalistar_sync_claim(p_device_id uuid,p_expected_revision bigint,p_takeover boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb:=kalistar_private.kalistar_sync_claim(p_device_id,p_expected_revision,p_takeover);
begin
  if result->>'ok'='true' then return result||'{"payload":null,"unchanged":true}'::jsonb; end if;
  return result;
end $$;
alter function public.kalistar_sync_write(uuid,bigint,jsonb) set schema kalistar_private;
create function public.kalistar_sync_write(p_device_id uuid,p_expected_revision bigint,p_payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb:=kalistar_private.kalistar_sync_write(p_device_id,p_expected_revision,p_payload);
begin
  if result->>'ok'='true' then return result||'{"payload":null,"unchanged":true}'::jsonb; end if;
  return result;
end $$;
revoke all on all functions in schema kalistar_private from public,anon,authenticated;
revoke all on function public.kalistar_sync_read(bigint),public.kalistar_sync_claim(uuid,bigint,boolean),public.kalistar_sync_write(uuid,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.kalistar_sync_read(bigint),public.kalistar_sync_claim(uuid,bigint,boolean),public.kalistar_sync_write(uuid,bigint,jsonb) to authenticated;
update kalistar_private.registry_version set version=5;
commit;
