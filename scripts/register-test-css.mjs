import { register } from "node:module";

// Node's component-rendering tests need class names, not a browser CSS engine.
register("./test-css-module-loader.mjs", import.meta.url);
