// Isolated PostgreSQL. No credentials, remote connections or customer records.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const {PGlite}=await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db=new PGlite();
const site='11111111-1111-4111-8111-111111111111';
try {
 await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
 create schema auth; create table auth.users(id uuid primary key); create table public.menu_sites(id uuid primary key);
 insert into public.menu_sites values ('${site}');`);
 await db.exec(readFileSync(new URL('../supabase/migrations/20261104082127_add_menu_floor_plans.sql',import.meta.url),'utf8'));
 for(const role of ['anon','authenticated']) {
  await db.exec(`set role ${role}`);
  await assert.rejects(db.query('select * from public.menu_floor_plans'),/permission denied/);
  await assert.rejects(db.query('insert into public.menu_floor_plans(menu_site_id) values($1)',[site]),/permission denied/);
  await assert.rejects(db.query('update public.menu_floor_plans set revision=2'),/permission denied/);
  await assert.rejects(db.query('delete from public.menu_floor_plans'),/permission denied/);
  await db.exec('reset role');
 }
 await db.exec('set role service_role');
 await db.query('insert into public.menu_floor_plans(menu_site_id) values($1)',[site]);
 await assert.rejects(db.query('insert into public.menu_floor_plans(menu_site_id) values($1)',[site]),/unique constraint/);
 assert.equal((await db.query('update public.menu_floor_plans set revision=2 where menu_site_id=$1 and revision=1 returning revision',[site])).rows.length,1);
 assert.equal((await db.query('update public.menu_floor_plans set revision=3 where menu_site_id=$1 and revision=1 returning revision',[site])).rows.length,0);
 for(const value of [{}, {rooms:null,placements:[]}, {rooms:[],placements:Array(201).fill({})}]) await assert.rejects(db.query('update public.menu_floor_plans set document=$1 where menu_site_id=$2',[JSON.stringify(value),site]));
 await assert.rejects(db.query('update public.menu_floor_plans set revision=0'),/check constraint/);
 await db.exec('reset role');
 assert.equal((await db.query("select relrowsecurity from pg_class where oid='public.menu_floor_plans'::regclass")).rows[0].relrowsecurity,true);
 await db.query('delete from public.menu_sites where id=$1',[site]);
 assert.equal((await db.query('select * from public.menu_floor_plans')).rows.length,0);
 console.log(JSON.stringify({roles:3,passed:true,remoteWrites:0}));
}finally{await db.close();}
