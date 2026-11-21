import "server-only";
import { z } from "zod";
import { formatEnvError, publicEnv, type PublicEnv } from "@/lib/env";

const serverSchema = z.object({
  // Accepts both the legacy service_role JWT and the newer sb_secret_ key.
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).regex(/^\S+$/, "must not contain whitespace"),
  DEMO_MODE: z
    .string()
    .optional()
    .transform((value) => value === "true"),
  FIELD_ENCRYPTION_KEY: z.string().min(1).optional(),
  UPLOAD_LINK_SECRET: z.string().min(1).optional(),
  CLEARANCE_SIGNING_SECRET: z.string().min(1).optional(),
});

export type ServerEnv = PublicEnv & z.infer<typeof serverSchema>;

/** Parsed lazily on call; throws naming the offending keys, never values. */
export function serverEnv(): ServerEnv {
  const result = serverSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    DEMO_MODE: process.env.DEMO_MODE,
    FIELD_ENCRYPTION_KEY: emptyToUndefined(process.env.FIELD_ENCRYPTION_KEY),
    UPLOAD_LINK_SECRET: emptyToUndefined(process.env.UPLOAD_LINK_SECRET),
    CLEARANCE_SIGNING_SECRET: emptyToUndefined(process.env.CLEARANCE_SIGNING_SECRET),
  });
  if (!result.success) {
    throw new Error(formatEnvError(result.error));
  }
  return { ...publicEnv(), ...result.data };
}

function emptyToUndefined(value: string | undefined): string | undefined {
  return value === "" ? undefined : value;
}
