import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { auditSiteSystem, collectSiteSystemFiles, isSiteSystemFile, newSiteSystemViolations, staleSiteSystemAllowances, type SiteSystemBaseline } from "./site-system-audit";

const shell = "components/layout/SitePage.tsx";
const header = "components/layout/SitePageHeader.tsx";
const base = [[shell, "export default function SitePage() { return <main />; }"], [header, "export default function SitePageHeader() { return <h1 />; }"]] as const;
const audit = (entries: [string,string][]) => auditSiteSystem(new Map([...base, ...entries]));

test("new routes inherit SitePage through aliases and composed views without a per-route inventory update", () => {
  const good = audit([
    ["app/new-section/page.tsx", 'import View from "@/components/NewView"; export default function Page(){return <View/>}'],
    ["components/NewView.tsx", 'import Page from "@/components/layout/SitePage"; export default function View(){return <Page title="새 페이지"><p>본문</p></Page>}'],
  ]);
  assert.deepEqual(good, []);
  assert.ok(audit([["app/new-section/page.tsx", 'export default function Page(){return <main><p>내용</p></main>}']]).some(item => item.rule === "page-shell"));
  assert.deepEqual(audit([["app/redirect/page.tsx", 'import {redirect} from "next/navigation"; export default function Page(){redirect("/templates")}']]), []);
});

test("heading guards reject wrapper offsets, responsive utilities, arbitrary values and inline styles", () => {
  for (const attribute of ['className="lg:pt-12"', 'className="[padding-top:24px]"', 'style={{marginTop:24}}']) {
    assert.ok(audit([["components/NewView.tsx", `import Page from "@/components/layout/SitePage"; export default function View(){return <div ${attribute}><Page title="제목">내용</Page></div>}`]]).some(item => item.rule === "heading-spacing"), attribute);
  }
  assert.ok(audit([["components/NewView.tsx", 'export default function View(){return <h1 className="type-page-title">제목</h1>}']]).some(item => item.rule === "shared-heading"));
  assert.ok(audit([
    ["components/NewView.tsx", 'import Page from "@/components/layout/SitePage"; import css from "./view.module.css"; export default function View(){return <div className={css.outer}><Page title="제목">내용</Page></div>}'],
    ["components/view.module.css", '.outer { padding-block: 24px; }'],
  ]).some(item => item.rule === "heading-css"));
});

test("tab and field appearance uses shared APIs even through aliased controls and conditional classes", () => {
  for (const value of ['md:px-8', 'data-[state=active]:bg-red-500', '[padding:24px]', 'rounded-full']) {
    assert.ok(audit([["components/NewView.tsx", `import { TabsTrigger as Trigger } from "@/app/components/ui/tabs"; export default function View(){return <Trigger className="${value}">탭</Trigger>}`]]).some(item => item.rule === "control-appearance"), value);
  }
  assert.ok(audit([["components/NewView.tsx", 'import { Tabs } from "@/app/components/ui/tabs"; export default function View(){return <Tabs variant="area"/>}']]).some(item => item.rule === "tab-purpose"));
  assert.ok(audit([["components/NewView.tsx", 'import {Input} from "@/app/components/ui/input"; export default function View(){return <Input style={{borderRadius:48}}/>}']]).some(item => item.rule === "control-appearance"));
  assert.ok(audit([["components/view.css", '.outer .site-area-tab { padding: 0; }']]).some(item => item.rule === "control-css"));
  assert.ok(audit([["components/view.css", '.outer { --ui-tab-inactive-text: black; }']]).some(item => item.rule === "shared-token"));
});

test("CSS checks target the control itself and do not treat an ancestor's body copy as a control", () => {
  const result = audit([
    ["components/NewView.tsx", 'import {Button} from "@/app/components/ui/button"; import css from "./view.module.css"; export default function View(){return <><Button className={css.action}>실행</Button><p/></>}'],
    ["components/view.module.css", '.action > svg { height: 16px; } .action p { color: red; }'],
  ]);
  assert.deepEqual(result, []);
});

test("legacy inventory cannot excuse a copied violation in a new file or additional occurrences", () => {
  const old = audit([["components/OldView.tsx", '<h1 className="type-page-title">기존</h1>']]);
  const baseline: SiteSystemBaseline = { "components/OldView.tsx": { "shared-heading": [old[0].fingerprint] } };
  assert.deepEqual(newSiteSystemViolations(old, baseline), []);
  const copied = audit([["components/NewView.tsx", '<h1 className="type-page-title">새 페이지</h1>']]);
  assert.equal(newSiteSystemViolations(copied, baseline).length, 1);
  const doubled = audit([["components/OldView.tsx", '<><h1 className="type-page-title">기존</h1><h1 className="type-page-title">추가</h1></>']]);
  assert.equal(newSiteSystemViolations(doubled, baseline).length, 1);
});

test("customer renderers remain separate while new official-site routes and components are discovered", () => {
  for (const path of ["app/future/page.tsx", "components/future/View.tsx", "styles/future.css"]) assert.ok(isSiteSystemFile(path));
  for (const path of ["app/menu/[slug]/page.tsx", "app/pickup/[slug]/page.tsx", "components/menu-templates/BasicMenuTemplate.tsx"]) assert.equal(isSiteSystemFile(path), false);
});

test("current site contains no new heading, shell, token or control exceptions", () => {
  const baseline = JSON.parse(readFileSync("docs/site-system-legacy-inventory.json", "utf8")) as SiteSystemBaseline;
  const failures = newSiteSystemViolations(auditSiteSystem(collectSiteSystemFiles(process.cwd())), baseline);
  assert.deepEqual(failures.map(item => `${item.file}:${item.line} ${item.rule} ${item.detail}`), []);
  assert.deepEqual(staleSiteSystemAllowances(auditSiteSystem(collectSiteSystemFiles(process.cwd())), baseline), []);
});


test("the canonical heading component cannot quietly add a private numeric offset", () => {
  const files = new Map([[header, 'export default function Header(){return <header><h1 className="type-page-title mt-12">제목</h1></header>}']]);
  assert.ok(auditSiteSystem(files).some(item => item.rule === "heading-spacing"));
});

test("all production build modes run the same design-system gate", () => {
  const { scripts } = JSON.parse(readFileSync("package.json", "utf8"));
  for (const hook of ["prebuild", "prebuild:turbo", "prebuild:debug-memory"]) assert.equal(scripts[hook], "npm run check:site-ui");
  for (const contract of ["check:site-system", "site-system-contract.test.ts", "site-typography-contract.test.ts", "site-control-states.test.ts", "public-accessibility-contrast.test.ts"]) assert.ok(scripts["check:site-ui"].includes(contract));
});


test("migrated legacy exceptions must be removed instead of leaving a reusable bypass", () => {
  const old = audit([["components/OldView.tsx", '<h1>기존</h1>']]);
  const baseline: SiteSystemBaseline = { "components/OldView.tsx": { "shared-heading": [old[0].fingerprint] } };
  assert.deepEqual(staleSiteSystemAllowances(old, baseline), []);
  assert.equal(staleSiteSystemAllowances([], baseline).length, 1);
});
