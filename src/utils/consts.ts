export const BASE_DIR = "base";
export const SOLIDITY_FRAMEWORKS_DIR = "solidity-frameworks";
/**
 * The templates/example-contracts directory has been removed; this constant
 * is retained so existing copy-template logic compiles without modification
 * until that path is replaced in a later step.
 */
export const EXAMPLE_CONTRACTS_DIR = "example-contracts";

/**
 * String constants for the two supported solidity frameworks.
 * Used throughout copy-template, extension, and validation logic.
 */
export const SOLIDITY_FRAMEWORKS = {
  HARDHAT: "hardhat",
  FOUNDRY: "foundry",
} as const;

/**
 * Default global template args injected during template file processing.
 * Used by processTemplatedFiles in copy-template-files.ts.
 */
export const GLOBAL_ARGS_DEFAULTS = {
  solidityFramework: "",
};

/** Starter template options shown in the interactive select prompt. */
export const TEMPLATES = [
  { value: "blank", label: "Blank Starter", hint: "minimal setup, no example contracts" },
  { value: "hts-fungible", label: "Fungible Token (HTS)", hint: "deploy & manage HTS tokens" },
  { value: "hts-nft", label: "NFT Collection", hint: "mint, list, transfer NFTs via HTS" },
  { value: "hcs-dao", label: "DAO Governance", hint: "on-chain voting via Hedera Consensus Service" },
  { value: "defi-swap", label: "DeFi Swap", hint: "AMM-style token exchange" },
] as const;

/** Frontend framework (Next.js only). */
export const FRONTENDS = [{ value: "nextjs-app", label: "Next.js (App Router)" }] as const;

/**
 * Solidity framework options for the interactive prompt.
 * Named SOLIDITY_FRAMEWORK_OPTIONS (not SOLIDITY_FRAMEWORKS) to avoid
 * colliding with the existing object constant used by copy-template logic.
 */
export const SOLIDITY_FRAMEWORK_OPTIONS = [
  { value: "foundry", label: "Foundry" },
  { value: "hardhat", label: "Hardhat" },
  { value: "none", label: "None" },
] as const;

/** Wallet connector (WalletConnect only). */
export const WALLETS = [
  { value: "walletconnect", label: "WalletConnect v2", hint: "via @hashgraph/hedera-wallet-connect" },
] as const;

/** Target Hedera network options (testnet and mainnet only). */
export const NETWORKS = [
  { value: "testnet", label: "Testnet", hint: "free testnet HBAR at portal.hedera.com" },
  { value: "mainnet", label: "Mainnet" },
] as const;

/** Package manager options shown when auto-detection is ambiguous. */
export const PACKAGE_MANAGERS = [
  { value: "npm", label: "npm" },
  { value: "pnpm", label: "pnpm" },
  { value: "yarn", label: "yarn" },
  { value: "bun", label: "bun" },
] as const;

/** Hedera brand palette used for terminal output styling. */
export const BRAND_COLORS = {
  hederaTeal: "#0031FF",
  hederaPurple: "#8259EF",
  hederaDark: "#11151D",
  textPrimary: "#FFFFFF",
  textMuted: "#9B9B9D",
  successGreen: "#22C55E",
  errorRed: "#EF4444",
  warningAmber: "#F59E0B",
} as const;

/** Defaults applied when the user passes --yes or --ci to skip all prompts. */
export const DEFAULT_OPTIONS = {
  project: "my-hedera-dapp",
  template: "blank",
  frontend: "nextjs-app",
  wallet: ["walletconnect"],
  network: "testnet",
  packageManager: "npm",
  install: true,
  solidityFramework: "foundry",
} as const;

/**
 * Standardised process exit codes.
 * CI systems rely on these to detect failure modes.
 */
export const EXIT_CODES = {
  SUCCESS: 0,
  GENERIC: 1,
  BAD_ARGS: 2,
  DIR_CONFLICT: 3,
  NETWORK_ERROR: 4,
  INSTALL_FAILED: 5,
  CANCELLED: 130,
} as const;

/**
 * EVM chain IDs and endpoint URLs for each Hedera network.
 * Used when generating hardhat.config.ts in scaffolded projects.
 */
export const HEDERA_NETWORKS = {
  testnet: {
    chainId: 296,
    rpcUrl: "https://testnet.hashio.io/api",
    mirrorUrl: "https://testnet.mirrornode.hedera.com/api/v1",
  },
  mainnet: {
    chainId: 295,
    rpcUrl: "https://mainnet.hashio.io/api",
    mirrorUrl: "https://mainnet-public.mirrornode.hedera.com/api/v1",
  },
} as const;
