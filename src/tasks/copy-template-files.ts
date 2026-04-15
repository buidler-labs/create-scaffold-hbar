import { execa } from "execa";
import { downloadTemplate } from "giget";
import { Options, TemplateManifestSchema, PackageManager } from "../types";
import type { SolidityFramework } from "../types";
import fs from "fs";
import os from "os";
import fse from "fs-extra";
import path from "path";
import { getTemplateSpec } from "../utils/fetch-available-templates";
import { SOLIDITY_FRAMEWORKS } from "../utils/consts";
import { applyRenameMap } from "./apply-rename-map";
import { generateEnvExample } from "./generate-env-example";

const TEMPLATE_MANIFEST_FILENAME = "template.json";
const NEXTJS_PACKAGE = "nextjs";

/**
 * Creates a .npmrc file in the target directory for npm to prevent hoisting of packages.
 * @param targetDir - The target directory to create the .npmrc file in.
 * @param packageManager - The package manager to create the .npmrc file for.
 */
function createNpmrcForNpm(targetDir: string, packageManager: PackageManager): void {
  if (packageManager !== "npm") return;

  const npmrcPath = path.join(targetDir, ".npmrc");
  const content = "workspaces-hoist=false\n";
  fs.writeFileSync(npmrcPath, content, "utf8");
}

/**
 * Transforms yarn-specific script commands to npm equivalents.
 * Handles:
 * - `yarn workspace @sh/<pkg> <script>` → `npm run <script> -w @sh/<pkg>`
 * - `yarn <script>` → `npm run <script>` (for npm package manager)
 */
function transformScriptForPackageManager(script: string, packageManager: PackageManager): string {
  if (packageManager === "yarn") {
    return script;
  }

  let transformed = script;

  // Transform `yarn workspace @sh/<pkg> <script>` → `npm run <script> -w @sh/<pkg>`
  transformed = transformed.replace(/yarn\s+workspace\s+(@sh\/\w+)\s+(\S+)/g, "npm run $2 -w $1");

  // Transform standalone `yarn <script>` (where <script> doesn't contain spaces or special chars)
  // This matches patterns like `yarn format`, `yarn compile`, but not `yarn workspace ...`
  // We need to be careful not to double-transform already transformed scripts
  transformed = transformed.replace(/\byarn\s+([a-zA-Z0-9:_-]+)\b(?!\s*-w)/g, "npm run $1");

  return transformed;
}

/**
 * If template.json exists in project root, parse it, run rename and env
 * generation, then remove the manifest file.
 *
 * @returns Custom outro steps from `outro.steps` when present; otherwise undefined.
 */
function processTemplateManifest(projectDir: string, projectName: string): string[] | undefined {
  const manifestPath = path.join(projectDir, TEMPLATE_MANIFEST_FILENAME);
  if (!fs.existsSync(manifestPath)) return undefined;

  const raw = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const manifest = TemplateManifestSchema.parse(raw);
  const createScaffoldHbar = manifest["create-scaffold-hbar"];

  const outroSteps = createScaffoldHbar?.outro?.steps;

  if (createScaffoldHbar?.rename) {
    applyRenameMap(projectDir, createScaffoldHbar.rename, projectName);
  }
  if (createScaffoldHbar?.envVars?.length) {
    generateEnvExample(projectDir, createScaffoldHbar.envVars);
  }

  fs.unlinkSync(manifestPath);
  return outroSteps?.length ? [...outroSteps] : undefined;
}

/**
 * Removes packages/ for frameworks the user did not select so only the chosen
 * solidity framework (and nextjs if frontend is not "none") remain.
 */
