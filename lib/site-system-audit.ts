import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import ts from "typescript";
import postcss from "postcss";
import { SITE_TYPE_ROLES } from "./site-typography";

type FileMap = Map<string, string>;
export type SiteSystemViolation = { file: string; rule: string; line: number; detail: string; fingerprint: string };
export type SiteSystemBaseline = Record<string, Record<string, string[]>>;
const owners = new Set(["app/globals.css", "styles/ui-system.css", "styles/site-design.css", "styles/site-spacing.css", "styles/typography.css", "styles/theme.css"]);
const infrastructure = new Set(["components/layout/SitePage.tsx", "components/layout/SitePageHeader.tsx"]);
const sharedControls = new Set(["Tabs", "TabsList", "TabsTrigger", "NavigationTabs", "Button", "Input", "Textarea", "InputGroup", "InputGroupInput", "InputGroupAddon", "InputGroupAction", "SearchField", "PasswordField", "FilterToolbar", "ToggleGroup", "ToggleGroupItem", "SelectTrigger", "CategoryFilter"]);
const headingNames = new Set(["SitePage", "SitePageHeader"]);
const appearance = /^(?:p[trblxyse]?|h|min-h|max-h|rounded(?:-[a-z]+)?|font|text|bg|border(?:-[trblxyse])?|leading|shadow|opacity)-|^\[(?:padding|font|color|background|border|height|opacity|box-shadow|line-height):/;
const verticalUtility = /^(?:!?-?(?:p[ytb]|m[ytb]|p|m|space-y|gap-y|translate-y|top|bottom)-|!?gap-|\[(?:margin|padding|gap|top|bottom|translate|transform)[^:]*:)/;
const verticalProperty = /^(?:margin(?:-(?:top|bottom|block(?:-start|-end)?))?|padding(?:-(?:top|bottom|block(?:-start|-end)?))?|row-gap|gap|top|bottom|translate|transform)$/;
const appearanceProperty = /^(?:padding(?:-.+)?|font(?:-.+)?|line-height|color|background(?:-.+)?|border(?:-.+)?|(?:min-|max-)?height|box-shadow|opacity)$/;
const protectedSelector = /(?:\.site-(?:area-tab(?:s|s-root)?|page-tabs|topic-tab(?:s)?|tab(?:s)?|button|field|chip|indicator-icon|icon-control)\b|\[data-slot=["']?tabs(?:-list|-trigger)?["']?\])/;
const compositionSelector = /\.site-(?:content-panel|stack-title|field-stack|form-row|action-row|content-divider|content-heading-row|notice-layout|detail-grid|detail-field|checkbox-grid|checkbox-field|field-grid|data-row|record-heading|record-actions)\b/;
const compositionUtility = /^(?:-?(?:p[trblxyse]?|m[trblxyse]?|gap(?:-[xy])?|space-[xy])-|font-|leading-|tracking-)/;
const typeRoles = new Set<string>(SITE_TYPE_ROLES.map(role => role.className));

function utilityValue(token: string) {
  let depth = 0, start = 0;
  for (let i = 0; i < token.length; i++) {
    if (token[i] === "[") depth++;
    if (token[i] === "]") depth--;
    if (token[i] === ":" && depth === 0) start = i + 1;
  }
  return token.slice(start).replace(/^!|!$/g, "");
}

function selectorTargets(selector: string) {
  const targets: string[] = [];
  let depth = 0, start = 0;
  for (let i = 0; i < selector.length; i++) {
    if (selector[i] === "(" || selector[i] === "[") depth++;
    if (selector[i] === ")" || selector[i] === "]") depth--;
    if (depth === 0 && selector[i] === ",") { targets.push(selector.slice(start, i)); start = i + 1; }
    else if (depth === 0 && /[>+~\s]/.test(selector[i])) start = i + 1;
  }
  targets.push(selector.slice(start));
  return targets.join(",");
}

export function isSiteSystemFile(file: string) {
  return /^(?:app|components|styles)\//.test(file) && !/^(?:app\/(?:api|original-pages|qa|%5F%5Fqa|menu|m|pickup|table)(?:\/|$)|components\/(?:menu-templates|public-menu)\/)/.test(file)
    && !/^(?:app\/templates\/\[templateKey\]\/preview\/|app\/templates\/cafe_design_a\/widget-lab\/|app\/components\/home\/preview-ui\/)/.test(file);
}

export function collectSiteSystemFiles(root: string): FileMap {
  const files: FileMap = new Map();
  function walk(dir: string) {
    for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
      const file = `${dir}/${entry.name}`;
      if (!isSiteSystemFile(file)) continue;
      if (entry.isDirectory()) walk(file);
      else if (/\.(?:tsx|jsx|js|css)$/.test(file)) files.set(file, readFileSync(join(root, file), "utf8"));
    }
  }
  for (const dir of ["app", "components", "styles"]) if (existsSync(join(root, dir))) walk(dir);
  return files;
}

/** Pure source audit. Baseline matching is separate so fixtures and newly added files cannot inherit old exemptions. */
export function auditSiteSystem(files: FileMap): SiteSystemViolation[] {
  const violations: SiteSystemViolation[] = [];
  const selectors = new Map<string, Map<string, "page" | "header" | "control" | "composition">>();
  const trees = new Map<string, ts.SourceFile>();
  const imports = new Map<string, Map<string, { file: string; name: string }>>();
  const rendered = new Map<string, Set<string>>();
  const add = (file: string, rule: string, detail: string, evidence: string, line = 1) => {
    violations.push({ file, rule, detail, line, fingerprint: createHash("sha256").update(evidence.replace(/\s+/g, " ").trim()).digest("hex").slice(0, 16) });
  };
  const resolveImport = (file: string, spec: string) => {
    if (!spec.startsWith(".") && !spec.startsWith("@/")) return "";
    const base = spec.startsWith("@/") ? spec.slice(2) : relative("/", resolve("/", dirname(file), spec));
    return [base, `${base}.tsx`, `${base}.jsx`, `${base}.js`, `${base}/index.tsx`, `${base}/index.jsx`, `${base}/index.js`].find(candidate => files.has(candidate)) ?? "";
  };
  for (const [file, source] of files) {
    if (!/\.(?:[jt]sx|js)$/.test(file)) continue;
    const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    trees.set(file, tree);
    const bindings = new Map<string, { file: string; name: string }>();
    for (const node of tree.statements) {
      if (!ts.isImportDeclaration(node) || !ts.isStringLiteral(node.moduleSpecifier)) continue;
      const target = resolveImport(file, node.moduleSpecifier.text);
      const clause = node.importClause;
      if (clause?.name) bindings.set(clause.name.text, { file: target, name: target ? basename(target).replace(/\.[^.]+$/, "") : clause.name.text });
      if (clause?.namedBindings && ts.isNamedImports(clause.namedBindings)) for (const entry of clause.namedBindings.elements) {
        bindings.set(entry.name.text, { file: target, name: entry.propertyName?.text ?? entry.name.text });
      }
    }
    imports.set(file, bindings);
  }
  const strings = (node: ts.Node): string[] => {
    if (ts.isJsxAttribute(node)) return node.initializer ? strings(node.initializer) : [];
    if (ts.isJsxExpression(node)) return node.expression ? strings(node.expression) : [];
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return [node.text];
    if (ts.isTemplateExpression(node)) return [node.head.text, ...node.templateSpans.flatMap(span => [...strings(span.expression), span.literal.text])];
    if (ts.isConditionalExpression(node)) return [...strings(node.whenTrue), ...strings(node.whenFalse)];
    if (ts.isBinaryExpression(node)) return strings(node.right);
    if (ts.isCallExpression(node)) return node.arguments.flatMap(strings);
    if (ts.isArrayLiteralExpression(node)) return node.elements.flatMap(strings);
    if (ts.isParenthesizedExpression(node)) return strings(node.expression);
    if (ts.isObjectLiteralExpression(node)) return node.properties.flatMap(prop => prop.name && (ts.isStringLiteral(prop.name) || ts.isIdentifier(prop.name)) ? [prop.name.text] : []);
    return [];
  };
  function protectClasses(file: string, attr: ts.JsxAttribute, kind: "page" | "header" | "control" | "composition", bindings: Map<string, { file: string; name: string }>) {
    const globalClasses = strings(attr).flatMap(value => value.split(/\s+/)).filter(value => /^[a-zA-Z][\w-]*$/.test(value));
    for (const name of globalClasses) {
      const map = selectors.get("*") ?? new Map(); map.set(name, kind); selectors.set("*", map);
    }
    function visit(node: ts.Node) {
      if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression)) {
        const css = bindings.get(node.expression.text)?.file;
        if (css?.endsWith(".css")) { const map = selectors.get(css) ?? new Map(); map.set(node.name.text, kind); selectors.set(css, map); }
      }
      ts.forEachChild(node, visit);
    }
    visit(attr);
  }
  for (const [file, tree] of trees) {
    const bindings = imports.get(file)!;
    const tags = new Set<string>(); rendered.set(file, tags);
    function walk(node: ts.Node) {
      if (ts.isJsxFragment(node)) tags.add("#fragment");
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const raw = node.tagName.getText(tree);
        const name = bindings.get(raw)?.name ?? raw;
        tags.add(raw);
        const line = tree.getLineAndCharacterOfPosition(node.getStart(tree)).line + 1;
        if (raw === "h1" && !infrastructure.has(file)) add(file, "shared-heading", "Use SitePage/SitePageHeader instead of a private h1.", node.getText(tree), line);
        const attrs = node.attributes.properties.filter(ts.isJsxAttribute);
        const designPreview = file.startsWith("components/design-system/");
        if (name === "Tabs" && attrs.some(attr => attr.name.getText(tree) === "variant") && !designPreview && !file.startsWith("app/components/ui/")) add(file, "tab-purpose", "Choose a semantic tab purpose instead of a private visual variant.", node.getText(tree), line);
        if (attrs.some(attr => attr.name.getText(tree) === "role" && /^(?:tab|tablist)$/.test(strings(attr)[0] ?? "")) && !file.startsWith("app/components/ui/") && !designPreview) add(file, "tab-purpose", "Use Tabs/NavigationTabs instead of a private tab implementation.", node.getText(tree), line);
        const classes = attrs.find(attr => attr.name.getText(tree) === "className");
        if (["Button", "button", "a", "Link"].includes(name)) {
          const tokens = classes ? strings(classes).flatMap(value => value.split(/\s+/)).map(utilityValue) : [];
          const iconSize = attrs.find(attr => attr.name.getText(tree) === "size");
          const icon = tokens.includes("site-icon-control") || tokens.includes("site-button-icon") || (iconSize && strings(iconSize).includes("icon"));
          if (icon) {
            const paint = tokens.filter(value => /^(?:(?:p[trblxyse]?|size|[wh]|min-[wh]|max-[wh])-(?!0(?:$|\s))|rounded(?:-|$)|(?:bg|border|shadow|ring)(?:-|$))/.test(value));
            if (paint.length) add(file, "bare-icon-control", "Use shared icon appearance and size APIs; do not override icon-control geometry, paint or interaction states with private utilities.", classes!.getText(tree), line);
          }
        }
        if (!file.startsWith("app/components/ui/") && ["Button", "button", "a"].includes(name) && ts.isJsxOpeningElement(node)) {
          const tokens = new Set(classes ? strings(classes).flatMap(value => value.split(/\s+/)) : []);
          const variant = attrs.find(attr => attr.name.getText(tree) === "variant");
          const size = attrs.find(attr => attr.name.getText(tree) === "size");
          const ghost = tokens.has("site-button-ghost") || tokens.has("site-button-danger-ghost") || (variant && strings(variant).some(value => value === "ghost" || value === "danger-ghost"));
          const icon = tokens.has("site-button-icon") || tokens.has("site-icon-control") || (size && strings(size).includes("icon"));
          const visibleText = (child: ts.Node): boolean => {
            if (ts.isJsxText(child)) return Boolean(child.text.trim());
            if (ts.isJsxExpression(child)) return strings(child).some(value => value.trim());
            if (ts.isJsxElement(child)) return child.children.some(visibleText);
            return false;
          };
          if (ghost && !icon && ts.isJsxElement(node.parent) && node.parent.children.some(visibleText)) add(file, "action-affordance", "Standalone text actions need outline/secondary; ghost is for icon tools, not floating text buttons.", node.getText(tree), line);
        }
        if (classes && !file.startsWith("app/components/ui/")) {
          const unknownRoles = strings(classes).flatMap(value => value.split(/\s+/)).filter(value => /^type-/.test(value) && !typeRoles.has(value));
          if (unknownRoles.length) add(file, "type-role", `Use a registered typography role, not ${unknownRoles.join(" ")}.`, classes.getText(tree), line);
        }
        let panel: ts.Node | undefined = node;
        let composed = false;
        while (panel) {
          const opening = ts.isJsxElement(panel) ? panel.openingElement : ts.isJsxOpeningElement(panel) || ts.isJsxSelfClosingElement(panel) ? panel : undefined;
          if (opening) {
            const tag = opening.tagName.getText(tree);
            if ((bindings.get(tag)?.name ?? tag) === "ContentPanel") { composed = true; break; }
          }
          panel = panel.parent;
        }
        const semanticComposition = classes && strings(classes).some(value => /\bsite-(?:content-panel|stack-title|field-stack|form-row|action-row|content-divider|content-heading-row|notice-layout|detail-grid|detail-field|checkbox-grid|checkbox-field|field-grid|data-row|record-heading|record-actions)\b/.test(value));
        if (!file.startsWith("app/components/ui/") && (composed || semanticComposition)) {
          if (classes) {
            const overrides = strings(classes).flatMap(value => value.split(/\s+/)).filter(value => compositionUtility.test(utilityValue(value)) || /^\[(?:margin|padding|gap|font|line-height|letter-spacing):/.test(utilityValue(value)));
            if (overrides.length || name === "ContentPanel") add(file, "content-composition", "Use ContentPanel and semantic stacks for padding, gaps, alignment and typography; do not override them with className.", classes.getText(tree), line);
            protectClasses(file, classes, "composition", bindings);
          }
          for (const attr of attrs) if (attr.name.getText(tree) === "style" && (name === "ContentPanel" || /(?:margin|padding|gap|font|lineHeight|letterSpacing|border|background|boxShadow)/i.test(attr.getText(tree)))) add(file, "content-composition", "Content composition belongs to the shared layout contract, not inline overrides.", attr.getText(tree), line);
        }
        const control = sharedControls.has(name) || (classes && strings(classes).some(value => /\bsite-(?:button|field|chip|tabs?|area-tabs?|topic-tabs?|page-tabs)\b/.test(value)));
        if (control && !file.startsWith("app/components/ui/") && !file.startsWith("components/design-system/")) {
          for (const attr of attrs) {
            const prop = attr.name.getText(tree);
            if (prop === "className") {
              const tokens = strings(attr).flatMap(value => value.split(/\s+/)).filter(value => appearance.test(utilityValue(value)));
              if (tokens.length) add(file, "control-appearance", `Use the shared control API, not ${tokens.join(" ")}.`, attr.getText(tree), line);
              protectClasses(file, attr, "control", bindings);
            }
            if (prop === "style" && /(?:padding|font|color|background|border|height|opacity|shadow|lineHeight)/i.test(attr.getText(tree))) add(file, "control-appearance", "Do not override control appearance inline.", attr.getText(tree), line);
          }
        }
        if (headingNames.has(name) && !infrastructure.has(file)) {
          const description = attrs.find(attr => attr.name.getText(tree) === "description");
          const purpose = attrs.find(attr => attr.name.getText(tree) === "descriptionPurpose");
          if (description && !purpose) add(file, "copy-purpose", "Default to a title only. A necessary description must declare requested/state/essential/content purpose.", node.getText(tree), line);
          if (purpose && strings(purpose).some(value => !["requested", "state", "essential", "content"].includes(value))) add(file, "copy-purpose", "Choose a registered reason for keeping the page description.", purpose.getText(tree), line);
        }
        if (headingNames.has(name) || (raw === "h1" && file === "components/layout/SitePageHeader.tsx")) {
          let current: ts.Node | undefined = node;
          while (current) {
            const opening = ts.isJsxElement(current) ? current.openingElement : ts.isJsxOpeningElement(current) || ts.isJsxSelfClosingElement(current) ? current : undefined;
            if (opening) for (const attr of opening.attributes.properties.filter(ts.isJsxAttribute)) {
              const prop = attr.name.getText(tree);
              if (prop === "className") {
                const tokens = strings(attr).flatMap(value => value.split(/\s+/)).filter(value => verticalUtility.test(utilityValue(value)));
                if (tokens.length) add(file, "heading-spacing", "Page/heading ancestors must use shared layout spacing.", attr.getText(tree), line);
                protectClasses(file, attr, name === "SitePage" ? "page" : "header", bindings);
              }
              if (prop === "style" && /(?:margin|padding|gap|translate|transform|top|bottom)/i.test(attr.getText(tree))) add(file, "heading-spacing", "Do not offset the page title with inline styles.", attr.getText(tree), line);
            }
            current = current.parent;
          }
        }
      }
      ts.forEachChild(node, walk);
    }
    walk(tree);
  }
  const reachesShell = (file: string, seen = new Set<string>()): boolean => {
    if (file === "components/layout/SitePage.tsx") return true;
    if (seen.has(file)) return false;
    seen.add(file);
    return [...rendered.get(file) ?? []].some(tag => {
      const target = imports.get(file)?.get(tag)?.file;
      return target ? reachesShell(target, seen) : false;
    });
  };
  for (const file of trees.keys()) {
    if (/(?:^|\/)page\.(?:[jt]sx|js)$/.test(file) && (rendered.get(file)?.size ?? 0) > 0 && !reachesShell(file)) {
      add(file, "page-shell", "Standard routes must render SitePage (directly or through a composed component). Existing specialized routes are frozen in the legacy inventory.", "page-shell");
    }
  }
  for (const [file, source] of files) {
    if (!file.endsWith(".css") || owners.has(file)) continue;
    const sheet = postcss.parse(source, { from: file });
    sheet.walkDecls(decl => {
      if (/^--(?:ui-|type-|site-(?:type-|page-|tab-|area-tab-|section-space|grid-gap|gutter|space-|surface-inset|panel-inset))/.test(decl.prop)) add(file, "shared-token", `Shared tokens belong in the canonical styles, not ${decl.prop}.`, `${decl.parent?.toString().split("{")[0]}|${decl.toString()}`, decl.source?.start?.line);
      const selector = decl.parent?.type === "rule" ? decl.parent.selector : "";
      const target = selectorTargets(selector);
      const names = [...target.matchAll(/\.([\w-]+)/g)].map(match => match[1]);
      const kinds = names.flatMap(name => [selectors.get(file)?.get(name), selectors.get("*")?.get(name)]).filter(Boolean);
      if ((compositionSelector.test(target) || kinds.includes("composition")) && /^(?:margin.*|padding.*|gap|row-gap|column-gap|align-.*|justify-.*|border.*|background.*|box-shadow|font.*|line-height)$/.test(decl.prop)) add(file, "content-composition-css", "Do not override semantic content composition in page CSS.", `${selector}|${decl.toString()}`, decl.source?.start?.line);
      if (/\.site-indicator-icon\b/.test(target) && /^(?:(?:min-|max-)?(?:width|height)|padding.*|margin.*|display|flex.*)$/.test(decl.prop)) add(file, "control-css", "Indicator tile geometry belongs to the shared immediate-surface rule.", `${selector}|${decl.toString()}`, decl.source?.start?.line);
      if ((protectedSelector.test(target) || kinds.includes("control")) && appearanceProperty.test(decl.prop)) add(file, "control-css", `Do not restyle shared controls in page CSS: ${selector} / ${decl.prop}.`, `${selector}|${decl.toString()}`, decl.source?.start?.line);
      if ((kinds.includes("page") || kinds.includes("header") || /\.site-page-(?:intro|spacing)/.test(target)) && verticalProperty.test(decl.prop)) {
        const value = decl.value.trim();
        const safe = /^(?:0(?:px|rem|em|%)?|auto)(?:\s+(?:0(?:px|rem|em|%)?|auto))*$/.test(value) || (!kinds.includes("page") && /^var\(--site-(?:page-|section-)/.test(value));
        if (!safe) add(file, "heading-css", `Page title spacing must come from the shared shell/tokens: ${selector} / ${decl.prop}.`, `${selector}|${decl.toString()}`, decl.source?.start?.line);
      }
    });
  }
  return violations;
}

export function newSiteSystemViolations(violations: SiteSystemViolation[], baseline: SiteSystemBaseline) {
  const counts = new Map<string, number>();
  return violations.filter(item => {
    const key = `${item.file}:${item.rule}:${item.fingerprint}`;
    const occurrence = (counts.get(key) ?? 0) + 1; counts.set(key, occurrence);
    return occurrence > (baseline[item.file]?.[item.rule]?.filter(value => value === item.fingerprint).length ?? 0);
  });
}

/** Migrated/deleted legacy fragments must lose their allowance, so they cannot quietly return later. */
export function staleSiteSystemAllowances(violations: SiteSystemViolation[], baseline: SiteSystemBaseline) {
  const remaining = new Map<string, number>();
  for (const item of violations) {
    const key = `${item.file}:${item.rule}:${item.fingerprint}`;
    remaining.set(key, (remaining.get(key) ?? 0) + 1);
  }
  const stale: string[] = [];
  for (const [file, rules] of Object.entries(baseline)) for (const [rule, fingerprints] of Object.entries(rules)) for (const fingerprint of fingerprints) {
    const key = `${file}:${rule}:${fingerprint}`;
    const count = remaining.get(key) ?? 0;
    if (count) remaining.set(key, count - 1);
    else stale.push(key);
  }
  return stale;
}
