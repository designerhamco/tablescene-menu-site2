import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement as h } from "react";
import { renderToStaticMarkup as render } from "react-dom/server";
import { InputGroup, InputGroupAddon, InputGroupInput } from "../app/components/ui/input-group";
import { SearchField } from "../app/components/ui/search-field";
import { PasswordField } from "../app/components/ui/password-field";
import { Checkbox } from "../app/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "../app/components/ui/radio-group";
import { ToggleGroup, ToggleGroupItem } from "../app/components/ui/toggle-group";
import { SITE_CONTROL_DENSITY } from "./site-spacing";
import { Calendar } from "../app/components/ui/calendar";

const css = readFileSync(new URL("../styles/ui-system.css", import.meta.url), "utf8");

test("input groups keep names, validation, units and existing field-size roles", () => {
  for (const size of ["sm", "md", "lg", "search"] as const) {
    const html = render(h(InputGroup, {fieldSize:size}, h(InputGroupInput, {id:"amount", name:"amount", defaultValue:"10000", required:true, inputMode:"decimal", "aria-describedby":"unit"}),h(InputGroupAddon,{id:"unit"},"원")));
    assert.match(html,new RegExp(`data-field-size="${size}"`));
    assert.match(html,/name="amount"/);assert.match(html,/value="10000"/);assert.match(html,/required=""/);assert.match(html,/inputMode="decimal"/i);assert.match(html,/aria-describedby="unit"/);
    assert.doesNotMatch(html,/<form|<button/);
  }
  assert.match(css,/\.site-input-group:focus-within:not\(:has\(input:disabled, input\[readonly\]\)\)/);
  assert.match(css,/\.site-input-group:has\(input\[aria-invalid="true"\]\):not\(:has\(input:disabled\)\)/);
});

test("search clear is a named non-submit action only when an editable value exists", () => {
  const empty=render(h(SearchField,{label:"메뉴 검색",value:"",onValueChange(){}}));
  const filled=render(h(SearchField,{label:"메뉴 검색",name:"query",value:"아티! 메뉴",onValueChange(){}}));
  const readonly=render(h(SearchField,{label:"메뉴 검색",value:"저장값",readOnly:true,onValueChange(){}}));
  const disabled=render(h(SearchField,{label:"메뉴 검색",value:"저장값",disabled:true,onValueChange(){}}));
  assert.doesNotMatch(empty,/<button/);assert.doesNotMatch(readonly,/<button/);
  assert.match(filled,/type="search"/);assert.match(filled,/aria-label="메뉴 검색"/);assert.match(filled,/name="query"/);assert.match(filled,/value="아티! 메뉴"/);
  assert.match(filled,/<button[^>]*type="button"[^>]*aria-label="메뉴 검색 지우기"/);
  assert.match(disabled,/<button[^>]*disabled=""/);
  assert.doesNotMatch(filled,/ aria-invalid="(?:true|grammar|spelling)"| role="alert"/);
});

test("password inputs retain browser validation and autocomplete with an independent visibility action", () => {
  const html=render(h(PasswordField,{id:"password",name:"password",defaultValue:"existing-value",required:true,minLength:8,autoComplete:"current-password","aria-describedby":"password-rules"}));
  assert.match(html,/type="password"/);assert.match(html,/name="password"/);assert.match(html,/value="existing-value"/);assert.match(html,/required=""/);assert.match(html,/minLength="8"/i);assert.match(html,/autoComplete="current-password"/i);assert.match(html,/aria-describedby="password-rules"/);
  assert.match(html,/<button[^>]*type="button"[^>]*aria-label="비밀번호 표시"[^>]*aria-controls="password"[^>]*aria-pressed="false"/);
  assert.equal((html.match(/name="password"/g)??[]).length,1);
  assert.match(render(h(PasswordField,{disabled:true})),/<button[^>]*disabled=""/);
});

test("Radix checkbox states include the partial-selection glyph and explicit disabled state", () => {
  const mixed=render(h(Checkbox,{checked:"indeterminate","aria-label":"전체 선택"}));
  const checked=render(h(Checkbox,{checked:true,disabled:true,"aria-label":"선택됨"}));
  assert.match(mixed,/aria-checked="mixed"/);assert.match(mixed,/data-state="indeterminate"/);assert.match(mixed,/lucide-minus/);
  assert.match(checked,/aria-checked="true"/);assert.match(checked,/disabled=""/);assert.match(checked,/lucide-check/);
  assert.match(css,/\.site-checkbox, \.site-radio \{[^}]*width: var\(--ui-choice-size\); height: var\(--ui-choice-size\);/);
});

