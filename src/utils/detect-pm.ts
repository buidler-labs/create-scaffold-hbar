import fs from "fs";
import path from "path";
import type { PackageManager } from "../types";

/**
 * Detects the preferred package manager by looking for lockfiles
 * in the current working directory.
 * Checks in order: yarn.lock → package-lock.json → pnpm-lock.yaml
 * Defaults to "yarn" if no lockfile is found.
 */
export function detectPackageManager(): PackageManager {
  const cwd = process.cwd();

  // Check for yarn.lock
  if (fs.existsSync(path.join(cwd, "yarn.lock"))) {
    return "yarn";
  }

  // Check for package-lock.json (npm)
  if (fs.existsSync(path.join(cwd, "package-lock.json"))) {
    return "npm";
  }

  // Default to yarn if no lockfile detected
  return "yarn";
}

/**
 * Validates if a string is a supported package manager.
 */
export function isValidPackageManager(pm: string): pm is PackageManager {
  return pm === "yarn" || pm === "npm" || pm === "none";
}
