import { execa } from "execa";
import { downloadTemplate } from "giget";
import { ExternalExtension, Options, SolidityFramework, TemplateDescriptor, TemplateManifestSchema } from "../types";
import { findFilesRecursiveSync } from "../utils/find-files-recursively";
import { mergePackageJson } from "../utils/merge-package-json";
import fs from "fs";
import os from "os";
import { pathToFileURL } from "url";
import fse from "fs-extra";
import path from "path";
import link from "../utils/link";
import { getArgumentFromExternalExtensionOption } from "../utils/external-extensions";
import {
  BASE_DIR,
  SOLIDITY_FRAMEWORKS,
  SOLIDITY_FRAMEWORKS_DIR,
  EXAMPLE_CONTRACTS_DIR,
  GLOBAL_ARGS_DEFAULTS,
} from "../utils/consts";

/** True when template is scaffold-eth-2 style (packages/ at root, no base/). */
function isScaffoldEth2Layout(templateDir: string): boolean {
  const packagesPath = path.join(templateDir, "packages");
  const basePath = path.join(templateDir, BASE_DIR);
  return fs.existsSync(packagesPath) && fs.statSync(packagesPath).isDirectory() && !fs.existsSync(basePath);
}
import { applyRenameMap } from "./apply-rename-map";
import { generateEnvExample } from "./generate-env-example";

const EXTERNAL_EXTENSION_TMP_DIR = "tmp-external-extension";

type CopyFn = (
  src: string,
  dest: string,
  options?: { clobber?: boolean; filter?: (src: string) => boolean },
) => Promise<void>;

const copy: CopyFn = (src, dest, options) =>
  fse.copy(src, dest, {
    overwrite: options?.clobber ?? true,
    filter: options?.filter,
  });

let copyOrLink: CopyFn = copy;

const isTemplateRegex = /([^/\\]*?)\.template\./;
const isPackageJsonRegex = /package\.json/;
const isYarnLockRegex = /yarn\.lock/;
const isConfigRegex = /([^/\\]*?)\\config\.json/;
const isArgsRegex = /([^/\\]*?)\.args\./;
const isSolidityFrameworkFolderRegex = /solidity-frameworks$/;
const isPackagesFolderRegex = /packages$/;
const isDeployedContractsRegex = /packages\/nextjs\/contracts\/deployedContracts\.ts/;

const getSolidityFrameworkPath = (solidityFramework: SolidityFramework, templatesDirectory: string) =>
  path.resolve(templatesDirectory, SOLIDITY_FRAMEWORKS_DIR, solidityFramework);

const copyBaseFiles = async (basePath: string, targetDir: string, { dev: isDev }: Options) => {
  await copyOrLink(basePath, targetDir, {
    clobber: false,
    filter: (fileName: string) => {
      const isTemplate = isTemplateRegex.test(fileName);

      const isYarnLock = isYarnLockRegex.test(fileName);
      const isDeployedContracts = isDeployedContractsRegex.test(fileName);
      const isPackageJson = isPackageJsonRegex.test(fileName);
      const skipDevOnly = isDev && (isYarnLock || isDeployedContracts || isPackageJson);

      return !isTemplate && !skipDevOnly;
    },
  });

  if (isDev) {
    // We don't want symlink below files in dev mode
    const baseYarnLockPaths = findFilesRecursiveSync(basePath, path => isYarnLockRegex.test(path));
    baseYarnLockPaths.forEach(yarnLockPath => {
      const partialPath = yarnLockPath.split(basePath)[1];
      void copy(path.join(basePath, partialPath), path.join(targetDir, partialPath));
    });

    const basePackageJsonPaths = findFilesRecursiveSync(basePath, path => isPackageJsonRegex.test(path));
    basePackageJsonPaths.forEach(packageJsonPath => {
      const partialPath = packageJsonPath.split(basePath)[1];
      mergePackageJson(path.join(targetDir, partialPath), path.join(basePath, partialPath), isDev);
    });

    const baseDeployedContractsPaths = findFilesRecursiveSync(basePath, path => isDeployedContractsRegex.test(path));
    baseDeployedContractsPaths.forEach(deployedContractsPath => {
      const partialPath = deployedContractsPath.split(basePath)[1];
      void copy(path.join(basePath, partialPath), path.join(targetDir, partialPath));
    });
  }
};

