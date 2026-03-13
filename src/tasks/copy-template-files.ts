import { execa } from "execa";
import { downloadTemplate } from "giget";
import { Options, TemplateManifestSchema } from "../types";
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

/**
 * If template.json exists in project root, parse it, run rename and env
 * generation, then remove the manifest file.
 */
function processTemplateManifest(projectDir: string, projectName: string): void {
  const manifestPath = path.join(projectDir, TEMPLATE_MANIFEST_FILENAME);
  if (!fs.existsSync(manifestPath)) return;

  const raw = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const manifest = TemplateManifestSchema.parse(raw);
  const createHbar = manifest["create-hbar"];

  if (createHbar?.rename) {
    applyRenameMap(projectDir, createHbar.rename, projectName);
  }
  if (createHbar?.envVars?.length) {
    generateEnvExample(projectDir, createHbar.envVars);
  }

  fs.unlinkSync(manifestPath);
}

/**
 * Removes packages/ for frameworks the user did not select so only the chosen
 * solidity framework (and nextjs) remain.
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

/**
 * Updates root package.json so workspaces and scripts only reference the
 * selected solidity framework (removes the other so yarn/workspaces don't error).
 */
function filterRootPackageJson(targetDir: string, selectedFramework: SolidityFramework | null | undefined): void {
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
    const filtered = wsList.filter(w => !unselected.some(sf => w.includes(sf)));
    if (Array.isArray(pkg.workspaces)) {
      pkg.workspaces = filtered;
    } else if (typeof pkg.workspaces === "object" && pkg.workspaces !== null && "packages" in pkg.workspaces) {
      (pkg.workspaces as { packages: string[] }).packages = filtered;
    }
  }

  if (pkg.scripts && typeof pkg.scripts === "object") {
    const scripts = pkg.scripts as Record<string, string>;
    for (const key of Object.keys(scripts)) {
      if (unselected.some(sf => key === sf || key.startsWith(`${sf}:`))) {
        delete scripts[key];
      }
    }
    if (selectedFramework) {
      for (const key of Object.keys(scripts)) {
        for (const sf of unselected) {
          const prefix = `yarn ${sf}:`;
          if (typeof scripts[key] === "string" && scripts[key].startsWith(prefix)) {
            const sub = scripts[key].slice(prefix.length);
            scripts[key] = `yarn ${selectedFramework}:${sub}`;
          }
        }
      }
      for (const key of Object.keys(scripts)) {
        if (typeof scripts[key] === "string") {
          for (const sf of unselected) {
            scripts[key] = scripts[key]
              .replace(new RegExp(`\\s*&&\\s*yarn ${sf}:[^\\s&]+`, "g"), "")
              .replace(new RegExp(`yarn ${sf}:[^\\s&]+\\s*&&\\s*`, "g"), "")
              .trim();
          }
        }
      }
    }
  }

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), "utf8");
}

/**
 * Resolves the template to a giget spec (repo#branch), downloads it to a temp
 * dir, copies contents into targetDir, removes the unselected solidity framework
 * package(s), updates root package.json, runs manifest post-processing, and inits git.
 */
export async function copyTemplateFiles(options: Options, targetDir: string): Promise<void> {
  const spec = getTemplateSpec(options.template as string);
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "create-hbar-"));

  try {
    await downloadTemplate(`gh:${spec}`, { dir: tmpDir });

    const entries = fs.readdirSync(tmpDir, { withFileTypes: true });
    for (const entry of entries) {
      const src = path.join(tmpDir, entry.name);
      const dest = path.join(targetDir, entry.name);
      await fse.copy(src, dest, { overwrite: true });
    }

    removeUnselectedFrameworkPackages(targetDir, options.solidityFramework);
    filterRootPackageJson(targetDir, options.solidityFramework);

    processTemplateManifest(targetDir, options.project);

    await execa("git", ["init"], { cwd: targetDir });
    await execa("git", ["checkout", "-b", "main"], { cwd: targetDir });
  } finally {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  }
}