function removeUnselectedFrameworkPackages(targetDir: string, solidityFramework: SolidityFramework | null): void {
  const packagesDir = path.join(targetDir, "packages");
  if (!fs.existsSync(packagesDir)) return;

  const toRemove: string[] = [];
  if (solidityFramework === SOLIDITY_FRAMEWORKS.FOUNDRY) {
    toRemove.push(SOLIDITY_FRAMEWORKS.HARDHAT);
  } else if (solidityFramework === SOLIDITY_FRAMEWORKS.HARDHAT) {
    toRemove.push(SOLIDITY_FRAMEWORKS.FOUNDRY);
  } else {
    toRemove.push(SOLIDITY_FRAMEWORKS.HARDHAT, SOLIDITY_FRAMEWORKS.FOUNDRY);
  }

  for (const name of toRemove) {
    const pkgPath = path.join(packagesDir, name);
    if (fs.existsSync(pkgPath)) {
      fs.rmSync(pkgPath, { recursive: true });
    }
  }
}

/** Removes packages/nextjs when frontend is "none" (contracts-only scaffold). */
function removeNextjsPackage(targetDir: string): void {
  const nextjsPath = path.join(targetDir, "packages", NEXTJS_PACKAGE);
  if (fs.existsSync(nextjsPath)) {
    fs.rmSync(nextjsPath, { recursive: true });
  }
}

/** Yarn-specific files/directories to remove when using npm */
const YARN_SPECIFIC_PATHS = [
  ".yarnrc.yml",
  ".yarn",
  "yarn.lock",
  ".husky", // Husky hooks often contain yarn-specific commands
];

/**
 * Removes Yarn-specific configuration files when using npm.
 * This prevents conflicts between Yarn 3 configuration and npm.
 */
function removeYarnSpecificFiles(targetDir: string, packageManager: PackageManager): void {
  if (packageManager !== "npm") {
    return;
  }

  for (const relativePath of YARN_SPECIFIC_PATHS) {
    const fullPath = path.join(targetDir, relativePath);
    if (fs.existsSync(fullPath)) {
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          fs.rmSync(fullPath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(fullPath);
        }
      } catch (err) {
        // Log but don't fail - these files are optional cleanup
        console.warn(`Warning: Could not remove ${relativePath}:`, err);
      }
    }
  }
}

/** Script keys that reference the Next.js package; removed when frontend is "none". */
const NEXTJS_SCRIPT_KEYS = [
  "start",
  "next:build",
  "next:check-types",
  "next:format",
  "next:lint",
  "next:serve",
  "vercel",
  "vercel:yolo",
  "vercel:login",
  "ipfs",
];

/**
 * Updates root package.json so workspaces and scripts only reference the
 * selected solidity framework and, when frontend is not "none", the nextjs package.
 * Also transforms scripts for the selected package manager.
 */
