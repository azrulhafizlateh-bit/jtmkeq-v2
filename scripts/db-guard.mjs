// Blocks destructive DB commands unless a non-production dev project is linked.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const refFile = join(process.cwd(), "supabase", ".temp", "project-ref");

if (!existsSync(refFile)) {
  console.error("Refusing: no linked project. Run `pnpm db:link` to link a dev project first.");
  process.exit(1);
}

const linkedRef = readFileSync(refFile, "utf8").trim();
const prodRef = (process.env.SUPABASE_PROD_REF ?? "").trim();

if (prodRef !== "" && linkedRef === prodRef) {
  console.error("Refusing: linked project is PROD");
  process.exit(1);
}

console.log(`db-guard: linked project ${linkedRef} is not PROD, continuing.`);
