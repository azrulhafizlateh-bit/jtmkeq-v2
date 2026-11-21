import { z } from "zod";

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  // Accepts both the legacy anon JWT and the newer sb_publishable_ key.
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

export type PublicEnv = z.infer<typeof publicSchema>;

/**
 * Formats a Zod error as "KEY: reason" lines. Only key names and the schema's
 * own messages are used, never the supplied values, so secrets cannot leak.
 */
export function formatEnvError(error: z.ZodError): string {
  const lines = error.issues.map(
    (issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`,
  );
  return `Invalid environment variables:\n${lines.join("\n")}`;
}

/**
 * Parsed lazily (on call) so builds and routes that need no Supabase env keep
 * working. NEXT_PUBLIC_* are referenced literally so Next inlines them into the
 * client bundle.
 */
export function publicEnv(): PublicEnv {
  const result = publicSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  if (!result.success) {
    throw new Error(formatEnvError(result.error));
  }
  return result.data;
}
