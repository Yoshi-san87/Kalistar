'use strict';
// Local-only PostgreSQL fixture. Never included by the static publisher.
const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const runtime=createRequire(path.join(process.env.KALISTAR_CLOUD_MODULES||path.resolve(__dirname,'../../../work/supabase-runtime/node_modules'),'_browser_sync.cjs'));
const {PGlite}=runtime('@electric-sql/pglite'),{pgcrypto}=runtime('@electric-sql/pglite/contrib/pgcrypto');
const ids=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222'];
const calls={kalistar_access:[],kalistar_player:[],kalistar_sync_read:['p_known_revision'],kalistar_sync_claim:['p_device_id','p_expected_revision','p_takeover'],kalistar_sync_write:['p_device_id','p_expected_revision','p_payload'],kalistar_sync_release:['p_device_id'],kalistar_validate_deck:['p_cards'],kalistar_me:[],kalistar_my_cards:[],kalistar_my_transfers:[],kalistar_certificate:['p_id'],kalistar_set_profile:['p_handle','p_display_name','p_publish_owner'],kalistar_offer:['p_id','p_recipient'],kalistar_settle:['p_transfer','p_action']};
for(const verb of ['read','claim','write','release'])calls['kalistar_sync_v2_'+verb]=calls['kalistar_sync_'+verb];
calls.kalistar_archive_put=['p_device_id','p_expected_revision','p_archives'];calls.kalistar_archive_read=['p_refs'];
calls.kalistar_issue=['p_model_id','p_pilot'];calls.kalistar_activate=['p_id','p_secret'];
Object.assign(calls,{kalistar_journey_library:[],kalistar_journey_start:['p_book_id','p_deck','p_device_id','p_runtime_hash'],kalistar_journey_context:['p_attempt_id','p_device_id'],kalistar_journey_commit:['p_frame','p_signature','p_device_id'],kalistar_journey_abandon:['p_attempt_id','p_device_id'],kalistar_journey_claim:['p_book_id'],kalistar_journey_ack:['p_book_id']});
async function create(data,{journeyKey=null}={}){
  calls.kalistar_journey_equipment_claim=['p_book_id','p_stage'];
  calls.kalistar_journey_equipment_ack=['p_book_id','p_stage'];
  const db=new PGlite({extensions:{pgcrypto}});let queue=Promise.resolve();
  await db.exec(`create schema auth;create schema extensions;create role anon;create role authenticated;
    create table auth.users(id uuid primary key,email_confirmed_at timestamptz,email text);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema public,auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`);
  for(let i=0;i<2;i++)await db.query('insert into auth.users values($1,now(),$2)',[ids[i],i?'tokyo@example.invalid':'paris@example.invalid']);
  for(const file of fs.readdirSync(path.join(__dirname,'migrations')).filter(n=>n.endsWith('.sql')).sort())await db.exec(fs.readFileSync(path.join(__dirname,'migrations',file),'utf8'));
  for(let i=0;i<2;i++)await db.query("insert into kalistar_private.players(user_id,email_sha256,local_profile,label) values($1,extensions.digest($2,'sha256'),$3,$4)",[ids[i],i?'tokyo@example.invalid':'paris@example.invalid',i?'user-tokyo':'user-paris',i?'Tokyo':'Paris']);
  await db.exec(require('./starter-grants.cjs').sql(data));
  if(journeyKey){
    await db.query('insert into kalistar_private.journey_config(id,signing_key) values(true,$1)',[journeyKey]);
    await db.query('insert into kalistar_private.admins(user_id) values($1)',[ids[0]]);
  }
  async function serialized(fn){const next=queue.then(fn);queue=next.catch(()=>{});return next;}
  async function call(name,args={},profile='user-paris'){
    return serialized(async()=>{
      if(!Object.hasOwn(calls,name))throw Error('Unexpected fixture RPC '+name);
      if(!['user-paris','user-tokyo','anon'].includes(profile))throw Error('Unexpected fixture identity');
      await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[profile==='anon'?'':profile==='user-paris'?ids[0]:ids[1]]);await db.exec('set role '+(profile==='anon'?'anon':'authenticated'));
      try{const params=calls[name],values=params.map(k=>{const v=args[k]??null;return v&&typeof v==='object'?JSON.stringify(v):v;});
        const result=await db.query('select public.'+name+'('+params.map((_,i)=>'$'+(i+1)).join(',')+')',values);return Object.values(result.rows[0])[0];
      }finally{await db.exec('reset role');}
    });
  }
  return {call,
    equipmentGrant:(profile,item)=>serialized(()=>db.query('insert into kalistar_private.equipment_grants(user_id,equipment_id,source) values($1,$2,$3) on conflict do nothing',[ids[profile==='user-paris'?0:1],item,'local-test'])),
    legacyEquipmentSave:(profile,payload)=>serialized(()=>db.query('update kalistar_private.player_saves set payload=$2 where user_id=$1',[ids[profile==='user-paris'?0:1],JSON.stringify(payload)])),
    resetEquipment:profile=>serialized(async()=>(await db.query('select kalistar_private.reset_unowned_equipment($1) as changed',[ids[profile==='user-paris'?0:1]])).rows[0].changed),
    equipmentPermissions:()=>serialized(async()=>(await db.query(`select rolname,
      has_table_privilege(rolname,'kalistar_private.equipment_grants','SELECT,INSERT,UPDATE,DELETE') as grants,
      has_table_privilege(rolname,'kalistar_private.equipment_reset_backups','SELECT,INSERT,UPDATE,DELETE') as backups,
      has_function_privilege(rolname,'kalistar_private.reset_unowned_equipment(uuid)','EXECUTE') as reset,
      has_function_privilege(rolname,'kalistar_private.kalistar_player_before_equipment()','EXECUTE') as old_player,
      has_function_privilege(rolname,'kalistar_private.kalistar_journey_start_before_equipment(text,jsonb,uuid,text)','EXECUTE') as old_journey
      from pg_roles where rolname in ('anon','authenticated')`)).rows),
    backup:()=>serialized(async()=>(await db.query(require('./backup.cjs').query())).rows),
    models:()=>serialized(async()=>(await db.query('select id,name,title from public.kalistar_models order by name')).rows),
    resetProgress:()=>serialized(()=>db.exec('delete from kalistar_private.player_saves')),
    resetEquipmentGrants:()=>serialized(()=>db.exec('delete from kalistar_private.equipment_grants')),
    read:profile=>call('kalistar_sync_read',{},profile),close:()=>queue.then(()=>db.close())};
}
module.exports={create,ids};
