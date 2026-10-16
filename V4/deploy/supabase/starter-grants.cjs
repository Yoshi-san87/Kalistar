'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const TOKYO=['30000007','30000002','30000021','30000014','30000012','30000013','30000018','30000008','30000023','30000006'];
const quote=value=>"'"+String(value).replaceAll("'","''")+"'";
function plan(data){
  const E=require('../../site/engine.js').createEngine(data),byId=E.byId;
  if(data.edition!=='V4'||data.cards.length<10||new Set(data.cards.map(c=>c.id)).size!==data.cards.length)throw Error('Approved V4 catalogue required');
  if(TOKYO.filter(id=>byId[id]?.characterId==='kaylis').length!==1)throw Error('Stable Kaylis identity required');
  for(const ids of [TOKYO,data.decks.player]){const errors=E.validatePlayableDeck(ids);if(errors.length)throw Error(errors.join(' '));}
  return {models:data.cards.map(c=>({id:c.id,character_id:c.characterId,name:c.name,title:c.title,positions:c.positions,element:c.element})).sort((a,b)=>a.id.localeCompare(b.id)),tokyo:TOKYO.slice(),paris:data.decks.player.slice()};
}
function sql(data){
  const p=plan(data),json=JSON.stringify(p.models),grant='starter-20261016';
  return `-- Explicit one-time distribution requested by the author. Re-running never remints a granted model.
begin;
do $$ begin
  if (select count(*) from kalistar_private.players where local_profile in ('user-paris','user-tokyo'))<>2 then raise exception 'Personal players must already be configured.'; end if;
  if exists(select 1 from kalistar_private.players p join auth.users u on u.id=p.user_id where p.local_profile in ('user-paris','user-tokyo') and (u.email_confirmed_at is null or p.email_sha256<>extensions.digest(lower(trim(u.email)),'sha256'))) then raise exception 'Verified identities changed.'; end if;
end $$;
create temporary table incoming_models on commit drop as select * from jsonb_to_recordset(${quote(json)}::jsonb) as m(id text,character_id text,name text,title text,positions smallint[],element text);
do $$ begin
  if (select count(*) from incoming_models)<>${p.models.length} then raise exception 'Unexpected approved model count.'; end if;
  if exists(select 1 from incoming_models i join public.kalistar_models m using(id) where m.character_id<>i.character_id) then raise exception 'Stable character identity mismatch.'; end if;
end $$;
insert into public.kalistar_models(id,character_id,name,title,positions,element) select * from incoming_models
  on conflict(id) do update set name=excluded.name,title=excluded.title,positions=excluded.positions,element=excluded.element;
insert into public.kalistar_profiles(user_id,handle,display_name,publish_owner)
  select user_id,case local_profile when 'user-paris' then 'kalistar_paris' else 'kalistar_tokyo' end,label,false
  from kalistar_private.players where local_profile in ('user-paris','user-tokyo') on conflict(user_id) do nothing;
do $$ declare p record; m record; specimen uuid; at_time timestamptz; begin
  for p in select * from kalistar_private.players where local_profile in ('user-paris','user-tokyo') order by local_profile loop
    for m in select * from incoming_models where p.local_profile='user-paris' or id=any(array[${p.tokyo.map(quote).join(',')}]) order by id loop
      if exists(select 1 from kalistar_private.starter_grants g where g.user_id=p.user_id and g.grant_key=${quote(grant)} and g.model_id=m.id) then continue; end if;
      select id into specimen from public.kalistar_collectibles where owner_id=p.user_id and model_id=m.id and status='owned' order by serial limit 1;
      if specimen is null then
        at_time:=clock_timestamp();
        insert into public.kalistar_collectibles(model_id,owner_id,status,pilot,activated_at) values(m.id,p.user_id,'owned',false,at_time) returning id into specimen;
        insert into kalistar_private.activations(collectible_id,secret_hash,used_at) values(specimen,extensions.digest(extensions.gen_random_bytes(32),'sha256'),at_time);
        insert into kalistar_private.events(collectible_id,actor_id,kind) values(specimen,p.user_id,'issued'),(specimen,p.user_id,'activated');
      end if;
      insert into kalistar_private.starter_grants(user_id,grant_key,model_id,collectible_id) values(p.user_id,${quote(grant)},m.id,specimen);
    end loop;
    update kalistar_private.players set starter_deck=case p.local_profile when 'user-paris' then ${quote(JSON.stringify(p.paris))}::jsonb else ${quote(JSON.stringify(p.tokyo))}::jsonb end where user_id=p.user_id;
  end loop;
end $$;
select p.local_profile,count(*)::int as granted_versions from kalistar_private.starter_grants g join kalistar_private.players p on p.user_id=g.user_id where grant_key=${quote(grant)} group by p.local_profile order by p.local_profile;
commit;
`;
}
module.exports={plan,sql,TOKYO};
if(require.main===module){
  const data=JSON.parse(fs.readFileSync(path.join(__dirname,'../dist/jeu/catalogue.json'),'utf8'));
  const out=path.resolve(process.argv[2]||'work/private/starter-grants.sql'),root=path.resolve(__dirname,'../../../work');
  if(!out.startsWith(root+path.sep)||path.extname(out)!=='.sql')throw Error('Generated SQL belongs under ignored work/');
  const text=sql(data);fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,text);
  console.log(JSON.stringify({output:out,models:data.cards.length,tokyo:TOKYO,sha256:crypto.createHash('sha256').update(text).digest('hex')}));
}
