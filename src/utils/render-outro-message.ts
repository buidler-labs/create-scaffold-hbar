import type { Options } from "../types";
import chalk from "chalk";
import { SOLIDITY_FRAMEWORKS } from "./consts";

export function renderOutroMessage(options: Options) {
  const pm = options.packageManager;
  const run = (script: string) => (pm === "npm" ? `npm run ${script}` : `${pm} ${script}`);
  const installAndFormat = `${pm} install && ${run("format")}`;

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

  if (
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
