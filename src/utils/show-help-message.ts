import chalk from "chalk";

export const showHelpMessage = () => {
  console.log(`
  ${chalk.bold.hex("#00C4B5")("create-hbar")} — Scaffold a Hedera dApp project

  ${chalk.bold("Usage:")}
    ${chalk.green("npx create-hbar@latest")} ${chalk.gray("[project-name] [options]")}

  ${chalk.bold("Arguments:")}
    ${chalk.gray("project-name")}                    Name / path of the project to create

  ${chalk.bold("Options:")}
    ${chalk.gray("-d, --destination <path>")}        Output directory (alternative to positional arg)
    ${chalk.gray("-t, --template <template>")}       Starter template key or GitHub org/repo
                                       ${chalk.dim("blank | hts-fungible | hts-nft | hcs-dao | defi-swap | org/repo")}
    ${chalk.gray("-f, --frontend <framework>")}      Frontend framework
                                       ${chalk.dim("nextjs-app")}
    ${chalk.gray("-s, --solidity-framework <fw>")}   Solidity / contract framework
                                       ${chalk.dim("foundry | hardhat | none")}
    ${chalk.gray("-w, --wallet <wallets>")}          Wallet connector
                                       ${chalk.dim("walletconnect")}
    ${chalk.gray("--network <network>")}             Target Hedera network
                                       ${chalk.dim("testnet | mainnet")}
    ${chalk.gray("--use-npm")}                       Use npm as package manager
    ${chalk.gray("-p, --use-pnpm")}                  Use pnpm as package manager
    ${chalk.gray("--use-yarn")}                      Use yarn as package manager
    ${chalk.gray("--use-bun")}                       Use bun as package manager
    ${chalk.gray("--skip-install")}                  Skip dependency installation
    ${chalk.gray("-y, --yes")}                       Accept all defaults, skip all prompts
    ${chalk.gray("--ci")}                            CI mode: non-interactive, structured output, no color
    ${chalk.gray("--log-level <level>")}             Log verbosity (default: info)
                                       ${chalk.dim("error | warn | info | verbose | debug")}
    ${chalk.gray("-e, --extension <ext>")}           Add a curated or third-party extension
    ${chalk.gray("-v, --version")}                   Print CLI version and exit
    ${chalk.gray("-h, --help")}                       Display this help text and exit

  ${chalk.bold("Examples:")}
    ${chalk.dim("# Interactive")}
    ${chalk.green("npx create-hbar@latest")}

    ${chalk.dim("# Fully non-interactive")}
    ${chalk.green("npx create-hbar@latest my-dapp --template hts-nft --frontend nextjs-app --use-pnpm --yes")}

    ${chalk.dim("# CI pipeline")}
    ${chalk.green("npx create-hbar@latest my-dapp --template blank --frontend nextjs-app --skip-install --ci")}

    ${chalk.dim("# Community template")}
    ${chalk.green("npx create-hbar@latest my-dapp --template my-org/my-hedera-template --yes")}
`);
};