const isUnselectedSolidityFrameworkFile = ({
  path,
  solidityFramework,
}: {
  path: string;
  solidityFramework: SolidityFramework | null;
}) => {
  const unselectedSolidityFrameworks = [SOLIDITY_FRAMEWORKS.FOUNDRY, SOLIDITY_FRAMEWORKS.HARDHAT].filter(
    sf => sf !== solidityFramework,
  );
  return unselectedSolidityFrameworks.map(sf => new RegExp(`${sf}`)).some(sfregex => sfregex.test(path));
};

const copyExtensionFiles = async (
  { dev: isDev, solidityFramework }: Options,
  extensionPath: string,
  targetDir: string,
) => {
  // copy (or link if dev) root files
  await copyOrLink(extensionPath, path.join(targetDir), {
    clobber: false,
    filter: (path: string) => {
      const isConfig = isConfigRegex.test(path);
      const isArgs = isArgsRegex.test(path);
      const isSolidityFrameworkFolder = isSolidityFrameworkFolderRegex.test(path) && fs.lstatSync(path).isDirectory();
      const isPackagesFolder = isPackagesFolderRegex.test(path) && fs.lstatSync(path).isDirectory();
      const isTemplate = isTemplateRegex.test(path);
      // PR NOTE: this wasn't needed before because ncp had the clobber: false
      const isPackageJson = isPackageJsonRegex.test(path);
      const shouldSkip =
        isConfig || isArgs || isTemplate || isPackageJson || isSolidityFrameworkFolder || isPackagesFolder;
      return !shouldSkip;
    },
  });

  // merge root package.json
  mergePackageJson(path.join(targetDir, "package.json"), path.join(extensionPath, "package.json"), isDev);

  const extensionPackagesPath = path.join(extensionPath, "packages");
  const hasPackages = fs.existsSync(extensionPackagesPath);
  if (hasPackages) {
    // copy extension packages files
    await copyOrLink(extensionPackagesPath, path.join(targetDir, "packages"), {
      clobber: false,
      filter: (path: string) => {
        const isArgs = isArgsRegex.test(path);
        const isTemplate = isTemplateRegex.test(path);
        const isPackageJson = isPackageJsonRegex.test(path);

        const isUnselectedSolidityFramework = isUnselectedSolidityFrameworkFile({ path, solidityFramework });

        const shouldSkip = isArgs || isTemplate || isPackageJson || isUnselectedSolidityFramework;

        return !shouldSkip;
      },
    });

    // copy each package's package.json
    const extensionPackages = fs.readdirSync(extensionPackagesPath);
    extensionPackages.forEach(packageName => {
      const isUnselectedSolidityFramework = isUnselectedSolidityFrameworkFile({
        path: path.join(targetDir, "packages", packageName, "package.json"),
        solidityFramework,
      });

      if (isUnselectedSolidityFramework) {
        return;
      }

      mergePackageJson(
        path.join(targetDir, "packages", packageName, "package.json"),
        path.join(extensionPath, "packages", packageName, "package.json"),
        isDev,
      );

      if (packageName === solidityFramework) {
        mergePackageJson(
          path.join(targetDir, "package.json"),
          path.join(extensionPath, "packages", packageName, "root.package.json"),
          isDev,
        );
      }
    });
  }
};

