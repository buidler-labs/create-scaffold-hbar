import { execa } from "execa";
import { Options } from "../types";
import path from "path";
import fs from "fs";
import { SOLIDITY_FRAMEWORKS } from "../utils/consts";
import packageJson from "../../package.json";

const defaultFoundryLibraries = [
  "foundry-rs/forge-std",
  "OpenZeppelin/openzeppelin-contracts",
  "gnsps/solidity-bytes-utils",
  "hashgraph/hedera-forking",
];
const foundryLibRepoMap: Record<string, string> = {
  "forge-std": "foundry-rs/forge-std",
  "openzeppelin-contracts": "OpenZeppelin/openzeppelin-contracts",
  "solidity-bytes-utils": "gnsps/solidity-bytes-utils",
  "hedera-forking": "hashgraph/hedera-forking",
};
const createHbarVersion = packageJson.version;

async function resolveFoundryLibraries(foundryWorkSpacePath: string): Promise<string[]> {
  const remappingsPath = path.join(foundryWorkSpacePath, "remappings.txt");
  if (!fs.existsSync(remappingsPath)) return defaultFoundryLibraries;

  const remappings = await fs.promises.readFile(remappingsPath, "utf8");
  const parsedLibraries = new Set<string>();

  for (const line of remappings.split("\n")) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith("#")) continue;

    // remappings lines usually look like "forge-std/=lib/forge-std/src/".
    const match = trimmedLine.match(/(?:^|=)\s*lib\/([^/]+)\//);
    if (!match) continue;

    const repository = foundryLibRepoMap[match[1]];
    if (repository) parsedLibraries.add(repository);
  }

  return parsedLibraries.size > 0 ? [...parsedLibraries] : defaultFoundryLibraries;
}

/**
 * Stages all files, creates the initial commit (message: create-hbar branding),
 * and when Foundry is selected runs forge install and amends the commit with lib submodules.
 *
 * We use --no-gpg-sign so that users with commit signing (e.g. SSH key with passphrase)
 * are not prompted in this non-interactive context; the initial commit stays unsigned.
 */
export async function createFirstGitCommit(targetDir: string, options: Options) {
  try {
    await execa("git", ["add", "-A"], { cwd: targetDir });
    await execa(
      "git",
      ["commit", "-m", `Initial commit with create-hbar @ ${createHbarVersion}`, "--no-verify", "--no-gpg-sign"],
      { cwd: targetDir },
    );

    if (options.solidityFramework === SOLIDITY_FRAMEWORKS.FOUNDRY) {
      const foundryWorkSpacePath = path.resolve(targetDir, "packages", SOLIDITY_FRAMEWORKS.FOUNDRY);
      const libDir = path.join(foundryWorkSpacePath, "lib");
      const foundryLibraries = await resolveFoundryLibraries(foundryWorkSpacePath);

      // Remove any pre-existing lib directories copied from the template so that
      // `forge install` (which adds git submodules) doesn't fail with
      // "already exists and is not a valid git repo".
      if (fs.existsSync(libDir)) {
        await fs.promises.rm(libDir, { recursive: true, force: true });
        // Stage the removal so the initial commit doesn't reference the old files
        await execa("git", ["add", "-A"], { cwd: targetDir });
        await execa("git", ["commit", "--amend", "--no-edit", "--no-verify", "--no-gpg-sign"], { cwd: targetDir });
      }

      // forge install foundry libraries as git submodules
      await execa("forge", ["install", ...foundryLibraries], { cwd: foundryWorkSpacePath });
      await execa("git", ["add", "-A"], { cwd: targetDir });
      await execa("git", ["commit", "--amend", "--no-edit", "--no-gpg-sign"], { cwd: targetDir });
    }
  } catch (e: any) {
    // cast error as ExecaError to get stderr
    throw new Error("Failed to initialize git repository", {
      cause: e?.stderr ?? e,
    });
  }
}
