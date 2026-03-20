import { z } from "zod";

export type Args = string[];

/** Supported package managers for the generated project. */
export type PackageManager = "npm" | "pnpm" | "yarn";

/** Hedera network targets. */
export type Network = "testnet" | "mainnet";

/** Built-in starter templates. Also accepts `"org/repo"` strings for community templates. */
export type Template = "blank" | "hts-fungible" | "hts-nft" | "hcs-dao" | "defi-swap";

/** Frontend framework. "none" = contracts only (Hardhat or Foundry). */
export type Frontend = "nextjs-app" | "none";

/**
 * Solidity / contract framework choices.
 */
export type SolidityFramework = "hardhat" | "foundry";

/** Wallet connector (WalletConnect only). */
export type Wallet = "rainbowkit";

const EnvVarSchema = z.object({
  /** Environment variable key, e.g. HEDERA_ACCOUNT_ID */
  key: z.string().min(1),
  /** Human-readable description written as a comment in .env.example */
  description: z.string(),
});

const RenameEntrySchema = z.object({
  /**
   * Replacement string. Use `{{projectName}}` as a placeholder for the
   * user-supplied project name.
   */
  to: z.string().min(1),
  /** Relative paths (from the project root) to run the replacement across. */
  paths: z.array(z.string().min(1)).min(1),
});

const TemplateCapabilitiesSchema = z.object({
  /** Allowed frontend options for this template. */
  frontend: z.array(z.enum(["nextjs-app", "none"])).optional(),
  /** Allowed solidity framework options for this template. */
  solidityFramework: z.array(z.enum(["hardhat", "foundry", "none"])).optional(),
});

const TemplateDefaultsSchema = z.object({
  frontend: z.enum(["nextjs-app", "none"]).optional(),
  solidityFramework: z.enum(["hardhat", "foundry", "none"]).optional(),
});

/**
 * Zod schema for `template.json` manifests shipped with each starter template.
 * Validated at runtime after the template is downloaded/copied.
 */
export const TemplateManifestSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  version: z.string().optional(),
  "create-hbar": z
    .object({
      /**
       * Token replacement map.
       * Keys are placeholder strings in template files; values describe what
       * to replace them with and which paths to scan.
       */
      rename: z.record(z.string(), RenameEntrySchema).optional(),
      /**
       * Post-scaffold instructions printed in the outro.
       * Lines starting with `+` are rendered bold.
       * `{pm}` is replaced with the detected package manager name.
       */
      instructions: z.array(z.string()).optional(),
      /**
       * Minimum version requirements for external tools.
       * Keys are tool names (e.g. `node`, `hedera-local-node`),
       * values are semver ranges (e.g. `>=18.0.0`).
       */
      requirements: z.record(z.string(), z.string()).optional(),
      /** Environment variables written into `.env.example`. */
      envVars: z.array(EnvVarSchema).optional(),
      /** Template-specific prompt constraints used by the CLI. */
      capabilities: TemplateCapabilitiesSchema.optional(),
      /** Template-specific default values used when multiple options exist. */
      defaults: TemplateDefaultsSchema.optional(),
    })
    .optional(),
});

/** Inferred TypeScript type from TemplateManifestSchema. */
export type TemplateManifest = z.infer<typeof TemplateManifestSchema>;

type BaseOptions = {
  /** Output project directory name. */
  project: string | null;
  /** Run `npm/pnpm/yarn install` after scaffolding. */
  install: boolean;
  /** Solidity / contract framework. `"none"` means contracts-only with no framework. */
  solidityFramework: SolidityFramework | "none" | null;
  /** Starter template key or `"org/repo"` community template path. */
  template: (Template | (string & {})) | null;
  /** Frontend framework (Next.js). */
  frontend: Frontend | null;
  /** Selected wallet connector(s). */
  wallet: Wallet[] | null;
  /** Target Hedera network. */
  network: Network | null;
  /** Package manager to use in the generated project. */
  packageManager: PackageManager | null;
};

/** Raw options after flag parsing, before interactive prompts fill in nulls. */
export type RawOptions = BaseOptions & {
  /** `--help` flag — print help text and exit. */
  help: boolean;
};

/**
 * Fully resolved options after all prompts have been answered.
 * All nullable fields are guaranteed non-null except `solidityFramework`
 * (which can legitimately be null for "none").
 */
export type Options = {
  [Prop in keyof Omit<
    BaseOptions,
    "solidityFramework" | "template" | "frontend" | "wallet" | "network" | "packageManager"
  >]: NonNullable<BaseOptions[Prop]>;
} & {
  solidityFramework: SolidityFramework | null;
  template: Template | (string & {});
  frontend: Frontend;
  wallet: Wallet[];
  network: Network;
  packageManager: PackageManager;
};

/** Describes a single `.template.` file found during template processing. */
export type TemplateDescriptor = {
  path: string;
  fileUrl: string;
  relativePath: string;
  source: string;
};

/** Solidity framework choices for the prompt (fixed list). */
export type SolidityFrameworkChoices = (SolidityFramework | "none" | { value: null; name: string })[];
