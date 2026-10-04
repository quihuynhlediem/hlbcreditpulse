// Demo rule (Step 19): every operation the demo calls has an MSW handler. The product contract is not trimmed,
// so operations the demo never calls (e.g. most staff-console APIs outside demo scope) need no handler.
import { readFileSync } from "node:fs";
import yaml from "js-yaml";

const spec = yaml.load(readFileSync(new URL("../openapi/openapi.merged.yaml", import.meta.url), "utf8"));
const handlers = readFileSync(new URL("../src/mocks/handlers.ts", import.meta.url), "utf8");
const hooks = readFileSync(new URL("../src/api/hooks.ts", import.meta.url), "utf8");
const called = new Set([...hooks.matchAll(/client\.(GET|POST|PUT|DELETE|PATCH)\("([^"]+)"/g)].map((m) => `${m[1].toLowerCase()} ${m[2]}`));
const opId = (k) => { const [m, p] = k.split(" "); return spec.paths[p]?.[m]?.operationId; };
const unknown = [...called].filter((k) => !opId(k));
const missing = [...called].filter((k) => opId(k) && !handlers.includes(`"${opId(k)}"`)).map(opId);
const total = Object.values(spec.paths).reduce((n, ops) => n + Object.keys(ops).length, 0);
console.log(`${total} operations in the merged contract; demo calls ${called.size}; ${called.size - missing.length - unknown.length} have handlers`);
if (unknown.length) { console.error("Called but not in the contract:", unknown.join(", ")); process.exit(1); }
if (missing.length) { console.error("Missing handlers:", missing.join(", ")); process.exit(1); }
