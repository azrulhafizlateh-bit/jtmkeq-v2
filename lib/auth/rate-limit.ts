import "server-only";
import { sha256Hex } from "@/lib/crypto/hash";
import { createAdminSupabase } from "@/lib/supabase/admin";

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Opaque per email+IP key. Never log or store the email or IP themselves. */
export async function rateLimitKey(email: string, ip: string): Promise<string> {
  return sha256Hex(`${normaliseEmail(email)}|${ip}`);
}

/** Fails closed: any RPC error means "not allowed". */
export async function isLoginAllowed(key: string): Promise<boolean> {
  const { data, error } = await createAdminSupabase().rpc("check_login_allowed", {
    p_key_hash: key,
  });
  if (error) {
    console.warn("login rate limit check failed; denying", { code: error.code });
    return false;
  }
  return data === true;
}

export async function recordLoginAttempt(key: string, success: boolean): Promise<void> {
  const { error } = await createAdminSupabase().rpc("record_login_attempt", {
    p_key_hash: key,
    p_success: success,
  });
  if (error) {
    console.warn("login attempt could not be recorded", { code: error.code });
  }
}
