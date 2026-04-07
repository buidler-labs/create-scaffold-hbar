import {
  copyTemplateFiles,
  createProjectDirectory,
  createFirstGitCommit,
  prettierFormat,
  installPackages,
} from "./tasks";
import type { Options } from "./types";
import { renderOutroMessage } from "./utils/render-outro-message";
import chalk from "chalk";
import { Listr } from "listr2";
import path from "path";
import { SOLIDITY_FRAMEWORKS } from "./utils/consts";

export async function createProject(options: Options) {
  console.log(`\n`);

  const targetDirectory = path.resolve(process.cwd(), options.project);
  let outroSteps: string[] | undefined;

  const tasks = new Listr(
    [
      {
        title: `📁 Create project directory ${targetDirectory}`,
        task: () => createProjectDirectory(options.project),
      },
      {
        title: `🚀 Creating a new Scaffold-HBAR app in ${chalk.green.bold(options.project)}`,
        task: async () => {
          const { outroSteps: steps } = await copyTemplateFiles(options, targetDirectory);
          outroSteps = steps;
        },
      },
      {
        title: `📦 Installing dependencies with ${options.packageManager}, this could take a while`,
        task: (_, task) => installPackages(targetDirectory, task, options.packageManager),
        skip: () => {
          if (!options.install) {
            return "Manually skipped, since `--skip-install` flag was passed";
          }
          return false;
        },
        rendererOptions: {
          outputBar: 8,
          persistentOutput: false,
        },
      },
      {
        title: "🪄 Formatting files",
        task: () => prettierFormat(targetDirectory),
        skip: () => {
          if (!options.install) {
            return "Can't use source prettier, since `yarn install` was skipped";
          }
          return false;
        },
      },
      {
        title: `📡 Initializing Git repository${options.solidityFramework === SOLIDITY_FRAMEWORKS.FOUNDRY ? " and submodules" : ""}`,
        task: () => createFirstGitCommit(targetDirectory, options),
      },
    ],
    { rendererOptions: { collapseSkips: false, suffixSkips: true } },
  );

  await tasks.run();
  renderOutroMessage(outroSteps?.length ? { ...options, outroSteps } : options);
}
