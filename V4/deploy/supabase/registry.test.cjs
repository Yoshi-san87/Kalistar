'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const runtime=process.env.KALISTAR_CLOUD_MODULES||path.resolve(__dirname,'../../..','work/supabase-runtime/node_modules');
const requireRuntime=createRequire(path.join(runtime,'_registry_test.cjs'));
const {PGlite}=requireRuntime('@electric-sql/pglite'),{pgcrypto}=requireRuntime('@electric-sql/pglite/contrib/pgcrypto');
const migrations=fs.readdirSync(path.join(__dirname,'migrations')).filter(n=>n.endsWith('.sql')).sort().map(n=>fs.readFileSync(path.join(__dirname,'migrations',n),'utf8'));
const ids=['00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000004'];

test('registry migration, real PostgreSQL permissions and complete specimen lifecycle',async t=>{
  const db=new PGlite({extensions:{pgcrypto}});
  const query=async(sql,args=[])=>db.query(sql,args),value=async(sql,args=[])=>Object.values((await query(sql,args)).rows[0])[0];
  async function as(index,role='authenticated'){await db.exec('reset role');await query("select set_config('request.jwt.claim.sub',$1,false)",[index===null?'':ids[index]]);await db.exec('set role '+role);}
  async function denied(sql,args=[]){await assert.rejects(query(sql,args),e=>['42501','23502','23505','22023'].includes(e.code));}
  let issued,other,transfer;
  try{
    await db.exec(`create schema auth;create schema extensions;create role anon;create role authenticated;
      create table auth.users(id uuid primary key,email_confirmed_at timestamptz);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema public,auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`);
    for(let i=0;i<ids.length;i++)await query('insert into auth.users values($1,$2)',[ids[i],i===3?null:new Date().toISOString()]);
    for(const migration of migrations)await db.exec(migration);
    await query('insert into kalistar_private.admins values($1)',[ids[0]]);
    await t.test('default deny includes private schemas, hashes, audit and all owner mutations',async()=>{
      await as(null,'anon');
      assert.equal(await value('select count(*)::int from public.kalistar_models'),2);
      for(const table of ['kalistar_profiles','kalistar_collectibles','kalistar_transfers'])await denied('select * from public.'+table);
      for(const table of ['activations','events','admins','attempts'])await denied('select * from kalistar_private.'+table);
      await denied("select public.kalistar_my_cards()");await denied("select public.kalistar_issue('30000001',true)");
      assert.equal(await value("select public.kalistar_certificate('KC-00000000000000000000000000000000')"),null);
    });
    await t.test('only confirmed authenticated users create profiles, no client-chosen owner or admin',async()=>{
      await as(3);await denied("select public.kalistar_set_profile('unverified','Non verifie',false)");
      for(let i=0;i<3;i++){await as(i);await value('select public.kalistar_set_profile($1,$2,false)',['player_'+i,'Joueur '+i]);}
      await as(1);assert.equal((await value('select public.kalistar_me()')).isAdmin,false);
      await denied("select public.kalistar_issue('30000001',true)");
      await denied('insert into public.kalistar_profiles values($1,$2,$3,true,now())',[ids[3],'forged','Usurpe']);
      await denied('update public.kalistar_profiles set user_id=$1',[ids[0]]);
      await denied("select public.kalistar_set_profile('player_0','Copie',true)");
      assert.equal(await value('select count(*)::int from public.kalistar_profiles'),1);
    });
    await t.test('admin issuance is unclaimed, unique and pilot by default; no secret in public projections',async()=>{
      await as(0);issued=await value("select public.kalistar_issue('30000001')");other=await value("select public.kalistar_issue('30000001')");
      assert.match(issued.card.id,/^KC-[a-f0-9]{32}$/);assert.match(issued.secret,/^[a-f0-9]{64}$/);
      assert.notEqual(issued.card.id,other.card.id);assert.notEqual(issued.secret,other.secret);
      assert.equal(issued.card.status,'unclaimed');assert.equal(issued.card.pilot,true);
      assert.match(issued.card.barcode,/^\d{8}$/);assert.notEqual(issued.card.barcode,other.card.barcode);
      assert.equal((await value('select public.kalistar_certificate($1)',[issued.card.barcode])).id,issued.card.id);
      assert.equal((await value('select public.kalistar_my_cards()')).length,0);
      await as(null,'anon');const cert=await value('select public.kalistar_certificate($1)',[issued.card.id]);
      assert.equal(cert.owner,null);assert(!JSON.stringify(cert).includes(issued.secret));assert(!JSON.stringify(cert).includes(ids[0]));
    });
    await t.test('bad activation attempts commit and are limited per account, without revealing existence',async()=>{
      await as(2);
      for(let i=0;i<5;i++)assert.equal((await value('select public.kalistar_activate($1,$2)',[issued.card.id,'0'.repeat(64)])).code,'activation_refused');
      assert.equal((await value('select public.kalistar_activate($1,$2)',[issued.card.id,issued.secret])).code,'rate_limited');
      await db.exec('reset role');assert.equal(await value('select attempts from kalistar_private.attempts where user_id=$1',[ids[2]]),5);
      await query("update kalistar_private.attempts set window_at=now()-interval '2 minutes' where user_id=$1",[ids[2]]);
      await as(2);assert.equal((await value('select public.kalistar_activate($1,$2)',['not-an-id',null])).code,'activation_refused');
    });
    await t.test('activation consumes the secret and cannot steal an owned card; private owner stays private',async()=>{
      await as(1);const result=await value('select public.kalistar_activate($1,$2)',[issued.card.id,issued.secret]);
      assert.equal(result.ok,true);assert.equal(result.card.owner,null);assert.equal(result.card.status,'owned');
      assert.equal((await value('select public.kalistar_my_cards()')).length,1);
      await denied('update public.kalistar_collectibles set owner_id=$1',[ids[2]]);
      await denied('delete from public.kalistar_collectibles');
      await as(2);assert.equal((await value('select public.kalistar_activate($1,$2)',[issued.card.id,issued.secret])).code,'activation_refused');
      assert.equal((await value('select public.kalistar_my_cards()')).length,0);
      await as(1);await value("select public.kalistar_set_profile('player_1','Mon pseudo',true)");
      await as(null,'anon');const cert=await value('select public.kalistar_certificate($1)',[issued.card.id]);
      assert.deepEqual(cert.owner,{handle:'player_1',displayName:'Mon pseudo'});assert(!JSON.stringify(cert).includes(ids[1]));
    });
    await t.test('only the owner offers, only the recipient accepts, one pending transfer per specimen',async()=>{
      await as(2);await denied('select public.kalistar_offer($1,$2)',[issued.card.id,'player_0']);
      await as(1);await denied('select public.kalistar_offer($1,$2)',[issued.card.id,'player_1']);
      await denied('select public.kalistar_offer($1,$2)',[issued.card.id,'missing_player']);
      transfer=await value('select public.kalistar_offer($1,$2)',[issued.card.id,'player_2']);
      await denied('select public.kalistar_offer($1,$2)',[issued.card.id,'player_0']);
      await denied('select public.kalistar_settle($1,$2)',[transfer,'accepted']);
      await as(0);await denied('select public.kalistar_settle($1,$2)',[transfer,'accepted']);
      assert.equal((await value('select public.kalistar_my_transfers()')).length,0);
      await as(2);assert.equal((await value('select public.kalistar_my_transfers()'))[0].incoming,true);
      const card=await value('select public.kalistar_settle($1,$2)',[transfer,'accepted']);
      assert.equal(card.id,issued.card.id);assert.equal(card.serial,issued.card.serial);
      assert.equal((await value('select public.kalistar_my_cards()')).length,1);
      await denied('select public.kalistar_settle($1,$2)',[transfer,'accepted']);
      await as(1);assert.equal((await value('select public.kalistar_my_cards()')).length,0);
      assert.equal((await value('select public.kalistar_activate($1,$2)',[issued.card.id,issued.secret])).code,'activation_refused');
    });
    await t.test('cancellation and rejection keep ownership and append immutable-to-clients history',async()=>{
      await as(2);const cancelled=await value('select public.kalistar_offer($1,$2)',[issued.card.id,'player_1']);
      await value('select public.kalistar_settle($1,$2)',[cancelled,'cancelled']);
      const rejected=await value('select public.kalistar_offer($1,$2)',[issued.card.id,'player_1']);
      await as(1);await value('select public.kalistar_settle($1,$2)',[rejected,'rejected']);
      await as(2);assert.equal((await value('select public.kalistar_my_cards()')).length,1);
      await denied('update kalistar_private.events set kind=$1',['issued']);
      await db.exec('reset role');const history=(await query('select kind from kalistar_private.events order by id')).rows.map(x=>x.kind);
      assert.deepEqual(history,['issued','issued','activated','offered','accepted','offered','cancelled','offered','rejected']);
      const activation=(await query('select secret_hash,used_at from kalistar_private.activations where collectible_id=$1',[issued.card.id.slice(3)])).rows[0];
      assert(activation.used_at);assert.equal(activation.secret_hash.length,32);
    });
  }finally{await db.close();}
});