test("radio selection keeps a single checked option and native group submission", () => {
  const html=render(h(RadioGroup,{value:"email",name:"channel","aria-label":"채널"},h(RadioGroupItem,{value:"email","aria-label":"이메일"}),h(RadioGroupItem,{value:"sms","aria-label":"문자"}),h(RadioGroupItem,{value:"disabled",disabled:true,"aria-label":"준비 중"})));
  assert.match(html,/role="radiogroup"/);assert.equal((html.match(/role="radio" aria-checked="true"/g)??[]).length,1);assert.match(html,/name="channel"/);assert.match(html,/value="email"/);assert.match(html,/disabled=""/);
});

test("calendar dates keep selected and disabled semantics independently of generic action geometry", () => {
  const html=render(h(Calendar,{mode:"single",selected:new Date(2026,10,11),defaultMonth:new Date(2026,10,1),disabled:[new Date(2026,10,12)]}));
  const days=[...html.matchAll(/<button[^>]*site-calendar-day[^>]*>/g)].map(match=>match[0]);
  assert.ok(days.some(day=>day.includes('aria-selected="true"')));assert.ok(days.some(day=>day.includes('disabled=""')));
  assert.match(html,/site-calendar-nav-button/);
  assert.match(css,/\.site-calendar \.site-calendar-day \{[^}]*min-height: var\(--ui-control-height-compact\);/);
  assert.match(css,/\.site-calendar \.site-calendar-day\[aria-selected="true"\] \{ background: var\(--ui-text\); color: var\(--ui-surface\);/);
});


test("dedicated search keeps one native submit action inside its capsule and supports server GET defaults", () => {
  const html = render(h("form", {method:"get",action:"/mypage/inquiries"}, h(SearchField,{label:"제목 검색",name:"inquiryQuery",defaultValue:"메뉴판!",submitLabel:"검색 실행",required:true,maxLength:100})));
  assert.match(html,/class="site-field site-input-group site-search-field"/);
  assert.match(html,/name="inquiryQuery"/);assert.match(html,/value="메뉴판!"/);assert.match(html,/required=""/);assert.match(html,/maxLength="100"/i);
  assert.equal((html.match(/type="submit"/g)??[]).length,1);
  assert.match(html,/data-search-action="submit"/);assert.match(html,/aria-label="검색 실행"/);
  assert.equal((html.match(/lucide-search/g)??[]).length,1);
  assert.match(html,/<button[^>]*type="button"[^>]*aria-label="제목 검색 지우기"/);
});

test("view size switches expose exactly one selected option in the shared segmented group", () => {
  const html = render(h(ToggleGroup,{type:"single",appearance:"segmented",value:"small","aria-label":"썸네일 크기"},h(ToggleGroupItem,{value:"large","aria-label":"크게"},"큰 보기"),h(ToggleGroupItem,{value:"small","aria-label":"작게"},"작은 보기")));
  assert.match(html,/role="group"/);assert.match(html,/data-appearance="segmented"/);
  assert.equal((html.match(/aria-checked="true"/g)??[]).length,1);
  assert.doesNotMatch(html,/site-tool-button/);
});

test("compact controls document the same density and keep a separate coarse-pointer field policy", () => {
  assert.ok(SITE_CONTROL_DENSITY.some(role=>role.token==="--ui-menu-inset"&&role.value==="8px"));
  assert.match(css,/--ui-menu-row-height: 2rem;/);assert.match(css,/--ui-menu-inset: \.5rem;/);
  assert.match(css,/--ui-field-font-size: var\(--site-type-14\);/);
  assert.match(css,/@media \(pointer: coarse\) \{[\s\S]*?--ui-field-font-size: var\(--site-type-16\); --ui-menu-row-height: 2\.5rem;/);
  assert.match(css,/\.site-multiselect-options \{ display: grid; gap: 0; \}/);
  assert.match(css,/\.site-multiselect-body > \.site-content-divider \{[^}]*padding: 0;/);
  assert.match(css,/\.site-multiselect-option:has\(input:focus-visible\)/);
  assert.match(css,/\.site-multiselect-option > input\[type="checkbox"\]:focus-visible \{ outline: none; \}/);
});
