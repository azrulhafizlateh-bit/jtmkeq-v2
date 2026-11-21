/**
 * Pure guard decision. Fails closed: refuses unless a project is linked, the
 * production ref is configured, and the two differ.
 */
export function checkGuard({ linkedRef, prodRef }) {
  const linked = (linkedRef ?? "").trim();
  const prod = (prodRef ?? "").trim();

  if (linked === "") {
    return {
      ok: false,
      message: "Refusing: no linked project. Run `pnpm db:link` to link a dev project first.",
    };
  }
  if (prod === "") {
    return {
      ok: false,
      message: "Set SUPABASE_PROD_REF in .env.local so the prod guard can run.",
    };
  }
  if (linked === prod) {
    return { ok: false, message: "Refusing: linked project is PROD" };
  }
  return {
    ok: true,
    message: `db-guard: linked project ${linked} is not PROD, continuing.`,
  };
}
