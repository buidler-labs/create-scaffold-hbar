import type { Options } from "../types";
import chalk from "chalk";
import { SOLIDITY_FRAMEWORKS } from "./consts";

/** Expands `{run:script}` placeholders (e.g. `{run:start}` → `yarn start` or `npm run start`). */
export function expandOutroPlaceholders(line: string, run: (script: string) => string): string {
  return line.replace(/\{run:([a-zA-Z0-9:_-]+)\}/g, (_, script: string) => run(script));
}

function formatOutroLine(line: string): string {
  if (line.startsWith("+")) {
    return chalk.bold(line.slice(1));
  }
  return line;
}

/** Generates the run command based on package manager. */
function getRunCommand(packageManager: Options["packageManager"], script: string): string {
  if (packageManager === "npm") {
    return `npm run ${script}`;
  }
  return `yarn ${script}`;
}

/** Generates the install and format command based on package manager. */
function getInstallAndFormatCommand(packageManager: Options["packageManager"]): string {
  if (packageManager === "npm") {
    // Use --legacy-peer-deps to handle peer dependency conflicts in Hedera packages
    return `npm install --legacy-peer-deps && npm run format`;
  }
  return `yarn install && yarn format`;
}

export function renderOutroMessage(options: Options) {
  const run = (script: string) => getRunCommand(options.packageManager, script);
  const installAndFormat = getInstallAndFormatCommand(options.packageManager);

  let message = `
  \n
  ${chalk.bold.green("Congratulations!")} Your project has been scaffolded! 🎉

  ${chalk.bold("Next steps:")}
  
  ${chalk.dim("cd")} ${options.project}
  `;

  if (!options.install) {
    message += `
    \t${chalk.bold("Install dependencies & format files")}
    \t${chalk.dim(installAndFormat)}
    `;
  }

  const customSteps = options.outroSteps;
  if (customSteps?.length) {
    for (const raw of customSteps) {
      const expanded = expandOutroPlaceholders(raw, run);
      message += `\n    \t${formatOutroLine(expanded)}`;
    }
    message += "\n    ";
  } else if (
    options.solidityFramework === SOLIDITY_FRAMEWORKS.HARDHAT ||
    options.solidityFramework === SOLIDITY_FRAMEWORKS.FOUNDRY
  ) {
    message += `
    \t${chalk.bold("Run locally:")}
    \t  1. Start the local chain: ${chalk.dim(run("chain"))}
    \t  2. In another terminal, deploy to the local node: ${chalk.dim(`${run("deploy")} --network localhost`)}
    \t  3. Run contract tests (with the chain running): ${chalk.dim(run("test"))}
    `;
    if (options.frontend !== "none") {
      message += `\t  4. Start the frontend: ${chalk.dim(run("start"))}\n    `;
    }

    const deployTestnet =
      options.solidityFramework === SOLIDITY_FRAMEWORKS.HARDHAT
        ? `${run("deploy")} --network hederaTestnet`
        : `${run("deploy")} --network hedera_testnet`;
    message += `
    \t${chalk.bold("Deploy to Hedera testnet:")}
    \t  Set your deployer key (e.g. ${chalk.dim(run("generate"))}), then: ${chalk.dim(deployTestnet)}
    \t  After deploy, verify on Hashscan (no args needed): ${chalk.dim(run("verify:testnet"))}
    \t  For mainnet: ${chalk.dim(run("verify:mainnet"))}
    `;
  } else if (options.frontend !== "none") {
    message += `
    \t${chalk.bold("Start the frontend")}: ${chalk.dim(run("start"))}
    `;
  }

  message += `
  ${chalk.bold.green("Thanks for using Scaffold-HBAR 🙏, Happy Building!")}
  `;

  console.log(message);
}
