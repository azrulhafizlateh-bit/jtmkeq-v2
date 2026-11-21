const DEFAULT_NEXT = "/dashboard";

function hasControlChars(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

function isSafeRelative(value: string): boolean {
  return (
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\") &&
    !hasControlChars(value)
  );
}

/**
 * Returns `next` only if it is a same-origin relative path; otherwise `/dashboard`.
 * Also checks the percent-decoded form so `/%2F%2Fevil.com` cannot slip through.
 */
export function safeNext(next: string | null | undefined): string {
  if (typeof next !== "string" || !isSafeRelative(next)) return DEFAULT_NEXT;

  let decoded = next;
  for (let i = 0; i < 3; i += 1) {
    let step: string;
    try {
      step = decodeURIComponent(decoded);
    } catch {
      return DEFAULT_NEXT;
    }
    if (step === decoded) break;
    if (!isSafeRelative(step)) return DEFAULT_NEXT;
    decoded = step;
  }
  return next;
}
