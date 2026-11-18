import assert from "node:assert/strict";
import test from "node:test";
import { activeHomeService, isServiceHomeHref, SERVICE_HOME_HREFS, SERVICE_HOME_SECTIONS } from "./service-home-navigation";
import { SITE_NAV_ITEMS, isSiteNavItemActive } from "./site-navigation";

test("service navigation targets the corresponding home frame while other routes keep page selection", () => {
  for (const service of ["basic", "dining", "display"] as const) {
    const item = SITE_NAV_ITEMS.find(item => item.sectionId === SERVICE_HOME_SECTIONS[service])!;
    assert.equal(item.path, SERVICE_HOME_HREFS[service]);
    assert.ok(isServiceHomeHref(item.path));
    assert.ok(isSiteNavItemActive(item, "/", SERVICE_HOME_SECTIONS[service]));
    assert.equal(isSiteNavItemActive(item, "/templates", SERVICE_HOME_SECTIONS[service]), false);
    assert.equal(isSiteNavItemActive(item, "/", null), false);
  }
  assert.ok(isSiteNavItemActive(SITE_NAV_ITEMS[3], "/templates/example"));
  assert.ok(isSiteNavItemActive(SITE_NAV_ITEMS[4], "/guides/example"));
  for (const href of ["/", "/templates", "/#unknown", { pathname: "/" }, null]) assert.equal(isServiceHomeHref(href), false);
});

test("flow anchors select the current service when scrolling in either direction and clear outside the stack", () => {
  const at = (scroll: number) => activeHomeService([
    { id: "service-basic", top: 1000 - scroll },
    { id: "service-dining", top: 3000 - scroll },
    { id: "service-display", top: 5000 - scroll },
  ], 7000 - scroll, 72);
  assert.deepEqual([0, 1000, 3000, 5000, 7000, 5000, 3000, 1000, 0].map(at), [null, "service-basic", "service-dining", "service-display", null, "service-display", "service-dining", "service-basic", null]);
  assert.equal(activeHomeService([], NaN, 72), null);
});

test("all existing service introduction URLs permanently redirect to their home frame in one hop", async () => {
  const routes = [
    ["services/basic", "basic"], ["services/dining", "dining"], ["services/display", "display"],
    ["services/menu", "basic"], ["services/signature", "basic"],
    ["services/screen", "display"], ["services/full-option", "display"], ["tablescene-pro", "display"],
  ] as const;
  for (const [path, service] of routes) {
    const route = await import(`../app/${path}/page.tsx`);
    assert.throws(() => route.default(), (error: unknown) => Boolean(error && typeof error === "object" && "digest" in error && error.digest === `NEXT_REDIRECT;replace;${SERVICE_HOME_HREFS[service]};308;`), path);
  }
});