const processTemplatedFiles = async (
  { solidityFramework, externalExtension, dev: isDev }: Options,
  basePath: string,
  solidityFrameworkPath: string | null,
  exampleContractsPath: string | null,
  targetDir: string,
) => {
  const baseTemplatedFileDescriptors: TemplateDescriptor[] = findFilesRecursiveSync(basePath, path =>
    isTemplateRegex.test(path),
  ).map(baseTemplatePath => ({
    path: baseTemplatePath,
    fileUrl: pathToFileURL(baseTemplatePath).href,
    relativePath: baseTemplatePath.split(basePath)[1],
    source: "base",
  }));

  const solidityFrameworkTemplatedFileDescriptors: TemplateDescriptor[] = solidityFrameworkPath
    ? findFilesRecursiveSync(solidityFrameworkPath, filePath => isTemplateRegex.test(filePath))
        .map(solidityFrameworkTemplatePath => ({
          path: solidityFrameworkTemplatePath,
          fileUrl: pathToFileURL(solidityFrameworkTemplatePath).href,
          relativePath: solidityFrameworkTemplatePath.split(solidityFrameworkPath)[1],
          source: `extension ${solidityFramework}`,
        }))
        .flat()
    : [];

  const starterContractsTemplateFileDescriptors: TemplateDescriptor[] = exampleContractsPath
    ? findFilesRecursiveSync(exampleContractsPath, filePath => isTemplateRegex.test(filePath))
        .map(exampleContractTemplatePath => ({
          path: exampleContractTemplatePath,
          fileUrl: pathToFileURL(exampleContractTemplatePath).href,
          relativePath: exampleContractTemplatePath.split(exampleContractsPath)[1],
          source: `example-contracts ${solidityFramework}`,
        }))
        .flat()
    : [];

  const externalExtensionFolder = isDev
    ? typeof externalExtension === "string"
      ? path.join(basePath, "../../externalExtensions", externalExtension, "extension")
      : undefined
    : path.join(targetDir, EXTERNAL_EXTENSION_TMP_DIR, "extension");

  const externalExtensionTemplatedFileDescriptors: TemplateDescriptor[] =
    externalExtension && externalExtensionFolder
      ? findFilesRecursiveSync(externalExtensionFolder, filePath => isTemplateRegex.test(filePath)).map(
          extensionTemplatePath => ({
            path: extensionTemplatePath,
            fileUrl: pathToFileURL(extensionTemplatePath).href,
            relativePath: extensionTemplatePath.split(externalExtensionFolder)[1],
            source: `external extension ${isDev ? (externalExtension as string) : getArgumentFromExternalExtensionOption(externalExtension)}`,
          }),
        )
      : [];

  await Promise.all(
    [
      ...baseTemplatedFileDescriptors,
      ...solidityFrameworkTemplatedFileDescriptors,
      ...externalExtensionTemplatedFileDescriptors,
      ...starterContractsTemplateFileDescriptors,
    ].map(async templateFileDescriptor => {
      const templateTargetName = templateFileDescriptor.path.match(isTemplateRegex)?.[1] as string;

      const argsPath = templateFileDescriptor.relativePath.replace(isTemplateRegex, `${templateTargetName}.args.`);

      const argsFileUrls = [];

      if (solidityFrameworkPath) {
        const argsFilePath = path.join(solidityFrameworkPath, argsPath);
        const fileExists = fs.existsSync(argsFilePath);
        if (fileExists) {
          argsFileUrls.push(pathToFileURL(argsFilePath).href);
        }
      }

      if (exampleContractsPath) {
        const argsFilePath = path.join(exampleContractsPath, argsPath);
        const fileExists = fs.existsSync(argsFilePath);
        if (fileExists) {
          argsFileUrls.push(pathToFileURL(argsFilePath).href);
        }
      }

      if (externalExtension) {
        const argsFilePath = isDev
          ? path.join(basePath, "../../externalExtensions", externalExtension as string, "extension", argsPath)
          : path.join(targetDir, EXTERNAL_EXTENSION_TMP_DIR, "extension", argsPath);

        const fileExists = fs.existsSync(argsFilePath);
        if (fileExists) {
          argsFileUrls?.push(pathToFileURL(argsFilePath).href);
        }
      }

      const args = await Promise.all(
        argsFileUrls.map(async argsFileUrl => (await import(argsFileUrl)) as Record<string, any>),
      );

      const fileTemplate = (await import(templateFileDescriptor.fileUrl)).default as (
        args: Record<string, string[]>,
      ) => string;

      if (!fileTemplate) {
        throw new Error(
          `Template ${templateTargetName} from ${templateFileDescriptor.source} doesn't have a default export`,
        );
      }
      if (typeof fileTemplate !== "function") {
        throw new Error(
          `Template ${templateTargetName} from ${templateFileDescriptor.source} is not exporting a function by default`,
        );
      }

      const allKeys = [...new Set(args.flatMap(Object.keys))];

      const freshArgs: { [key: string]: string[] } = Object.fromEntries(
        allKeys.map(key => [
          key, // INFO: key for the freshArgs object
          [], // INFO: initial value for the freshArgs object
        ]),
      );

      const combinedArgs = args.reduce<typeof freshArgs>((accumulated, arg) => {
        Object.entries(arg).map(([key, value]) => {
          accumulated[key]?.push(value);
        });
        return accumulated;
      }, freshArgs);

      const globalArgs = {
        solidityFramework: [solidityFramework || GLOBAL_ARGS_DEFAULTS.solidityFramework],
      };

      const output = fileTemplate({ ...combinedArgs, ...globalArgs });

      const targetPath = path.join(
        targetDir,
        templateFileDescriptor.relativePath.split(templateTargetName)[0],
        templateTargetName,
      );
      fs.writeFileSync(targetPath, output);

      if (isDev) {
        const hasCombinedArgs = Object.keys(combinedArgs).length > 0;
        const hasArgsPaths = argsFileUrls.length > 0;
        const devOutput = `--- TEMPLATE FILE
templates/${templateFileDescriptor.source}${templateFileDescriptor.relativePath}


--- ARGS FILES
${
  hasArgsPaths
    ? argsFileUrls.map(url => `\t- ${url.split("templates")[1] || url.split("externalExtensions")[1]}`).join("\n")
    : "(no args files writing to the template)"
}


--- RESULTING ARGS
${
  hasCombinedArgs
    ? Object.entries(combinedArgs)
        .map(([argName, argValue]) => `\t- ${argName}:\t[${argValue.join(",")}]`)
        // TODO improvement: figure out how to add the values added by each args file
        .join("\n")
    : "(no args sent for the template)"
}
`;
        fs.writeFileSync(`${targetPath}.dev`, devOutput);
      }
    }),
  );
};

