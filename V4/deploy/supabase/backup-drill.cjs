'use strict';
// No host, URL or credentials accepted: restoration runs only in a fresh PGlite.
const path=require('node:path'),{createRequire}=require('node:module'),{validate,counts}=require('./backup.cjs');
const runtime=createRequire(path.join(process.env.KALISTAR_CLOUD_MODULES||path.resolve(__dirname,'../../../work/supabase-runtime/node_modules'),'_backup_drill.cjs'));
const {PGlite}=runtime('@electric-sql/pglite'),{pgcrypto}=runtime('@electric-sql/pglite/contrib/pgcrypto');
const ident=v=>'"'+v.replaceAll('"','""')+'"',table=t=>ident(t.schema)+'.'+ident(t.name);
async function drill(bundle){
  const snapshot=validate(bundle.snapshot),db=new PGlite({extensions:{pgcrypto}});
  try{
    await db.exec('create schema auth;create schema extensions;create role anon;create role authenticated;');
    for(const t of snapshot.tables.filter(t=>t.schema==='auth')){
      for(const c of t.columns)if(!/^(uuid|text|boolean|jsonb?|bytea|smallint|integer|bigint|timestamp(?:\(\d+\))? (?:with|without) time zone|character varying(?:\(\d+\))?)$/.test(c.type))throw Error('Unsupported Auth drill type '+c.type);
      await db.exec('create table '+table(t)+' ('+t.columns.map(c=>ident(c.name)+' '+c.type).join(',')+',primary key(id))');
    }
    await db.exec("create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to anon,authenticated;");
    for(const m of bundle.migrations)await db.exec(m.sql);
    // Only the newly-created, in-memory fixture is cleared of migration seeds.
    await db.exec('truncate '+snapshot.tables.map(table).join(',')+' restart identity cascade');
    const done=new Set(),remaining=snapshot.tables.slice();
    while(remaining.length){
      const i=remaining.findIndex(t=>t.parents.every(p=>done.has(p)));
      if(i<0)throw Error('Snapshot dependencies missing or cyclic');
      const t=remaining.splice(i,1)[0],columns=t.columns.filter(c=>t.schema==='auth'||!c.generated).map(c=>ident(c.name)).join(',');
      if(t.rows.length)await db.query('insert into '+table(t)+' ('+columns+') overriding system value select '+columns+' from jsonb_populate_recordset(null::'+table(t)+',$1::jsonb)',[JSON.stringify(t.rows)]);
      done.add(t.schema+'.'+t.name);
    }
    for(const s of snapshot.sequences){
      if(!/^(public|kalistar_private)$/.test(s.schemaname)||!/^\w+$/.test(s.sequencename))throw Error('Unexpected snapshot sequence');
      await db.query('select setval($1::regclass,$2::bigint,$3)',[ident(s.schemaname)+'.'+ident(s.sequencename),s.last_value??s.start_value,s.last_value!==null]);
    }
    for(const t of snapshot.tables){
      // Compare typed values, including timestamp precision/timezone normalization.
      const actual='select to_jsonb(r) from '+table(t)+' r',expected='select to_jsonb(r) from jsonb_populate_recordset(null::'+table(t)+',$1::jsonb) r';
      const differences=(await db.query('select count(*)::int as n from (('+actual+' except all '+expected+') union all ('+expected+' except all '+actual+')) d',[JSON.stringify(t.rows)])).rows[0].n;
      if(differences)throw Error('Restored rows differ: '+t.schema+'.'+t.name);
    }
    const insecure=(await db.query("select count(*)::int as n from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind='r' and (n.nspname='kalistar_private' or n.nspname='public' and c.relname like 'kalistar%') and not c.relrowsecurity")).rows[0].n;
    if(insecure)throw Error('Restored tables lack RLS');
    return {passed:true,mode:'fresh in-memory PostgreSQL; no Auth service or production writes',tables:counts(snapshot)};
  }finally{await db.close();}
}
module.exports={drill};
