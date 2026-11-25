import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
type Fixture = { db: unknown; actor: string; owner: boolean; writeAllowed: boolean };
const fixture: Fixture = { db: null, actor: "11111111-1111-4111-8111-111111111111", owner: true, writeAllowed: true };
(globalThis as unknown as { __walletTest: Fixture }).__walletTest = fixture;
const bundle = await build({ entryPoints: [fileURLToPath(new URL("./server/alimtalk-wallet-service.ts", import.meta.url))], bundle: true, platform: "node", format: "esm", write: false,
  plugins: [{ name: "isolated", setup(b) {
    b.onResolve({ filter: /^(server-only|.*supabase\/admin|.*menu-site-access-service|.*lib\/portone)$/ }, a => ({ path: a.path, namespace: "test" }));
    b.onLoad({ filter: /.*/, namespace: "test" }, a => ({ contents: a.path === "server-only" ? "export {};"
      : a.path.endsWith("supabase/admin") ? "export function createAdminClient(){return globalThis.__walletTest.db}"
      : a.path.endsWith("lib/portone") ? "export const portOneStoreId='test-store',portOneChannelKey='test-channel';export function requirePortOneApiSecret(){return 'fake-secret'}"
      : "export async function requireMenuSitePermission(){return {actorUserId:globalThis.__walletTest.actor,isOwner:globalThis.__walletTest.owner}};export async function requireMenuSiteWriteAccess(){if(!globalThis.__walletTest.writeAllowed)throw new Error('lifecycle read only');return {}}" }));
  } }] });
const { reconcileAlimtalkTopup, loadAlimtalkWallet, handleAlimtalkWallet } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].contents).toString("base64")}`) as typeof import("./server/alimtalk-wallet-service");
const id = "alimtalk_33333333-3333-4333-8333-333333333333", menu = "22222222-2222-4222-8222-222222222222";
const intent = { payment_id: id, owner_id: fixture.actor, menu_site_id: menu, amount: 10000, store_id: "test-store", channel_key: "test-channel", state: "pending" };
const paid = () => ({ id, storeId: "test-store", currency: "KRW", channel: { id: "internal-channel-id", key: "test-channel" }, status: "PAID", amount: { total: 10000, paid: 10000, cancelled: 0 }, customData: { purpose: "alimtalk_topup", owner_id: intent.owner_id, menu_site_id: menu } });
function setup(t: TestContext, row: unknown = intent) {
  const calls: { name: string; args: unknown }[] = [];
  fixture.owner = true; fixture.actor = intent.owner_id; fixture.writeAllowed = true;
  fixture.db = { from(table: string) { assert.equal(table,"alimtalk_topups"); const q = { select() { return q; }, eq(key: string,val: string) { assert.equal(key,"payment_id");assert.equal(val,id);return q; }, async maybeSingle() { return { data: row, error: null }; } }; return q; },
    async rpc(name: string,args: unknown) { calls.push({name,args});return {data:[],error:null}; } };
  const oldFetch = globalThis.fetch; t.after(() => { globalThis.fetch = oldFetch; });
  globalThis.fetch = async () => { throw new Error("unexpected external request"); };
  return calls;
}
test("foreign owner and unknown intent cannot trigger a provider lookup or grant", async t => {
  const calls = setup(t);
  await assert.rejects(reconcileAlimtalkTopup(id,"other-owner"),/충전 결제 정보를/);
  assert.equal(calls.length,0);
  setup(t,null);
  await assert.rejects(reconcileAlimtalkTopup(id),/충전 결제 정보를/);
});
test("browser/webhook only settle with a fresh server-verified payment", async t => {
  const calls = setup(t); let gets = 0;
  globalThis.fetch = async (url, options) => {
    gets++; assert.equal(String(url),`https://api.portone.io/payments/${id}?storeId=test-store`);
    assert.equal((options?.headers as Record<string,string>).Authorization,"PortOne fake-secret");
    assert.equal(options?.method,undefined); // GET only; no automatic charge.
    return Response.json(paid());
  };
  assert.equal(await reconcileAlimtalkTopup(id,intent.owner_id),"credited");
  assert.equal(gets,1); assert.deepEqual(calls,[{name:"credit_alimtalk_topup",args:{p_payment_id:id,p_owner_id:intent.owner_id,p_verified_amount:10000}}]);
});
test("a successful payment for another product cannot fund the AlimTalk wallet", async t => {
  const calls = setup(t); globalThis.fetch = async () => Response.json({...paid(),customData:{purpose:"ai_credit_purchase"}});
  await assert.rejects(reconcileAlimtalkTopup(id),/일치하지/); assert.equal(calls.length,0);
});
test("network failure or unpaid payment cannot manufacture wallet money", async t => {
  const calls = setup(t); await assert.rejects(reconcileAlimtalkTopup(id)); assert.equal(calls.length,0);
  globalThis.fetch = async () => Response.json({...paid(),status:"READY"});
  assert.equal(await reconcileAlimtalkTopup(id),"pending"); assert.equal(calls.length,0);
});
test("a delayed provider result can settle after merchant checkout was disabled", async t => {
  const calls = setup(t); fixture.writeAllowed = false;
  globalThis.fetch = async () => Response.json(paid());
  assert.equal(await reconcileAlimtalkTopup(id),"credited"); assert.equal(calls[0].name,"credit_alimtalk_topup");
});
test("partial refund goes to review and never credits again", async t => {
  const calls = setup(t,{...intent,state:"credited"});
  globalThis.fetch = async () => Response.json({...paid(),status:"PARTIAL_CANCELLED",amount:{total:10000,paid:10000,cancelled:12}});
  assert.equal(await reconcileAlimtalkTopup(id),"review"); assert.deepEqual(calls,[{name:"flag_alimtalk_topup_review",args:{p_payment_id:id}}]);
});
test("staff cannot read account-wide balances or start a topup", async t => {
  setup(t); fixture.owner = false;
  await assert.rejects(loadAlimtalkWallet(menu),/사장님만/);
  await assert.rejects(handleAlimtalkWallet(menu,{intent:"topup",amount:10000}),/사장님만/);
});
test("new topup respects lifecycle write restriction", async t => {
  setup(t); fixture.writeAllowed = false;
  await assert.rejects(handleAlimtalkWallet(menu,{intent:"topup",amount:10000}),/lifecycle read only/);
});