const setUpExternalExtensionFiles = async (options: Options, tmpDir: string) => {
  // 1. Create tmp directory to clone external extension
  await fs.promises.mkdir(tmpDir);

  const { repository, branch } = options.externalExtension as ExternalExtension;

  // 2. Clone external extension
  if (branch) {
    await execa("git", ["clone", "--branch", branch, repository, tmpDir], {
      cwd: tmpDir,
    });
  } else {
    await execa("git", ["clone", repository, tmpDir], { cwd: tmpDir });
  }
};

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
 * Rewrites the root package.json in targetDir so it only references the
 * selected solidity framework's workspaces and scripts.
 *
 * The SE2 template root package.json contains entries for BOTH hardhat and
 * foundry (e.g. `"packages/hardhat"` in workspaces, `hardhat:*` scripts).
 * When only one framework is selected, the other framework's workspace
 * path and its prefixed scripts must be removed so `yarn format` (and
 * similar commands) don't error with "Workspace not found".
 */
function filterRootPackageJson(targetDir: string, selectedFramework: string | null | undefined): void {
  const pkgPath = path.join(targetDir, "package.json");
  if (!fs.existsSync(pkgPath)) return;

  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as Record<string, any>;

  const unselected = [SOLIDITY_FRAMEWORKS.FOUNDRY, SOLIDITY_FRAMEWORKS.HARDHAT].filter(sf => sf !== selectedFramework);

  // Remove unselected framework workspace entries
  if (pkg.workspaces) {
    const wsList: string[] = Array.isArray(pkg.workspaces)
      ? pkg.workspaces
      : Array.isArray(pkg.workspaces?.packages)
        ? pkg.workspaces.packages
        : [];

    const filteredWs = wsList.filter(ws => !unselected.some(sf => ws.includes(sf)));

    if (Array.isArray(pkg.workspaces)) {
      pkg.workspaces = filteredWs;
    } else if (pkg.workspaces?.packages) {
      pkg.workspaces.packages = filteredWs;
    }
  }

  // Remove scripts that reference unselected frameworks
  if (pkg.scripts) {
    for (const key of Object.keys(pkg.scripts)) {
      const isUnselectedPrefix = unselected.some(sf => key === sf || key.startsWith(`${sf}:`));
      if (isUnselectedPrefix) {
        delete pkg.scripts[key];
      }
    }

    // Rewrite the top-level convenience scripts that delegate to the unselected framework.
    // E.g. `"chain": "yarn hardhat:chain"` must become `"chain": "yarn foundry:chain"` when
    // foundry is selected, and vice-versa.
    if (selectedFramework) {
      for (const key of Object.keys(pkg.scripts)) {
        for (const sf of unselected) {
          const delegatePrefix = `yarn ${sf}:`;
          if (typeof pkg.scripts[key] === "string" && pkg.scripts[key].startsWith(delegatePrefix)) {
            const subCommand = pkg.scripts[key].slice(delegatePrefix.length);
            pkg.scripts[key] = `yarn ${selectedFramework}:${subCommand}`;
          }
        }
      }

      // Also fix `format` / `lint` / `test` which may include `&& yarn <sf>:format` combos
      for (const key of Object.keys(pkg.scripts)) {
        if (typeof pkg.scripts[key] === "string") {
          for (const sf of unselected) {
            // Remove "&& yarn <unselected>:cmd" or "yarn <unselected>:cmd &&" fragments
            pkg.scripts[key] = (pkg.scripts[key] as string)
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
 * Copy from a scaffold-eth-2 layout (root + packages/hardhat|foundry|nextjs).
 * Copies root files (excluding .git, node_modules, packages) and selected packages.
 */
async function copyScaffoldEth2Template(options: Options, templateDir: string, targetDir: string): Promise<void> {
  const rootFilter = (src: string) => {
    const name = path.basename(src);
    if (name === ".git" || name === "node_modules" || name === "packages") return false;
    return true;
  };
  await fse.copy(templateDir, targetDir, { overwrite: true, filter: rootFilter });

  const packagesDir = path.join(templateDir, "packages");
  if (!fs.existsSync(packagesDir)) return;

  const toCopy: string[] = [];
  if (options.solidityFramework) {
    const pkgPath = path.join(packagesDir, options.solidityFramework);
    if (fs.existsSync(pkgPath)) toCopy.push(options.solidityFramework);
  }
  if (options.frontend === "nextjs-app") {
    if (fs.existsSync(path.join(packagesDir, "nextjs"))) toCopy.push("nextjs");
  }

  await fs.promises.mkdir(path.join(targetDir, "packages"), { recursive: true });
  for (const name of toCopy) {
    const src = path.join(packagesDir, name);
    const dest = path.join(targetDir, "packages", name);
    await fse.copy(src, dest, { overwrite: true });
  }

  // Remove workspace entries and scripts that belong to the unselected framework
  filterRootPackageJson(targetDir, options.solidityFramework);

  processTemplateManifest(targetDir, options.project);
  await execa("git", ["init"], { cwd: targetDir });
  await execa("git", ["checkout", "-b", "main"], { cwd: targetDir });
}

/**
 * Overlay the local Hedera Foundry package and process its templates so default-template + Foundry gets Hedera config and contracts.
 */
async function overlayHederaFoundryPackage(
  localTemplatesPath: string,
  targetDir: string,
  options: Options,
): Promise<void> {
  const localFoundryRoot = path.join(localTemplatesPath, SOLIDITY_FRAMEWORKS_DIR, SOLIDITY_FRAMEWORKS.FOUNDRY);
  const localFoundryPackage = path.join(localFoundryRoot, "packages", SOLIDITY_FRAMEWORKS.FOUNDRY);
  if (!fs.existsSync(localFoundryPackage)) return;

  const destFoundry = path.join(targetDir, "packages", SOLIDITY_FRAMEWORKS.FOUNDRY);
  await fs.promises.mkdir(destFoundry, { recursive: true });
  await fse.copy(localFoundryPackage, destFoundry, { overwrite: true });

  const emptyDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "create-hbar-empty-"));
  try {
    await processTemplatedFiles(options, emptyDir, localFoundryRoot, null, targetDir);
  } finally {
    await fs.promises.rm(emptyDir, { recursive: true, force: true });
  }
}

export async function copyTemplateFiles(
  options: Options,
  templateDir: string,
  targetDir: string,
  localTemplatesPath?: string,
) {
  const template = options.template as string;
  const isCommunityTemplate = template.includes("/");

  if (isCommunityTemplate) {
    const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "create-hbar-"));
    try {
      await downloadTemplate(`gh:${template}`, { dir: tmpDir });
      const entries = fs.readdirSync(tmpDir, { withFileTypes: true });
      for (const entry of entries) {
        const src = path.join(tmpDir, entry.name);
        const dest = path.join(targetDir, entry.name);
        await fse.copy(src, dest, { overwrite: true });
      }
    } finally {
      await fs.promises.rm(tmpDir, { recursive: true, force: true });
    }
    processTemplateManifest(targetDir, options.project);
    await execa("git", ["init"], { cwd: targetDir });
    await execa("git", ["checkout", "-b", "main"], { cwd: targetDir });
    return;
  }

  if (isScaffoldEth2Layout(templateDir)) {
    await copyScaffoldEth2Template(options, templateDir, targetDir);
    if (
      options.solidityFramework === SOLIDITY_FRAMEWORKS.FOUNDRY &&
      localTemplatesPath &&
      fs.existsSync(path.join(localTemplatesPath, SOLIDITY_FRAMEWORKS_DIR, SOLIDITY_FRAMEWORKS.FOUNDRY))
    ) {
      await overlayHederaFoundryPackage(localTemplatesPath, targetDir, options);
    }
    return;
  }

  copyOrLink = options.dev ? link : copy;
  const basePath = path.join(templateDir, BASE_DIR);
  const tmpDir = path.join(targetDir, EXTERNAL_EXTENSION_TMP_DIR);

  // 1. Copy base template to target directory
  await copyBaseFiles(basePath, targetDir, options);

  // 2. Copy solidity framework folder
  const solidityFrameworkPath =
    options.solidityFramework && getSolidityFrameworkPath(options.solidityFramework, templateDir);
  if (solidityFrameworkPath) {
    await copyExtensionFiles(options, solidityFrameworkPath, targetDir);
  }

  const resolvedExampleContracts =
    options.solidityFramework && path.resolve(templateDir, EXAMPLE_CONTRACTS_DIR, options.solidityFramework);
  const exampleContractsPath =
    resolvedExampleContracts && fs.existsSync(resolvedExampleContracts) ? resolvedExampleContracts : null;

  // 3. Set up external extension if needed
  if (options.externalExtension) {
    let externalExtensionPath = path.join(tmpDir, "extension");
    if (options.dev) {
      externalExtensionPath = path.join(
        templateDir,
        "../externalExtensions",
        options.externalExtension as string,
        "extension",
      );
    } else {
      await setUpExternalExtensionFiles(options, tmpDir);
    }

    if (options.solidityFramework) {
      const externalExtensionSolidityPath = path.join(
        externalExtensionPath,
        "packages",
        options.solidityFramework,
        "contracts",
      );
      // if external extension does not have solidity framework, we copy the example contracts
      if (!fs.existsSync(externalExtensionSolidityPath) && exampleContractsPath) {
        await copyExtensionFiles(options, exampleContractsPath, targetDir);
      }
    }

    await copyExtensionFiles(options, externalExtensionPath, targetDir);
  }

  const shouldCopyExampleContracts = !options.externalExtension && options.solidityFramework && exampleContractsPath;
  if (shouldCopyExampleContracts) {
    await copyExtensionFiles(options, exampleContractsPath, targetDir);
  }

  // 4. Process templated files and generate output
  await processTemplatedFiles(
    options,
    basePath,
    solidityFrameworkPath,
    shouldCopyExampleContracts ? exampleContractsPath : null,
    targetDir,
  );

  // 5. Delete tmp directory
  if (options.externalExtension && !options.dev) {
    await fs.promises.rm(tmpDir, { recursive: true });
  }

  // 6. Initialize git repo to avoid husky error
  await execa("git", ["init"], { cwd: targetDir });
  await execa("git", ["checkout", "-b", "main"], { cwd: targetDir });

  // 7. Process template.json manifest if present (rename + .env.example)
  processTemplateManifest(targetDir, options.project);
}
