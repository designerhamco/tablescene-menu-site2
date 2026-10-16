import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { ONE_PAGE_QA_TEMPLATES } from "./one-page-qa";
import { getSwitchableTemplatesForService } from "./template-switching";
import { isKnownTemplateKey, isValidTemplateKey, resolveTemplatePreviewRouteKey, templateCatalog } from "./templates";

test("deleted KOHI cannot be selected, previewed or reintroduced by the QA catalogue", () => {
  const removedKey: string = "cafe_kohi_a";
  assert.equal(isValidTemplateKey(removedKey), false);
  assert.equal(isKnownTemplateKey(removedKey), false);
  assert.equal(resolveTemplatePreviewRouteKey(removedKey), null);
  for (const inventory of [templateCatalog, getSwitchableTemplatesForService("basic"), ONE_PAGE_QA_TEMPLATES]) {
    assert.equal(inventory.some(template => template.key === removedKey), false);
  }
  assert.equal(existsSync(new URL("../public/menu-templates/cafe_kohi_a", import.meta.url)), false);
});
