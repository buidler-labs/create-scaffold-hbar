import { execa } from "execa";
import chalk from "chalk";
import type { PackageManager } from "../types";

// TODO: Instead of using execa, use prettier package from cli to format targetDir
export async function prettierFormat(targetDir: string, packageManager: PackageManager): Promise<void> {
  const command = packageManager === "npm" ? "npm" : "yarn";
  const args = packageManager === "npm" ? ["run", "format"] : ["format"];

  try {
    const result = await execa(command, args, { cwd: targetDir });
    if (result.failed) {
      throw new Error("Format command exited with non-zero status");
    }
  } catch (error) {
    // Format can fail when workspace layout doesn't match (e.g. solidity "none" + base only
    // has no @sh/nextjs). Log and continue so the scaffold still completes.
    console.warn(
      chalk.yellow("\n⚠ Format step failed (project was still created):"),
      error instanceof Error ? error.message : String(error),
    );
  }
}
