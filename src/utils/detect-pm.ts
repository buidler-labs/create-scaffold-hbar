import type { PackageManager } from "../types";

/**
 * Always returns "yarn" — Yarn is the only supported package manager.
 * Kept for backward compatibility with any call sites.
 */
export function detectPackageManager(): PackageManager {
  return "yarn";
}
