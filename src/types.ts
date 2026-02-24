import { z } from "zod";

export type Args = string[];

/** Supported package managers for the generated project. */
export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

/** Hedera network targets. */
export type Network = "testnet" | "mainnet" | "local";

/** Built-in starter templates. Also accepts `"org/repo"` strings for community templates. */
export type Template = "blank" | "hts-fungible" | "hts-nft" | "hcs-dao" | "defi-swap";

/** Frontend framework choices for the generated project. */
export type Frontend = "nextjs-app" | "nextjs-pages" | "vite-react" | "none";

/**
 * Solidity / contract framework choices.
 */
export type SolidityFramework = "hardhat" | "foundry";

/** Wallet connector choices for the generated frontend. */
export type Wallet = "walletconnect" | "metamask";

/** Dev-mode extension name (a local directory name under externalExtensions/). */
export type ExternalExtensionNameDev = string;

/** A resolved external extension reference. */
export type ExternalExtension = {
  repository: string;
  branch?: string | null;
  /** Minimum create-hbar version required by this extension. */
  createHbarVersion?: string;
  /**
   * @deprecated Use createHbarVersion. Retained for backward compatibility
   * with scaffold-eth community extensions that still set createEthVersion.
   */
  createEthVersion?: string;
};

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
    })
    .optional(),
});

/** Inferred TypeScript type from TemplateManifestSchema. */
export type TemplateManifest = z.infer<typeof TemplateManifestSchema>;

type BaseOptions = {
  /** Output project directory name. */
  project: string | null;
  /** Run `npm/pnpm/yarn/bun install` after scaffolding. */
  install: boolean;
  /** Dev mode — uses symlinks instead of file copies for local template work. */
  dev: boolean;
  /** Community extension (-e flag). */
  externalExtension: ExternalExtension | ExternalExtensionNameDev | null;
  /** Solidity / contract framework. `"none"` means contracts-only with no framework. */
  solidityFramework: SolidityFramework | "none" | null;
  /** Starter template key or `"org/repo"` community template path. */
  template: (Template | (string & {})) | null;
  /** Frontend framework. `"none"` hides wallet prompts and produces a contracts-only scaffold. */
  frontend: Frontend | null;
  /** Selected wallet connector(s). Empty array is valid when frontend is `"none"`. */
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
 * All nullable fields are guaranteed non-null except `externalExtension`
 * and `solidityFramework` (which can legitimately be null/none).
 */
export type Options = {
  [Prop in keyof Omit<
    BaseOptions,
    "externalExtension" | "solidityFramework" | "template" | "frontend" | "wallet" | "network" | "packageManager"
  >]: NonNullable<BaseOptions[Prop]>;
} & {
  externalExtension: RawOptions["externalExtension"];
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

/**
 * The list of solidity framework options surfaced to the user.
 * Extensions can narrow this list to only the frameworks they support.
 */
export type SolidityFrameworkChoices = (SolidityFramework | { value: any; name: string })[];
