/** Repo (owner/repo) used to fetch available template branches. Branches must match prefix. */
export const TEMPLATE_REPO = "buidler-labs/scaffold-hbar";
/** Branch name prefix for template branches, e.g. "templates/blank-template", "templates/hts-nft". */
export const TEMPLATE_BRANCH_PREFIX = "templates/";

/**
 * String constants for the two supported solidity frameworks.
 * Used throughout copy-template and validation logic.
 */
export const SOLIDITY_FRAMEWORKS = {
  HARDHAT: "hardhat",
  FOUNDRY: "foundry",
} as const;

/** Starter template options shown in the interactive select prompt (used when dynamic fetch fails). */
export const TEMPLATES = [
  { value: "blank", label: "Blank Starter", hint: "minimal setup, no example contracts" },
] as const;

/** Fallback when fetching template branches fails (e.g. offline). Same shape as TEMPLATES. */
export const TEMPLATES_FALLBACK = TEMPLATES;

/**
 * Local fallback capabilities for well-known templates.
 * Used when template manifest metadata can't be fetched.
 */
export const TEMPLATE_CAPABILITIES_FALLBACK: Record<
  string,
  {
    frontend?: Array<"nextjs-app" | "none">;
    solidityFramework?: Array<"foundry" | "hardhat" | "none">;
    defaults?: {
      frontend?: "nextjs-app" | "none";
      solidityFramework?: "foundry" | "hardhat" | "none";
    };
  }
> = {
  blank: {
    frontend: ["nextjs-app"],
    solidityFramework: ["foundry", "hardhat"],
    defaults: { frontend: "nextjs-app", solidityFramework: "foundry" },
  },
  "payments-scheduler": {
    frontend: ["nextjs-app"],
    solidityFramework: ["foundry"],
    defaults: { frontend: "nextjs-app", solidityFramework: "foundry" },
  },
  "hedera-demo": {
    frontend: ["nextjs-app"],
    solidityFramework: ["none"],
    defaults: { frontend: "nextjs-app", solidityFramework: "none" },
  },
};

/** Frontend framework options. */
export const FRONTENDS = [
  { value: "nextjs-app", label: "Next.js (App Router)" },
  { value: "none", label: "None (contracts only)" },
] as const;

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
  { value: "rainbowkit", label: "Rainbowkit with burner wallet", hint: "via @rainbow-me/rainbowkit" },
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
  wallet: ["rainbowkit"],
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
