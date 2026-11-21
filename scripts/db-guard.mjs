// Blocks DB commands unless a non-production dev project is linked.
// Run with `node --env-file-if-exists=.env.local` so SUPABASE_PROD_REF loads.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { checkGuard } from "./db-guard-lib.mjs";

const refFile = join(process.cwd(), "supabase", ".temp", "project-ref");
const linkedRef = existsSync(refFile) ? readFileSync(refFile, "utf8") : "";

const result = checkGuard({
  linkedRef,
  prodRef: process.env.SUPABASE_PROD_REF,
});

if (!result.ok) {
  console.error(result.message);
  process.exit(1);
}
console.log(result.message);
