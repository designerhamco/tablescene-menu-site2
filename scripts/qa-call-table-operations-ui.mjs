import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {chromium,expect} from "@playwright/test";
const base=process.env.CALL_QA_BASE||"http://localhost:3000",out="/private/tmp/call-table-ui",route="app/qa-call-table-operations";
await fs.mkdir(out,{recursive:true});await fs.mkdir(route,{recursive:true});
await fs.writeFile(route+"/page.tsx",`import {notFound} from 'next/navigation';
import CallItemManager from '@/app/mypage/menus/[menuId]/calls/CallItemManager';
import Form from '@/app/mypage/menus/[menuId]/order-settings/OrderSettingsForm';
export default async function Page({searchParams}:{searchParams:Promise<{service?:string;ready?:string}>}){if(process.env.NODE_ENV==='production')notFound();const p=await searchParams;return <main className="mx-auto max-w-5xl space-y-6 p-4"><h1 className="text-2xl font-bold">주문·호출 설정</h1><CallItemManager menuSiteId="00000000-0000-4000-8000-000000000004" service={p.service==='dining'?'dining':'basic'} items={[{key:'custom_saved',label:'저장된 매장 요청',sortOrder:0,active:true}]}/><Form menuId="00000000-0000-4000-8000-000000000004" courses={[]} runtime={{calls:p.ready==='1',orders:false}} settings={{callEnabled:false,orderEnabled:false,postpayEnabled:true,mobilePrepayVisible:false,orderableCourseIds:[]}}/></main>;}`);
const browser=await chromium.launch(),results=[],errors=[],writes=[];
try{
for(const service of ["basic","dining"])for(const [width,height] of [[320,568],[390,844],[820,1180],[1180,820],[1440,900]]){
 const p=await browser.newPage({viewport:{width,height}});p.on("pageerror",e=>errors.push(e.message));
 await p.route("**/*",async r=>{if(!["GET","HEAD"].includes(r.request().method())){writes.push(r.request().url());return r.abort();}return r.continue();});
 await p.goto(base+"/qa-call-table-operations?service="+service,{waitUntil:"networkidle"});
 const manager=p.locator("section").filter({has:p.getByRole("heading",{name:"호출 항목 설정",exact:true})});
 await expect(manager.getByRole("textbox",{name:"항목 이름"})).toHaveValue("저장된 매장 요청");
 await manager.getByRole("button",{name:"기본 항목 불러오기",exact:true}).click();
 await expect(manager.getByRole("textbox",{name:"항목 이름"})).toHaveCount(5);
 const expected=service==="dining"?["주문 요청","계산 요청","와인 문의","물 요청","직원 호출"]:["물 요청","식기 요청","테이블 정리","계산 요청","직원 호출"];
 assert.deepEqual(await manager.locator('input:not([type="hidden"]):not([type="checkbox"])').evaluateAll(es=>es.map(e=>e.value)),expected);
 await expect(manager.getByRole("button",{name:"항목 추가",exact:true})).toBeDisabled();
 assert.equal((JSON.parse(await manager.locator('input[name="itemsJson"]').inputValue())).length,5);
 const first=manager.getByRole("textbox",{name:"항목 이름"}).first();await first.fill("냅킨 요청");await manager.getByRole("button",{name:"냅킨 요청 아래로 이동",exact:true}).click();
 await expect(manager.getByRole("textbox",{name:"항목 이름"}).nth(1)).toHaveValue("냅킨 요청");
 await manager.getByRole("button",{name:"냅킨 요청 제거",exact:true}).click();await expect(manager.getByRole("textbox",{name:"항목 이름"})).toHaveCount(4);
 await manager.getByRole("button",{name:"항목 추가",exact:true}).click();await expect(manager.getByRole("textbox",{name:"항목 이름"})).toHaveCount(5);
 await expect(p.getByText("호출 항목과 사용 여부를 미리 저장할 수 있습니다.",{exact:false})).toBeVisible();
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 const viewport=await p.evaluate(()=>({width:innerWidth,height:innerHeight}));assert.equal(viewport.width,width);assert.equal(viewport.height,height);
 if(service==="dining"&&width===390)await p.screenshot({path:out+"/mobile.png",fullPage:true});
 results.push({service,...viewport});await p.close();
}
const ready=await browser.newPage();await ready.goto(base+"/qa-call-table-operations?service=dining&ready=1");await expect(ready.getByText("직원 호출이 연결되어 있습니다.",{exact:false})).toBeVisible();await ready.close();
assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);await fs.writeFile(out+"/report.json",JSON.stringify({results,errors,writes},null,2));console.log(JSON.stringify({passed:results.length+1,results,productionWrites:0,realCalls:0}));
}finally{await browser.close();await fs.rm(route,{recursive:true,force:true});}
