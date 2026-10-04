// Merges the product contract (openapi/openapi.yaml, synced from the PRD build pack and never trimmed)
// with the demo-only overlay (openapi/demo-overlay.yaml) into openapi/openapi.merged.yaml for type generation.
import { readFileSync, writeFileSync } from "node:fs";
import yaml from "js-yaml";

const dir = new URL("../openapi/", import.meta.url);
const product = yaml.load(readFileSync(new URL("openapi.yaml", dir), "utf8"));
const overlay = yaml.load(readFileSync(new URL("demo-overlay.yaml", dir), "utf8"));
for (const [path, ops] of Object.entries(overlay.paths)) {
  if (product.paths[path]) throw new Error(`overlay path collides with product contract: ${path}`);
  product.paths[path] = ops;
}
for (const [name, schema] of Object.entries(overlay.components.schemas)) {
  if (product.components.schemas[name]) throw new Error(`overlay schema collides with product contract: ${name}`);
  product.components.schemas[name] = schema;
}
writeFileSync(new URL("openapi.merged.yaml", dir), yaml.dump(product, { lineWidth: 200, noRefs: true }));
console.log(`merged: product v${product.info.version} + ${Object.keys(overlay.paths).length} demo-only paths`);
