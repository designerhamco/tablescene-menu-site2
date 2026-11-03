// Uses only aggregate reads and existing identities. Execute verification is
// opt-in and refuses to run when the preceding dry-run has any candidates.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
import {createClient} from '@supabase/supabase-js';
const base=process.env.ORDER_QA_BASE||'https://tablescene-menu-site2.vercel.app';
assert.ok(process.env.CRON_SECRET,'existing cron credentials required');
const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
async function counts(){const values=await Promise.all(['notification_events','notification_delivery_keys'].map(table=>db.from(table).select('id',{count:'exact',head:true})));for(const result of values)assert.equal(result.error,null);return values.map(r=>r.count);}
const before=await counts();
const source=await fs.readFile('lib/server/notification-delivery-key.ts','utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const loaded={exports:{}};new Function('require','module','exports',compiled)(name=>{assert.equal(name,'server-only');return {};},loaded,loaded.exports);
const {data,error}=await db.from('notification_delivery_keys').select('id,user_id,event_type,channel,period_key,menu_site_id,subscription_id').not('period_key','is',null).limit(1);assert.equal(error,null);
if(data.length){const r=data[0];const found=await loaded.exports.findNotificationDeliveryKey(db,{userId:r.user_id,eventType:r.event_type,channel:r.channel,periodKey:r.period_key,menuSiteId:r.menu_site_id,subscriptionId:r.subscription_id});assert.equal(found?.id,r.id);}
const endpoint=base+'/api/cron/prune-notifications';
assert.equal((await fetch(endpoint,{redirect:'manual'})).status,401,'unauthenticated cleanup is denied');
const headers={authorization:`Bearer ${process.env.CRON_SECRET}`};
const response=await fetch(endpoint+'?dryRun=true',{headers});assert.equal(response.status,200);
assert.match(response.headers.get('cache-control'),/private, no-store/);
const dryRun=await response.json();assert.equal(dryRun.ok,true);assert.equal(dryRun.dryRun,true);assert.equal(dryRun.deleted,0);
let execute=null;
if(process.env.QA_VERIFY_EMPTY_RETENTION_EXECUTE==='1'){
 assert.equal(dryRun.candidates,0,'refuse execute probe with any existing deletion candidate');
 const res=await fetch(endpoint,{headers});assert.equal(res.status,200);execute=await res.json();
 assert.equal(execute.ok,true);assert.equal(execute.dryRun,false,'Production retention flag must be enabled');assert.equal(execute.deleted,0);
}
const after=await counts();assert.deepEqual(after,before,'verification preserves original notifications and minimal keys');
console.log(JSON.stringify({before,after,ledgerLookupMatched:data.length?true:null,dryRun,execute,createdNotifications:0,sentEmails:0}));
