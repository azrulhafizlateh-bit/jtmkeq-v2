// Matches the exact alias strings only; `import "server-only"` in the server modules is the real backstop.
const FORBIDDEN = ["@/lib/env.server", "@/lib/supabase/admin", "@/lib/auth/rate-limit"];

/** Forbids server-only modules in any file whose top-level directives include "use client". */
const rule = {
  meta: {
    type: "problem",
    schema: [],
    messages: {
      forbidden: '"{{source}}" is server-only and must not be imported from a "use client" file.',
    },
  },
  create(context) {
    let isClient = false;
    const check = (node) => {
      const source = node.source?.value;
      if (isClient && typeof source === "string" && FORBIDDEN.includes(source)) {
        context.report({ node, messageId: "forbidden", data: { source } });
      }
    };
    return {
      Program(program) {
        isClient = program.body.some(
          (n) => n.type === "ExpressionStatement" && n.directive === "use client",
        );
      },
      ImportDeclaration: check,
      ExportNamedDeclaration: check,
      ExportAllDeclaration: check,
    };
  },
};

const plugin = { rules: { "no-server-imports-in-client": rule } };

export default plugin;
