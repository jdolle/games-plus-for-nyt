// Fails when any installed package (all are development-only; the extension bundles no third-party
// code) carries a licence outside the permissive allow-list below, so a copyleft dependency cannot
// slip in unnoticed. Run with `pnpm licenses:check` (part of `pnpm check`).
import { execFileSync } from "node:child_process";

const ALLOWED = new Set([
  "MIT", "MIT-0", "ISC", "0BSD", "BSD-2-Clause", "BSD-3-Clause", "Apache-2.0", "BlueOak-1.0.0",
  "CC0-1.0", "Unlicense", "Python-2.0", "MPL-2.0", // MPL-2.0: file-level copyleft on a dev tool we never distribute (lightningcss)
]);

const raw = execFileSync("pnpm", ["licenses", "list", "--json"], { encoding: "utf8" });
const byLicense = JSON.parse(raw);
const offenders = [];
let total = 0;
for (const [license, packages] of Object.entries(byLicense)) {
  total += packages.length;
  const ok = license
    .replace(/[()]/g, "")
    .split(/\s+(?:OR|AND)\s+/i)
    .every((part) => ALLOWED.has(part.trim()));
  if (!ok) for (const pkg of packages) offenders.push(`${pkg.name}@${pkg.version ?? "?"} (${license}${pkg.dev === false ? ", production" : ""})`);
  for (const pkg of packages) if (pkg.dev === false) offenders.push(`${pkg.name}@${pkg.version ?? "?"}: production dependency — the extension must ship only its own code`);
}
if (offenders.length) {
  console.error("[nyte] licence check failed:\n  " + offenders.join("\n  "));
  process.exit(1);
}
console.log(`[nyte] licence check passed: ${total} development packages, all permissive; no production dependencies`);
