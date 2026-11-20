/** Short commit SHA on Vercel deployments, "dev" everywhere else. */
export function appVersion(): string {
  return process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "dev";
}
