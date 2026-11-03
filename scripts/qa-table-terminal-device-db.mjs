// Isolated PostgreSQL only. QA_PGLITE_MODULE may point to a separately installed PGlite runtime.
const { PGlite } = await import(process.env.QA_PGLITE_MODULE || '@electric-sql/pglite');
import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const db=new PGlite();const menu='11111111-1111-4111-8111-111111111111',table='22222222-2222-4222-8222-222222222222';
try {
 await db.exec(`create role anon;create role authenticated;create role service_role;
 create table public.menu_sites(id uuid primary key,status text);
 create table public.menu_tables(id uuid primary key,menu_site_id uuid,status text);
 create table public.table_visit_sessions(id uuid primary key default gen_random_uuid(),menu_site_id uuid,menu_table_id uuid,token_hash text,user_agent_hash text,expires_at timestamptz,access_channel text,revoked_at timestamptz);
 insert into public.menu_sites values('${menu}','published');insert into public.menu_tables values('${table}','${menu}','active');`);
 const original=await fs.readFile('supabase/migrations/20261029001153_add_order_session_settings.sql','utf8');
 const start=original.indexOf('create function public.register_table_terminal_visit('),end=original.indexOf('$$;',start)+3;
 await db.exec(original.slice(start,end));
 await db.exec(await fs.readFile('supabase/migrations/20261103053430_add_table_terminal_device_info.sql','utf8'));
 await db.exec('grant select,insert,update on public.menu_sites,public.menu_tables,public.table_visit_sessions to service_role; set role service_role;');
 const register=async(token,previous,info)=> (await db.query('select public.register_table_terminal_visit_with_device($1,$2,$3,$4,$5,$6::jsonb) as id',[menu,table,token,'agent',previous,JSON.stringify(info)])).rows[0].id;
 const id=await register('first',null,{kind:'태블릿',os:'iPadOS 27.0.1',model:'iPad Pro 11',browser:'Safari'});
 assert.deepEqual((await db.query('select device_info from table_visit_sessions where id=$1',[id])).rows[0].device_info,{kind:'태블릿',os:'iPadOS 27.0.1',model:'iPad Pro 11',browser:'Safari'});
 await assert.rejects(register('bad','first',[]));
 await assert.rejects(register('oversized','first',{model:'a'.repeat(2200)}));
 assert.equal((await db.query('select revoked_at from table_visit_sessions where id=$1',[id])).rows[0].revoked_at,null);
 const another=await register('second',null,{kind:'태블릿',os:'Android 15',model:'SM-X900',browser:'Chrome'});
 const replaced=await register('replacement','first',{});
 const rows=(await db.query('select id,revoked_at from table_visit_sessions')).rows;
 assert.equal(rows.length,3);assert.ok(rows.find(r=>r.id===id).revoked_at);assert.equal(rows.find(r=>r.id===another).revoked_at,null);assert.equal(rows.find(r=>r.id===replaced).revoked_at,null);
 await db.exec(`update menu_tables set status='disabled' where id='${table}'`);await assert.rejects(register('inactive',null,{}));
 assert.equal((await db.query('select count(*)::int as n from table_visit_sessions')).rows[0].n,3);
 await db.exec('reset role');
 for(const role of ['anon','authenticated']) {const access=(await db.query("select has_function_privilege($1,'public.register_table_terminal_visit_with_device(uuid,uuid,text,text,text,jsonb)','execute') as allowed",[role])).rows[0];assert.equal(access.allowed,false);}
 assert.equal((await db.query("select has_function_privilege('service_role','public.register_table_terminal_visit_with_device(uuid,uuid,text,text,text,jsonb)','execute') as allowed")).rows[0].allowed,true);
 const legacy=(await db.query("select device_info from table_visit_sessions where id=$1",[replaced])).rows[0];assert.deepEqual(legacy.device_info,{});
 console.log(JSON.stringify({passed:12,productionWrites:0,checks:['additive schema','device stored','invalid and oversized metadata atomic','previous connection rotation','other device preserved','inactive rejected','anon/auth denied','service role allowed','legacy metadata fallback']}));
} finally {await db.close();}
