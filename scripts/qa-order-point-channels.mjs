import assert from 'node:assert/strict';
import {NextRequest} from 'next/server.js';
import {TABLE_VISIT_SESSION_COOKIE} from '../lib/table-qr-session-tokens.ts';

/** Runs against real isolated PostgreSQL + actual services/routes, never the merchant database. */
export async function verifyOrderPointChannels({q,basic,table,other,item,option,services,ua,session,settings}) {
 let count=0;
 const check=(a,b)=>{assert.deepEqual(a,b);count++;};
 const reject=async(fn,re)=>{await assert.rejects(fn,re);count++;};
 const hash=()=>crypto.randomUUID().replaceAll('-','').repeat(2);
 const prefs={...settings,table_order:{...settings.table_order,orderEnabled:true,callEnabled:true,customerPhone:'hidden'}};
 await q("update menu_sites set status='published',settings=$1 where id=$2",[prefs,basic]);
 await q("update menu_tables set status='active' where id=$1",[table]);
 const customer=await session();
 const register=async(id)=>services.terminal.registerTableTerminal(basic,id,ua,undefined,{kind:'태블릿',os:'Android 15',model:'SM-X900',browser:'Chrome'});
 const registered=await register(table);
 const terminal=await services.visits.resolveTableVisitSession({expectedMenuSiteId:basic,sessionToken:registered.token,userAgent:ua});
 check(terminal.menuTableId,table);check(terminal.pointKind,'table');
 const read=async(token)=>services.visits.resolveTableVisitSession({expectedMenuSiteId:basic,sessionToken:token,userAgent:ua});
 const request=(token,name,body,method='POST')=>new NextRequest('https://menu.test/api/public-menu/'+name,{method,headers:{origin:'https://menu.test','user-agent':ua,'content-type':'application/json',cookie:TABLE_VISIT_SESSION_COOKIE+'='+token},...(method==='GET'?{}:{body:JSON.stringify(body)})});
 let orderCounter=0;
 const order=token=>services.api.POST(request(token,'orders',{menuSiteId:basic,clientRequestId:crypto.randomUUID(),lines:[{menuItemId:item,quantity:1+(orderCounter++%20),optionValueIds:[option]}]}));
 const call=token=>services.callApi.POST(request(token,'calls',{menuSiteId:basic,callItemKey:'staff'}));
 // Opposite policies coexist on one physical table. Client-supplied channel never changes authority.
 await q('update menu_tables set customer_order_enabled=false,terminal_call_enabled=false where id=$1',[table]);
 check((await read(customer.token)).orderAllowed,false);check((await read(customer.token)).callAllowed,true);
 check((await read(registered.token)).orderAllowed,true);check((await read(registered.token)).callAllowed,false);
 check((await order(customer.token)).status,409);check((await order(registered.token)).status,201);
 check((await call(customer.token)).status,201);check((await call(registered.token)).status,409);
 const spoof={menuSiteId:basic,clientRequestId:crypto.randomUUID(),channel:'terminal',lines:[{menuItemId:item,quantity:1,optionValueIds:[option]}]};
 check((await services.api.POST(request(customer.token,'orders',spoof))).status,409);
 // SQL triggers also reject stale/retained RPC clients; no insertion or lost prior orders.
 const lines=JSON.stringify([{menuItemId:item,quantity:1,optionValueIds:[option]}]);
 await reject(()=>q('select * from submit_postpay_order_v2($1,$2,$3,null,$4::jsonb)',[basic,customer.id,crypto.randomUUID(),lines]),/POINT_RECEPTION_UNAVAILABLE/);
 await reject(()=>q('select * from submit_staff_call($1,$2,$3)',[basic,terminal.id,'staff']),/POINT_RECEPTION_UNAVAILABLE/);
 const rowsBefore=await q('select id,status from menu_customer_orders where menu_site_id=$1 order by id',[basic]);
 await q('update menu_tables set terminal_order_enabled=false where id=$1',[table]);
 check((await order(registered.token)).status,409);
 check(await q('select id,status from menu_customer_orders where menu_site_id=$1 order by id',[basic]),rowsBefore);
 // Kiosk is a different immutable point kind, with its own numbered identity, and needs no physical table.
 const created=await services.pointManagement.createMenuTable({menuSiteId:basic,label:'키오스크 1',kind:'kiosk'});
 const another=await services.pointManagement.createMenuTable({menuSiteId:basic,label:'키오스크 2',kind:'kiosk'});
 const kiosk=created.table.id,kiosk2=another.table.id;check(created.table.kind,'kiosk');check(created.table.policy.customerOrderEnabled,false);
 const setting={menuSiteId:basic,tableId:kiosk,channel:'terminal',feature:'orders',enabled:false,expectedEnabled:true};
 await reject(()=>services.pointManagement.setOrderPointFeature(setting),/사장님/);globalThis.__visitIsOwner=true;
 await services.pointManagement.setOrderPointFeature(setting);await reject(()=>services.pointManagement.setOrderPointFeature(setting),/설정이 변경/);
 await services.pointManagement.setOrderPointFeature({...setting,enabled:true,expectedEnabled:false});
 check((await q('select terminal_order_enabled from menu_tables where id=$1',[kiosk2]))[0].terminal_order_enabled,true);
 await q("update menu_tables set status='disabled' where menu_site_id=$1 and point_kind='table'",[basic]);
 const a=await register(kiosk),b=await register(kiosk2),av=await read(a.token),bv=await read(b.token);
 check(av.pointKind,'kiosk');check(av.menuTableId,kiosk);check(bv.menuTableId,kiosk2);check(av.policy.customerOrderEnabled,false);
 // A cart prepared before the merchant marks an item sold out must be rejected by the current v3 API.
 const beforeSoldOut=await q('select id,total_amount,status from menu_customer_orders where menu_site_id=$1 order by id',[basic]);
 await q('update menu_items set is_sold_out=true where id=$1',[item]);
 const soldOutResponse=await order(a.token);check(soldOutResponse.status,409);check((await soldOutResponse.json()).message.includes("품절"),true);
 check(await q('select id,total_amount,status from menu_customer_orders where menu_site_id=$1 order by id',[basic]),beforeSoldOut);
 await q('update menu_items set is_sold_out=false where id=$1',[item]);
 const firstKioskOrder=await order(a.token);check(firstKioskOrder.status,201);const firstReceipt=(await firstKioskOrder.json()).order.orderId;
 const otherKioskOrder=await order(b.token);check(otherKioskOrder.status,201);const otherReceipt=(await otherKioskOrder.json()).order.orderId;
 const repeated={menuSiteId:basic,clientRequestId:crypto.randomUUID(),lines:[{menuItemId:item,quantity:3,optionValueIds:[option]}]};
 check((await services.api.POST(request(a.token,'orders',repeated))).status,201);
 check((await services.api.POST(request(a.token,'orders',repeated))).status,200);
 check((await services.api.POST(request(a.token,'orders',{...repeated,clientRequestId:crypto.randomUUID()}))).status,201);
 const receiptHistory=async(receipt)=>{const response=await services.api.GET(request(a.token,'orders?menuSiteId='+basic+(receipt?'&receiptId='+receipt:''),undefined,'GET'));check(response.status,200);return response.json();};
 check((await receiptHistory()).orders,[]);
 check((await receiptHistory(firstReceipt)).orders.map(o=>o.id),[firstReceipt]);
 check((await receiptHistory(otherReceipt)).orders,[]);
 check((await call(a.token)).status,201);
 await q('update menu_tables set terminal_call_enabled=false where id=$1',[kiosk]);check((await call(a.token)).status,409);

 const qr=(await q('select qr_public_id from menu_tables where id=$1',[kiosk]))[0].qr_public_id;
 await reject(()=>services.visits.issueTableVisitSession({tableToken:qr,userAgent:ua}),/키오스크/);
 await reject(()=>q("insert into table_visit_sessions(menu_site_id,menu_table_id,token_hash,user_agent_hash,expires_at) values($1,$2,$3,$4,now()+interval '1 hour')",[basic,kiosk,hash(),hash()]),/KIOSK_TERMINAL_REQUIRED/);
 await reject(()=>q("update menu_tables set point_kind='table' where id=$1",[kiosk]),/identity cannot change/);
 // A global OFF overrides both live kiosks even if individual permissions remain saved ON.
 await q("update menu_sites set settings=jsonb_set(settings,'{table_order,orderEnabled}','false') where id=$1",[basic]);
 check((await order(a.token)).status,409);check((await order(b.token)).status,409);
 let access=await services.orderSession.GET(request(a.token,'order-session?menuSiteId='+basic,undefined,'GET'));
 check(access.status,200);check((await access.json()).orderAllowed,false);
 await q("update menu_sites set settings=jsonb_set(settings,'{table_order,orderEnabled}','true') where id=$1",[basic]);
 check((await order(a.token)).status,201);
 // Per-kind uniqueness is independent; a second kiosk with the same number cannot be inserted.
 await reject(()=>q("insert into menu_tables(menu_site_id,label,token_hash,point_kind,customer_order_enabled,customer_call_enabled) values($1,'키오스크 1',$2,'kiosk',false,false)",[basic,hash()]),/duplicate key/);
 // Missing / revoked / other site sessions never gain kiosk access.
 check(await services.visits.resolveTableVisitSession({expectedMenuSiteId:other,sessionToken:a.token,userAgent:ua}),null);
 await q('update table_visit_sessions set revoked_at=now() where id=$1',[av.id]);check(await read(a.token),null);check((await order(a.token)).status,401);
 check((await read(b.token)).menuTableId,kiosk2);
 for(const role of ['anon','authenticated'])for(const fn of ['private.guard_order_point_reception()','private.guard_kiosk_visit()']) check((await q("select has_function_privilege($1,$2,'execute') allowed",[role,fn]))[0].allowed,false);
 check((await q("select bool_and(relrowsecurity and relforcerowsecurity) ok from pg_class where oid in ('menu_tables'::regclass,'table_visit_sessions'::regclass)"))[0].ok,true);
 // Actual owner-only deletion services, preview fingerprint and SQL transaction.
 const preview = id => services.pointManagement.previewOrderPointDeletion({menuSiteId:basic,tableId:id});
 const remove = (snap, withHistory=false, extra={}) => services.pointManagement.deleteOrderPoint({menuSiteId:basic,tableId:snap.id,fingerprint:snap.fingerprint,confirmationLabel:snap.label,withHistory,...extra});
 const unused=(await services.pointManagement.createMenuTable({menuSiteId:basic,label:'삭제 검수',kind:'kiosk'})).table;
 globalThis.__visitIsOwner=false;
 await reject(()=>preview(unused.id),/사장님/);globalThis.__visitIsOwner=true;
 const blank=await preview(unused.id);check(blank.orderCount,0);check(blank.visitCount,0);
 await reject(()=>remove(blank,false,{menuSiteId:other}),/찾을 수 없습니다|사장님/);
 await reject(()=>remove(blank,false,{confirmationLabel:'다른 이름'}),/정확히/);
 await q("update menu_tables set label='이름 변경 검수' where id=$1",[unused.id]);
 await reject(()=>remove(blank),/변경됐습니다/);
 await remove(await preview(unused.id));check((await q('select id from menu_tables where id=$1',[unused.id])).length,0);
 const historicalBefore=await q('select id,total_amount,status from menu_customer_orders where menu_site_id=$1 order by id',[basic]);
 await reject(async()=>remove(await preview(kiosk2)),/이력이 있어/);
 await reject(async()=>remove(await preview(kiosk2),true),/먼저 보관/);
 await services.pointManagement.archiveMenuTable({menuSiteId:basic,tableId:kiosk2});
 await reject(async()=>remove(await preview(kiosk2),true),/미결제|처리 중/);
 check(await q('select id,total_amount,status from menu_customer_orders where menu_site_id=$1 order by id',[basic]),historicalBefore);
 // Complete/settle this kiosk only. Other points and catalog data remain byte-for-byte identical.
 const untouched=await q('select * from menu_customer_orders where menu_site_id=$1 and menu_table_id<>$2 order by id',[basic,kiosk2]);
 await q("update menu_customer_orders set status='served',payment_status='manual_paid',payment_method='manual_cash',payment_completed_at=now(),payment_completed_by=$1 where menu_table_id=$2",[globalThis.__visitOwner,kiosk2]);
 await q("update menu_customer_calls set status='completed',completed_at=now() where menu_table_id=$1",[kiosk2]);
 const summary=await preview(kiosk2);check(summary.orderCount,1);check(summary.collectedAmount>0,true);check(summary.monthCollectedAmount,summary.collectedAmount);
 const items=await q('select id from menu_customer_order_items where order_id=$1',[otherReceipt]);check(items.length>0,true);
 await q("update menu_customer_orders set payment_completed_at=(date_trunc('month',now() at time zone 'Asia/Seoul')+interval '1 month') at time zone 'Asia/Seoul' where menu_table_id=$1",[kiosk2]);
 const future=await preview(kiosk2);check(future.collectedAmount,summary.collectedAmount);check(future.monthCollectedAmount,0);check(future.todayCollectedAmount,0);
 await q('update menu_customer_orders set payment_completed_at=now() where menu_table_id=$1',[kiosk2]);
 const stale=summary.fingerprint;
 await q("update menu_customer_orders set payment_method='manual_card' where menu_table_id=$1",[kiosk2]);
 await reject(()=>remove({...summary,fingerprint:stale},true),/변경됐습니다/);
 const settled=await preview(kiosk2);
 // Audit failure must roll the whole deletion back, including all child cascades.
 await q("create function private.fail_deletion_audit() returns trigger language plpgsql as $$begin raise exception 'AUDIT_TEST_FAILURE';end$$");
 await q('create trigger fail_deletion_audit before insert on private.order_point_deletion_audits for each row execute function private.fail_deletion_audit()');
 await reject(()=>remove(settled,true),/완료하지 못했습니다/);
 check((await q('select count(*)::int count from menu_customer_orders where menu_table_id=$1',[kiosk2]))[0].count,settled.orderCount);
 check((await q('select count(*)::int count from table_visit_sessions where menu_table_id=$1',[kiosk2]))[0].count,settled.visitCount);
 await q('drop trigger fail_deletion_audit on private.order_point_deletion_audits');await q('drop function private.fail_deletion_audit()');
 await reject(()=>q('select public.delete_order_point($1,$2,$3,$4,$5,true)',[basic,kiosk2,crypto.randomUUID(),settled.fingerprint,settled.label]),/OWNER_REQUIRED/);
 // Execute with real service_role privileges, not the fixture superuser.
 await q('set role service_role');
 await remove(settled,true);await q('reset role');
 check((await q('select id from menu_tables where id=$1',[kiosk2])).length,0);
 check((await q('select id from menu_customer_orders where menu_table_id=$1',[kiosk2])).length,0);
 check((await q('select id from menu_customer_calls where menu_table_id=$1',[kiosk2])).length,0);
 check((await q('select id from table_visit_sessions where menu_table_id=$1',[kiosk2])).length,0);
 check((await q('select id from menu_customer_order_items where id=any($1)',[items.map(x=>x.id)])).length,0);
 check((await q('select id from menu_customer_order_item_options where order_item_id=any($1)',[items.map(x=>x.id)])).length,0);
 check(await q('select * from menu_customer_orders where menu_site_id=$1 and menu_table_id<>$2 order by id',[basic,kiosk2]),untouched);
 const audit=(await q('select * from private.order_point_deletion_audits where point_id=$1',[kiosk2]))[0];check(audit.actor_user_id,globalThis.__visitOwner);check(audit.summary.orderCount,1);
 for(const role of ['anon','authenticated'])for(const fn of ['public.preview_order_point_deletion(uuid,uuid)','public.delete_order_point(uuid,uuid,uuid,text,text,boolean)','private.delete_order_point(uuid,uuid,uuid,text,text,boolean)'])check((await q("select has_function_privilege($1,$2,'execute') allowed",[role,fn]))[0].allowed,false);
 // Permission checks are repeated on delete; a stale owner preview does not authorize staff.
 globalThis.__visitIsOwner=false;await reject(()=>remove(blank),/사장님/);globalThis.__visitIsOwner=true;
 return count;
}
