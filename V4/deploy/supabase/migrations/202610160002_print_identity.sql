-- Short public specimen barcodes are separate from the existing 3/4xxxxxxx model IDs.
begin;
alter table public.kalistar_collectibles add constraint kalistar_barcode_capacity check(serial between 1 and 9999999);
create or replace function kalistar_private.card_id(value text) returns uuid language sql stable set search_path='' as $$
  select case
    when value ~ '^KC-[a-f0-9]{32}$' then substring(value from 4)::uuid
    when value ~ '^0[0-9]{7}$' then (select id from public.kalistar_collectibles where serial=value::bigint)
    else null end;
$$;
create or replace function public.kalistar_certificate(p_id text) returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object('id',kalistar_private.public_id(c.id),'serial',lpad(c.serial::text,greatest(6,length(c.serial::text)),'0'),
    'barcode',lpad(c.serial::text,8,'0'),'modelId',c.model_id,'name',m.name,'title',m.title,'status',c.status,'pilot',c.pilot,
    'createdAt',c.created_at,'activatedAt',c.activated_at,
    'owner',case when p.publish_owner and c.status='owned' then jsonb_build_object('handle',p.handle,'displayName',p.display_name) else null end)
  from public.kalistar_collectibles c join public.kalistar_models m on m.id=c.model_id
    left join public.kalistar_profiles p on p.user_id=c.owner_id
  where c.id=kalistar_private.card_id(p_id);
$$;
create table kalistar_private.registry_version (
  id boolean primary key default true check(id),
  version integer not null,
  initial_sha256 text not null,
  installed_at timestamptz not null default now()
);
alter table kalistar_private.registry_version enable row level security;
revoke all on kalistar_private.registry_version from public,anon,authenticated;
insert into kalistar_private.registry_version(version,initial_sha256)
  values(1,'9e718a09d910f3370e366cf1db5acda05e1e547f67c87779e31316387399bc1e');
update public.kalistar_models set title='L’ARTISTE MAGIQUE' where id='30000001';
update public.kalistar_models set title='LE ROYAUME À L''HORIZON' where id='30000007';
commit;
