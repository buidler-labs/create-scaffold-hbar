import type { PackageManager } from "../types";
import * as fs from "fs";

/**
 * Detects the package manager from the npm_config_user_agent env var (set
 * automatically when using `npm/pnpm/yarn/bun create`) or from lockfiles in cwd.
 * Falls back to "npm".
 */
export function detectPackageManager(): PackageManager {
  const agent = process.env.npm_config_user_agent ?? "";
  if (agent.startsWith("pnpm")) return "pnpm";
  if (agent.startsWith("yarn")) return "yarn";
  if (agent.startsWith("bun")) return "bun";
  if (agent.startsWith("npm")) return "npm";

  if (fs.existsSync("pnpm-lock.yaml")) return "pnpm";
  if (fs.existsSync("yarn.lock")) return "yarn";
  if (fs.existsSync("bun.lockb")) return "bun";

  return "npm";
}
