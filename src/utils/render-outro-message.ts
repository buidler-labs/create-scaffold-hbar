import type { Options } from "../types";
import chalk from "chalk";
import { SOLIDITY_FRAMEWORKS } from "./consts";

/** Expands `{run:script}` placeholders (e.g. `{run:start}` → `yarn start` or `npm run start`). */
export function expandOutroPlaceholders(line: string, run: (script: string) => string): string {
  // Replace {run:script} with colored command
  return line.replace(/\{run:([a-zA-Z0-9:_-]+)\}/g, (_, script: string) => {
    return chalk.cyan(run(script));
  });
}

function formatOutroLine(line: string): string {
  if (line.startsWith("+")) {
    return chalk.bold(line.slice(1));
  }
  return line;
}

/** Generates the run command based on package manager.
 * @param hasArgs - Whether additional arguments will be passed. If true for npm, adds `--` separator.
 */
function getRunCommand(packageManager: Options["packageManager"], script: string, hasArgs: boolean = false): string {
  if (packageManager === "npm") {
    // npm requires `--` separator to forward arguments through script chains
    return hasArgs ? `npm run ${script} --` : `npm run ${script}`;
  }
  return `yarn ${script}`;
}

/** Generates the install and format command based on package manager. */
function getInstallAndFormatCommand(packageManager: Options["packageManager"]): string {
  if (packageManager === "npm") {
    // Use --legacy-peer-deps to handle peer dependency conflicts in Hedera packages
    return `${chalk.cyan("npm install --legacy-peer-deps")} && ${chalk.cyan("npm run format")}`;
  }
  return `${chalk.cyan("yarn install")} && ${chalk.cyan("yarn format")}`;
}

/**
 * Wraps text into lines of maximum width, preserving existing newlines.
 */
function wrapText(text: string, maxWidth: number = 80): string {
  const lines = text.split("\n");
  const result: string[] = [];

  for (const line of lines) {
    if (line.length <= maxWidth) {
      result.push(line);
      continue;
    }

    const words = line.split(" ");
    let currentLine = "";

    for (const word of words) {
      if ((currentLine + " " + word).length > maxWidth && currentLine.length > 0) {
        result.push(currentLine.trim());
        currentLine = word;
      } else {
        currentLine += " " + word;
      }
    }

    if (currentLine.trim()) {
      result.push(currentLine.trim());
    }
  }

  return result.join("\n");
}

export function renderOutroMessage(options: Options) {
  const run = (script: string) => getRunCommand(options.packageManager, script);
  const installAndFormat = getInstallAndFormatCommand(options.packageManager);

  let message = `
  ${chalk.bold.green("Congratulations!")} Your project has been scaffolded! 🎉

  ${chalk.bold("Next steps:")}

  ${chalk.dim("cd")} ${chalk.white(options.project)}
`;

  if (!options.install) {
    message += `
  ${chalk.bold("Install dependencies & format files")}
    ${installAndFormat}
`;
  }

  const customSteps = options.outroSteps;
  if (customSteps?.length) {
    message += "\n";
    for (const raw of customSteps) {
      const expanded = expandOutroPlaceholders(raw, run);
      const formatted = formatOutroLine(expanded);
      // Wrap long lines and add proper indentation
      const wrapped = wrapText(formatted, 76);
      const indented = wrapped.split("\n").join("\n    ");
      message += `  ${indented}\n`;
    }
  } else if (
    options.solidityFramework === SOLIDITY_FRAMEWORKS.HARDHAT ||
    options.solidityFramework === SOLIDITY_FRAMEWORKS.FOUNDRY
  ) {
    // For npm, use hasArgs=true when the command will be followed by arguments (needs `--` separator)
    const deployCmd = getRunCommand(options.packageManager, "deploy", true);
    message += `
  ${chalk.bold("Run locally:")}
    1. Start the local chain: ${chalk.cyan(run("chain"))}
    2. In another terminal, deploy to the local node: ${chalk.cyan(`${deployCmd} --network localhost`)}
    3. Run contract tests (with the chain running): ${chalk.cyan(run("test"))}
`;
    if (options.frontend !== "none") {
      message += `    4. Start the frontend: ${chalk.cyan(run("start"))}\n`;
    }

    const deployTestnet =
      options.solidityFramework === SOLIDITY_FRAMEWORKS.HARDHAT
        ? `${deployCmd} --network hederaTestnet`
        : `${deployCmd} --network hedera_testnet`;
    message += `
  ${chalk.bold("Deploy to Hedera testnet:")}
    Set your deployer key (e.g. ${chalk.cyan(run("generate"))}), then: ${chalk.cyan(deployTestnet)}
    After deploy, verify on Hashscan (no args needed): ${chalk.cyan(run("verify:testnet"))}
    For mainnet: ${chalk.cyan(run("verify:mainnet"))}
`;
  } else if (options.frontend !== "none") {
    message += `
  ${chalk.bold("Start the frontend")}: ${chalk.cyan(run("start"))}
`;
  }

  message += `
  ${chalk.bold.green("Thanks for using Scaffold-HBAR 🙏, Happy Building!")}
`;

  console.log(message);
}
