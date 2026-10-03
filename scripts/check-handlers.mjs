// Checks that every operationId in openapi.yaml has an MSW handler (api:check).
import { readFileSync } from "node:fs";

const spec = readFileSync(new URL("../openapi/openapi.yaml", import.meta.url), "utf8");
const handlers = readFileSync(new URL("../src/mocks/handlers.ts", import.meta.url), "utf8");
const ids = [...spec.matchAll(/operationId:\s*(\w+)/g)].map((m) => m[1]);
const missing = ids.filter((id) => !new RegExp(`"${id}"`).test(handlers));
console.log(`${ids.length} operations in openapi.yaml, ${ids.length - missing.length} with handlers`);
if (missing.length) {
  console.error("Missing handlers:", missing.join(", "));
  process.exit(1);
}
