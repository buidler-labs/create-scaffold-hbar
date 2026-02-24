# create-hbar

**Scaffold Hedera dApp projects from the command line.** Pick a template, frontend, Solidity framework, and wallet—then get a runnable project in one step.

Create-hbar is an interactive CLI (like `create-next-app` or `create-react-app`) for the [Hedera](https://hedera.com) ecosystem. It generates a monorepo with contracts (Hardhat or Foundry), frontend (Next.js or Vite), and Hedera network configuration (testnet, mainnet, or local node) so you can start building on Hedera quickly.

---

## Features

- **Starter templates** — Blank, HTS fungible, HTS NFT, HCS DAO, or DeFi swap
- **Frontend options** — Next.js (App or Pages Router) or Vite + React
- **Solidity** — Hardhat or Foundry (or contracts-only)
- **Wallets** — WalletConnect v2 or MetaMask, wired for Hedera
- **Networks** — Testnet, Mainnet, or local node (Hashio RPC + Mirror Node URLs)
- **Non-interactive** — Use `--yes` or full flags for CI and scripts

---

## Prerequisites

- **Node.js** ≥ 20.18.3  
  [nodejs.org](https://nodejs.org/)
- **Git** (with `user.name` and `user.email` configured)  
  [git-scm.com](https://git-scm.com/)
- **Yarn**, **npm**, **pnpm**, or **bun** (one of them; the CLI can detect it)

If you choose **Foundry** as the Solidity framework, you need Foundry installed:

- **Official installer** (includes `forge` and `foundryup`):
  ```bash
  curl -L https://foundry.paradigm.xyz | bash
  ```
  Then restart your terminal and run:
  ```bash
  foundryup
  ```
- **Homebrew** (macOS):
  ```bash
  brew install foundry
  ```
  Update later with `brew upgrade foundry` (Homebrew does not install the `foundryup` command).

If you choose **Hardhat** or **none**, no extra install is required.

---

## Quick start (run from npm)

Create a new Hedera dApp without cloning this repo:

```bash
npx create-hbar@latest
```

You’ll get interactive prompts for project name, template, frontend, framework, wallet, network, and package manager. To accept all defaults and skip prompts:

```bash
npx create-hbar@latest --yes
```

To skip installing dependencies (e.g. to install yourself later):

```bash
npx create-hbar@latest --yes --skip-install
```

---

## Running locally (development)

Use this when you’re working on the create-hbar CLI itself.

### 1. Clone and install

```bash
git clone https://github.com/hashgraph/create-hbar.git
cd create-hbar
yarn install
```

### 2. Build

The CLI runs from compiled output in `dist/`:

```bash
yarn build
```

### 3. Run the CLI

From the repo root:

```bash
node bin/create-hbar.js [project-name] [options]
```

Or use the `cli` script:

```bash
yarn cli
```

**Examples (run from repo root):**

```bash
# Interactive: prompts for everything
node bin/create-hbar.js --skip-install

# Non-interactive: default project name, no install, no Foundry check
node bin/create-hbar.js --yes --skip-install --solidity-framework none

# Non-interactive with Hardhat
node bin/create-hbar.js --yes --skip-install --solidity-framework hardhat

# Custom project name and template
node bin/create-hbar.js my-hts-app --template hts-nft --frontend vite-react --skip-install

# See all options
node bin/create-hbar.js --help
```

To avoid creating the project inside the repo, run from another directory:

```bash
cd /tmp
node /path/to/create-hbar/bin/create-hbar.js --yes --skip-install my-hedera-dapp
```

---

## CLI options

| Option                                                     | Description                                                                      |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `[project-name]`                                           | Project directory name (or use `--destination`)                                  |
| `-d, --destination <path>`                                 | Output path instead of positional name                                           |
| `-t, --template <key>`                                     | `blank` \| `hts-fungible` \| `hts-nft` \| `hcs-dao` \| `defi-swap` or `org/repo` |
| `-f, --frontend <fw>`                                      | `nextjs-app` \| `nextjs-pages` \| `vite-react` \| `none`                         |
| `-s, --solidity-framework <fw>`                            | `foundry` \| `hardhat` \| `none`                                                 |
| `-w, --wallet <list>`                                      | Comma-separated: `walletconnect`, `metamask`                                     |
| `--network <network>`                                      | `testnet` \| `mainnet` \| `local`                                                |
| `--use-npm` \| `--use-pnpm` \| `--use-yarn` \| `--use-bun` | Force package manager                                                            |
| `--skip-install`                                           | Don’t run install after scaffolding                                              |
| `-y, --yes`                                                | Use defaults for all prompts (non-interactive)                                   |
| `--ci`                                                     | CI mode (implies `--yes`, structured output)                                     |
| `-e, --extension <name>`                                   | Community extension (e.g. `owner/repo`)                                          |
| `--dev`                                                    | Dev mode: use local `externalExtensions/` symlinks                               |
| `-h, --help`                                               | Show help                                                                        |
| `-v, --version`                                            | Show version                                                                     |

---

## Development (contributing)

- **Typecheck:** `yarn type-check`
- **Lint:** `yarn lint`
- **Format:** `yarn format`
- **Tests:** `yarn test`
- **Tests (watch):** `yarn test:watch`
- **Coverage:** `yarn test:coverage`

Pre-commit hooks (lefthook) run format, type-check, and lint.

---

## Project structure

```
create-hbar/
├── bin/create-hbar.js    # CLI entry (points to dist/)
├── src/
│   ├── cli.ts            # Main CLI flow
│   ├── main.ts           # createProject task list
│   ├── types.ts          # Shared types
│   ├── utils/            # Prompts, parsing, validation, intro/outro
│   └── tasks/            # Copy template, install, git, format
├── templates/            # Base + solidity-frameworks (hardhat, foundry)
├── tests/
│   ├── unit/             # Unit tests (consts, types, parse-arguments)
│   └── integration/      # Integration tests (prompts)
└── dist/                 # Built output (generated by yarn build)
```

---

## Links

- [Hedera Developer Portal](https://docs.hedera.com/)
- [Hedera Documentation](https://docs.hedera.com/hedera/core-concepts/)
- [Get testnet HBAR](https://portal.hedera.com/)

---

## License

MIT
