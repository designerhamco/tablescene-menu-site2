import assert from "node:assert/strict";
import { build } from "esbuild";
import { pathToFileURL } from "node:url";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";

const directory = await fs.mkdtemp(path.join(os.tmpdir(), "artimenu-payment-service-"));
const outfile = path.join(directory, "service.mjs");
globalThis.__terminalPrepQA = { owner: true, writeAllowed: true, calls: [], data: [], error: null };
await build({ entryPoints: ["lib/server/payment-terminal-preparation-service.ts"], outfile, bundle: true, format: "esm", platform: "node", plugins: [{
  name: "isolated-authorization-storage",
  setup(builder) {
    builder.onResolve({ filter: /^server-only$|^@\/lib\/supabase\/admin$|^\.\/menu-site-access-service$/ }, args => ({ path: args.path, namespace: "isolated" }));
    builder.onLoad({ filter: /.*/, namespace: "isolated" }, args => ({ contents: args.path === "server-only" ? "export {};"
      : args.path.endsWith("admin") ? `export function createAdminClient(){return {rpc:async(name,args)=>{const q=globalThis.__terminalPrepQA;q.calls.push({name,args});return {data:q.data,error:q.error}}}}`
      : `export async function requireMenuSitePermission(){return {isOwner:globalThis.__terminalPrepQA.owner,actorUserId:'test-actor'}};
         export async function requireMenuSiteWriteAccess(){if(!globalThis.__terminalPrepQA.writeAllowed)throw new Error('inactive write');return {};}` }));
  }
}] });
try {
  const service = await import(pathToFileURL(outfile));
  const state = globalThis.__terminalPrepQA;
  const draft = { provider: "nice_apppos_ios", terminalModel: "NM-400", businessNumber: "0000000000", terminalId: "TEST000001", localPort: "" };
  let checks = 0;
  const check = (a, b) => { assert.deepEqual(a, b); checks++; };
  const reject = async (fn, pattern) => { await assert.rejects(fn, pattern); checks++; };
  state.owner = false;
  await reject(() => service.loadPaymentTerminalPreparations("site"), /사장님/);
  await reject(() => service.savePaymentTerminalPreparation("site", draft, 0), /사장님/);
  check(state.calls, []);
  state.owner = true; state.writeAllowed = false;
  await reject(() => service.savePaymentTerminalPreparation("site", draft, 0), /inactive/); check(state.calls, []);
  state.writeAllowed = true;
  await reject(() => service.savePaymentTerminalPreparation("site", { ...draft, apiKey: "not-accepted" }, 0), /항목/);
  await reject(() => service.savePaymentTerminalPreparation("site", draft, -1), /저장 상태/); check(state.calls, []);
  state.error = { code: "PGRST202", message: "not installed" };
  check(await service.loadPaymentTerminalPreparations("site"), { available: false, preparations: [] });
  await reject(() => service.savePaymentTerminalPreparation("site", draft, 0), /준비 중/);
  state.error = { code: "40001" };
  await reject(() => service.savePaymentTerminalPreparation("site", draft, 1), /다른 화면/);
  state.error = { code: "network", message: "internal database detail" };
  await reject(() => service.loadPaymentTerminalPreparations("site"), /불러오지 못했습니다/);
  state.error = null; state.data = [{ draft, revision: 1, updatedAt: "2026-11-03T00:00:00Z" }];
  check((await service.loadPaymentTerminalPreparations("site")).preparations.length, 1);
  state.data = { draft, revision: 2, updatedAt: "2026-11-03T00:00:01Z" };
  check((await service.savePaymentTerminalPreparation("site", draft, 1)).revision, 2);
  check(state.calls.at(-1), { name: "save_payment_terminal_preparation", args: { p_menu_site_id: "site", p_actor_user_id: "test-actor", p_configuration: draft, p_expected_revision: 1 } });
  state.data = [{ draft, revision: "corrupt", updatedAt: "invalid" }];
  await reject(() => service.loadPaymentTerminalPreparations("site"), /저장 상태/);
  console.log(JSON.stringify({ checks, failed: 0, environment: "isolated service; no network or Production write" }));
} finally {
  delete globalThis.__terminalPrepQA;
  await fs.rm(directory, { recursive: true, force: true });
}
