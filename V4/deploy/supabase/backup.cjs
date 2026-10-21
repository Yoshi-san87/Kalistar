'use strict';
// Logical application snapshot. Managed Auth sessions/settings and media are separate.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const project='fkskjhlaaagqlfcsojjp';
const tableFilter="(n.nspname='kalistar_private' or n.nspname='public' and c.relname like 'kalistar\\_%' escape '\\' or n.nspname='auth' and c.relname in ('users','identities'))";
function query(){return `with tables as (
 select n.nspname as schema,c.relname as name,c.oid from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where c.relkind='r' and ${tableFilter}
), snapshot as (
 select jsonb_build_object('format','kalistar-logical-backup','version',1,'project','${project}',
 'createdAt',clock_timestamp(),'serverVersion',current_setting('server_version'),
 'tables',(select jsonb_agg(jsonb_build_object('schema',t.schema,'name',t.name,
 'columns',(select jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'generated',a.attgenerated) order by a.attnum) from pg_attribute a where a.attrelid=t.oid and a.attnum>0 and not a.attisdropped),
 'parents',(select coalesce(jsonb_agg(distinct pn.nspname||'.'||pc.relname),'[]'::jsonb) from pg_constraint k join pg_class pc on pc.oid=k.confrelid join pg_namespace pn on pn.oid=pc.relnamespace where k.conrelid=t.oid and k.contype='f' and k.confrelid<>t.oid),
 'rows',x.data::jsonb) order by t.schema,t.name) from tables t cross join lateral xmltable('/row' passing query_to_xml(format('select coalesce(jsonb_agg(to_jsonb(r)), ''[]''::jsonb) as data from %I.%I r',t.schema,t.name),false,true,'') columns data text path 'data') x),
 'sequences',(select coalesce(jsonb_agg(to_jsonb(s)),'[]'::jsonb) from pg_sequences s where s.schemaname='kalistar_private' or s.schemaname='public' and s.sequencename like 'kalistar%'))::text as body
), encoded as (select replace(encode(convert_to(body,'UTF8'),'base64'),E'\\n','') as data,encode(extensions.digest(convert_to(body,'UTF8'),'sha256'),'hex') as sha256 from snapshot)
 select part,ceil(length(data)/48000.0)::int as parts,sha256,substring(data from (part-1)*48000+1 for 48000) as chunk
 from encoded cross join lateral generate_series(1,ceil(length(data)/48000.0)::int) part order by part;\n`;}
function decodeCSV(input){
  // Export consists exclusively of numeric/base64/hex cells, never quoted JSON.
  const lines=String(input).replace(/^\uFEFF/,'').trim().split(/\r?\n/),header=lines.shift().replaceAll('"','');
  if(header!=='part,parts,sha256,chunk')throw Error('Unexpected backup export header');
  const rows=lines.map(line=>line.split(',').map(v=>v.replace(/^"|"$/g,'')));
  const expected=Number(rows[0]?.[1]),hash=rows[0]?.[2];
  if(!expected||expected!==rows.length||!/^\w{64}$/.test(hash))throw Error('Incomplete backup export');
  for(let i=0;i<rows.length;i++)if(rows[i].length!==4||Number(rows[i][0])!==i+1||Number(rows[i][1])!==expected||rows[i][2]!==hash||!(/^[A-Za-z0-9+/=]+$/).test(rows[i][3]))throw Error('Invalid backup chunk');
  const bytes=Buffer.from(rows.map(row=>row[3]).join(''),'base64');
  if(crypto.createHash('sha256').update(bytes).digest('hex')!==hash)throw Error('Backup checksum mismatch');
  const snapshot=JSON.parse(bytes);validate(snapshot);return snapshot;
}
function validate(s){
  if(s?.format!=='kalistar-logical-backup'||s.version!==1||s.project!==project||!Array.isArray(s.tables)||!Array.isArray(s.sequences))throw Error('Invalid Kalistar snapshot');
  const names=new Set();
  for(const t of s.tables){
    const name=t.schema+'.'+t.name;
    if(!/^(kalistar_private\.[a-z_]+|public\.kalistar_[a-z_]+|auth\.(users|identities))$/.test(name)||names.has(name)||!Array.isArray(t.rows)||!Array.isArray(t.columns)||!Array.isArray(t.parents))throw Error('Unexpected snapshot table');
    if(t.columns.some(c=>!(/^[a-z_][a-z_0-9]*$/).test(c.name)||typeof c.type!=='string'))throw Error('Invalid snapshot columns');
    names.add(name);
  }
  for(const name of ['auth.users','public.kalistar_collectibles','kalistar_private.players','kalistar_private.player_saves','kalistar_private.journey_attempts','kalistar_private.registry_version'])if(!names.has(name))throw Error('Missing snapshot table '+name);
  return s;
}
function bundle(snapshot){
  validate(snapshot);
  const version=snapshot.tables.find(t=>t.name==='registry_version').rows[0]?.version;
  const all=fs.readdirSync(path.join(__dirname,'migrations')).filter(n=>n.endsWith('.sql')).sort();
  // Match the live schema, not an unpublished additive migration in this checkout.
  const migrations=all.filter(n=>version===8?n<'202610170000':version===9?n<='202610170010_progress_archives.sql':version===10?n<='202610210011_equipment_ownership.sql':version===11?n<='202610210012_journey_sequels.sql':false).map(name=>({name,sql:fs.readFileSync(path.join(__dirname,'migrations',name),'utf8')}));
  if(![8,9,10,11].includes(version)||!migrations.length)throw Error('Unsupported schema for backup bundle');
  return {snapshot,migrations};
}
function counts(snapshot){return Object.fromEntries(snapshot.tables.map(t=>[t.schema+'.'+t.name,t.rows.length]));}
module.exports={query,decodeCSV,validate,bundle,counts};
if(require.main===module){
  const [command,file]=process.argv.slice(2);
  if(command==='query')process.stdout.write(query());
  else if(command==='check'&&file){const s=decodeCSV(fs.readFileSync(file,'utf8'));console.log(JSON.stringify({project,createdAt:s.createdAt,counts:counts(s)}));}
  else throw Error('Usage: node backup.cjs query | check exported.csv');
}