function filterRootPackageJson(
  targetDir: string,
  selectedFramework: SolidityFramework | null | undefined,
  frontend: Options["frontend"],
  packageManager: PackageManager,
): void {
  const pkgPath = path.join(targetDir, "package.json");
  if (!fs.existsSync(pkgPath)) return;

  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as Record<string, unknown>;

  const unselected = [SOLIDITY_FRAMEWORKS.FOUNDRY, SOLIDITY_FRAMEWORKS.HARDHAT].filter(sf => sf !== selectedFramework);

  if (pkg.workspaces) {
    const ws = pkg.workspaces as string[] | { packages?: string[] };
    const wsList: string[] = Array.isArray(ws)
      ? ws
      : Array.isArray((ws as { packages?: string[] }).packages)
        ? (ws as { packages: string[] }).packages
        : [];
    let filtered = wsList.filter(w => !unselected.some(sf => w.includes(sf)));
    if (frontend === "none") {
      filtered = filtered.filter(w => !w.includes(NEXTJS_PACKAGE));
    }
    if (Array.isArray(pkg.workspaces)) {
      pkg.workspaces = filtered;
    } else if (typeof pkg.workspaces === "object" && pkg.workspaces !== null && "packages" in pkg.workspaces) {
      (pkg.workspaces as { packages: string[] }).packages = filtered;
    }
  }

  if (pkg.scripts && typeof pkg.scripts === "object") {
    const scripts = pkg.scripts as Record<string, string>;

    if (frontend === "none") {
      for (const key of NEXTJS_SCRIPT_KEYS) {
        delete scripts[key];
      }
      if (selectedFramework === SOLIDITY_FRAMEWORKS.HARDHAT) {
        scripts["format"] = "yarn hardhat:format";
        scripts["lint"] = "yarn hardhat:lint";
      } else if (selectedFramework === SOLIDITY_FRAMEWORKS.FOUNDRY) {
        scripts["format"] = "yarn workspace @sh/foundry format";
        scripts["lint"] = "yarn workspace @sh/foundry lint";
      } else {
        delete scripts["format"];
        delete scripts["lint"];
      }
    }

    for (const key of Object.keys(scripts)) {
      if (unselected.some(sf => key === sf || key.startsWith(`${sf}:`))) {
        delete scripts[key];
      }
    }
    for (const key of Object.keys(scripts)) {
      if (typeof scripts[key] !== "string") continue;

      // If a framework is selected, remap top-level "yarn hardhat:*"/"yarn foundry:*"
      // commands to the selected one.
      if (selectedFramework) {
        for (const sf of unselected) {
          const prefix = `yarn ${sf}:`;
          if (scripts[key].startsWith(prefix)) {
            const sub = scripts[key].slice(prefix.length);
            scripts[key] = `yarn ${selectedFramework}:${sub}`;
          }
        }
      }

      // Always strip command segments for unselected frameworks. This must also
      // run when selectedFramework is null (e.g. templates that default to "none").
      for (const sf of unselected) {
        scripts[key] = scripts[key]
          .replace(new RegExp(`\\s*&&\\s*yarn ${sf}:[^\\s&]+`, "g"), "")
          .replace(new RegExp(`yarn ${sf}:[^\\s&]+\\s*&&\\s*`, "g"), "")
          .trim();
      }

      // Transform yarn commands to npm equivalents if needed
      if (packageManager === "npm") {
        scripts[key] = transformScriptForPackageManager(scripts[key], packageManager);
      }

      if (scripts[key] === "") {
        delete scripts[key];
      }
    }
  }

  // Update packageManager field to match selected package manager
  if (packageManager === "npm") {
    // Get npm version for the packageManager field
    pkg.packageManager = "npm@10.0.0"; // Will be updated with actual version during install
  }
  // For yarn, keep the template's packageManager field as-is

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), "utf8");
}

/**
 * Resolves the template to a giget spec (repo#branch), downloads it to a temp
 * dir, copies contents into targetDir, removes the unselected solidity framework
 * package(s), updates root package.json, runs manifest post-processing, and inits git.
 */
export async function copyTemplateFiles(options: Options, targetDir: string): Promise<{ outroSteps?: string[] }> {
  const spec = getTemplateSpec(options.template as string);
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "create-scaffold-hbar-"));

  try {
    await downloadTemplate(`gh:${spec}`, { dir: tmpDir });

    const entries = fs.readdirSync(tmpDir, { withFileTypes: true });
    for (const entry of entries) {
      const src = path.join(tmpDir, entry.name);
      const dest = path.join(targetDir, entry.name);
      await fse.copy(src, dest, { overwrite: true });
    }

    removeUnselectedFrameworkPackages(targetDir, options.solidityFramework);
    if (options.frontend === "none") {
      removeNextjsPackage(targetDir);
    }
    filterRootPackageJson(targetDir, options.solidityFramework, options.frontend, options.packageManager);

    // Remove Yarn-specific files when using npm to prevent conflicts
    removeYarnSpecificFiles(targetDir, options.packageManager);

    createNpmrcForNpm(targetDir, options.packageManager);

    const outroSteps = processTemplateManifest(targetDir, options.project);

    await execa("git", ["init"], { cwd: targetDir });
    await execa("git", ["checkout", "-b", "main"], { cwd: targetDir });

    return outroSteps?.length ? { outroSteps } : {};
  } finally {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  }
}
