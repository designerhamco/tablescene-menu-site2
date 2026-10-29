import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import ts from "typescript";
import postcss from "postcss";

type FileMap = Map<string, string>;
export type SiteSystemViolation = { file: string; rule: string; line: number; detail: string; fingerprint: string };
export type SiteSystemBaseline = Record<string, Record<string, string[]>>;
const owners = new Set(["app/globals.css", "styles/ui-system.css", "styles/site-design.css", "styles/typography.css", "styles/theme.css"]);
const infrastructure = new Set(["components/layout/SitePage.tsx", "components/layout/SitePageHeader.tsx"]);
const sharedControls = new Set(["Tabs", "TabsList", "TabsTrigger", "NavigationTabs", "Button", "Input", "Textarea", "SelectTrigger", "CategoryFilter"]);
const headingNames = new Set(["SitePage", "SitePageHeader"]);
const appearance = /^(?:p[trblxyse]?|h|min-h|max-h|rounded(?:-[a-z]+)?|font|text|bg|border(?:-[trblxyse])?|leading|shadow|opacity)-|^\[(?:padding|font|color|background|border|height|opacity|box-shadow|line-height):/;
const verticalUtility = /^(?:!?-?(?:p[ytb]|m[ytb]|p|m|space-y|gap-y|translate-y|top|bottom)-|!?gap-|\[(?:margin|padding|gap|top|bottom|translate|transform)[^:]*:)/;
const verticalProperty = /^(?:margin(?:-(?:top|bottom|block(?:-start|-end)?))?|padding(?:-(?:top|bottom|block(?:-start|-end)?))?|row-gap|gap|top|bottom|translate|transform)$/;
const appearanceProperty = /^(?:padding(?:-.+)?|font(?:-.+)?|line-height|color|background(?:-.+)?|border(?:-.+)?|(?:min-|max-)?height|box-shadow|opacity)$/;
const protectedSelector = /(?:\.site-(?:area-tab(?:s|s-root)?|page-tabs|topic-tab(?:s)?|tab(?:s)?|button|field|chip)\b|\[data-slot=["']?tabs(?:-list|-trigger)?["']?\])/;

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
  const selectors = new Map<string, Map<string, "page" | "header" | "control">>();
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
  function protectClasses(file: string, attr: ts.JsxAttribute, kind: "page" | "header" | "control", bindings: Map<string, { file: string; name: string }>) {
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
      if (/^--(?:ui-|type-|site-(?:type-|page-|tab-|area-tab-|section-space|grid-gap|gutter))/.test(decl.prop)) add(file, "shared-token", `Shared tokens belong in the canonical styles, not ${decl.prop}.`, `${decl.parent?.toString().split("{")[0]}|${decl.toString()}`, decl.source?.start?.line);
      const selector = decl.parent?.type === "rule" ? decl.parent.selector : "";
      const target = selectorTargets(selector);
      const names = [...target.matchAll(/\.([\w-]+)/g)].map(match => match[1]);
      const kinds = names.flatMap(name => [selectors.get(file)?.get(name), selectors.get("*")?.get(name)]).filter(Boolean);
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
