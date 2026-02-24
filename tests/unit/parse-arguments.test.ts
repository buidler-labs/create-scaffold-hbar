import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { tmpdir } from "os";
import { EXIT_CODES, DEFAULT_OPTIONS } from "../../src/utils/consts";

// ─── Mock external I/O dependencies ──────────────────────────────────────────
// These must be hoisted before importing the module under test so vitest
// replaces them before the module is evaluated.

vi.mock("../../src/utils/external-extensions", () => ({
  validateExternalExtension: vi.fn().mockResolvedValue(null),
  getSolidityFrameworkDirsFromExternalExtension: vi.fn().mockResolvedValue([]),
}));

vi.mock("execa", () => ({
  execa: vi.fn(),
}));

vi.mock("@clack/prompts", () => ({
  confirm: vi.fn().mockResolvedValue(false),
  cancel: vi.fn(),
  isCancel: vi.fn().mockReturnValue(false),
}));

// Import the module under test AFTER mocks are set up
const { parseArgumentsIntoOptions, detectPackageManager } = await import(
  "../../src/utils/parse-arguments-into-options"
);

/** Wraps raw string args the same way process.argv works (node + script prefix). */
const args = (...flags: string[]) => ["node", "create-hbar", ...flags];

/** Captures process.exit calls without actually exiting. */
function mockProcessExit() {
  return vi.spyOn(process, "exit").mockImplementation((_code?: number | string) => {
    throw new Error(`process.exit(${_code})`);
  }) as unknown as ReturnType<typeof vi.spyOn>;
}

describe("parseArgumentsIntoOptions", () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    exitSpy = mockProcessExit();
    // Reset env vars that the parser writes
    delete process.env.HBAR_CI;
    delete process.env.HBAR_LOG_LEVEL;
  });

  afterEach(() => {
    exitSpy.mockRestore();
    vi.clearAllMocks();
  });

  describe("positional project-name", () => {
    it("sets project from positional arg", async () => {
      const { rawOptions } = await parseArgumentsIntoOptions(args("my-hedera-dapp"));
      expect(rawOptions.project).toBe("my-hedera-dapp");
    });

    it("leaves project null when no positional arg or destination flag", async () => {
      const { rawOptions } = await parseArgumentsIntoOptions(args());
      expect(rawOptions.project).toBeNull();
    });
  });

  describe("--destination / -d", () => {
    it("sets project from --destination flag", async () => {
      const { rawOptions } = await parseArgumentsIntoOptions(args("--destination", "my-dapp"));
      expect(rawOptions.project).toBe("my-dapp");
    });

    it("-d short alias works", async () => {
      const { rawOptions } = await parseArgumentsIntoOptions(args("-d", "short-dapp"));
      expect(rawOptions.project).toBe("short-dapp");
    });

    it("--destination takes precedence over positional arg", async () => {
      const { rawOptions } = await parseArgumentsIntoOptions(args("positional-name", "--destination", "flag-name"));
      expect(rawOptions.project).toBe("flag-name");
    });
  });

  describe("--template / -t", () => {
    it("sets template to a built-in key", async () => {
      const { rawOptions } = await parseArgumentsIntoOptions(args("--template", "hts-nft"));
      expect(rawOptions.template).toBe("hts-nft");
    });

    it("-t short alias works", async () => {
      const { rawOptions } = await parseArgumentsIntoOptions(args("-t", "hcs-dao"));
      expect(rawOptions.template).toBe("hcs-dao");
    });

    it("passes through community org/repo template without validation", async () => {
      const { rawOptions } = await parseArgumentsIntoOptions(args("--template", "my-org/my-template"));
      expect(rawOptions.template).toBe("my-org/my-template");
    });

    it("exits BAD_ARGS on unknown built-in template value", async () => {
      await expect(parseArgumentsIntoOptions(args("--template", "ethereum-nft"))).rejects.toThrow(
        `process.exit(${EXIT_CODES.BAD_ARGS})`,
      );
    });

    it("leaves template null when flag is omitted", async () => {
      const { rawOptions } = await parseArgumentsIntoOptions(args());
      expect(rawOptions.template).toBeNull();
    });
  });

  describe("--frontend / -f", () => {
    it("accepts nextjs-app", async () => {
      const { rawOptions } = await parseArgumentsIntoOptions(args("--frontend", "nextjs-app"));
      expect(rawOptions.frontend).toBe("nextjs-app");
    });

    it("accepts none", async () => {
      const { rawOptions } = await parseArgumentsIntoOptions(args("--frontend", "none"));
      expect(rawOptions.frontend).toBe("none");
    });

    it("exits BAD_ARGS on invalid frontend value", async () => {
      await expect(parseArgumentsIntoOptions(args("--frontend", "react-native"))).rejects.toThrow(
        `process.exit(${EXIT_CODES.BAD_ARGS})`,
      );
    });
  });

  describe("--solidity-framework / -s", () => {
    it("accepts foundry", async () => {
      const { rawOptions } = await parseArgumentsIntoOptions(args("-s", "foundry"));
      expect(rawOptions.solidityFramework).toBe("foundry");
    });

    it("accepts hardhat", async () => {
      const { rawOptions } = await parseArgumentsIntoOptions(args("-s", "hardhat"));
      expect(rawOptions.solidityFramework).toBe("hardhat");
    });

    it("accepts none", async () => {
      const { rawOptions } = await parseArgumentsIntoOptions(args("-s", "none"));
      expect(rawOptions.solidityFramework).toBe("none");
    });

    it("exits BAD_ARGS on invalid value", async () => {
      await expect(parseArgumentsIntoOptions(args("--solidity-framework", "truffle"))).rejects.toThrow(
        `process.exit(${EXIT_CODES.BAD_ARGS})`,
      );
    });
  });

  describe("--wallet / -w", () => {
    it("parses a single wallet value", async () => {
      const { rawOptions } = await parseArgumentsIntoOptions(args("--wallet", "walletconnect"));
      expect(rawOptions.wallet).toEqual(["walletconnect"]);
    });

    it("parses comma-separated wallet values", async () => {
      const { rawOptions } = await parseArgumentsIntoOptions(args("-w", "walletconnect,metamask"));
      expect(rawOptions.wallet).toEqual(["walletconnect", "metamask"]);
    });

    it("exits BAD_ARGS on invalid wallet value", async () => {
      await expect(parseArgumentsIntoOptions(args("--wallet", "hashconnect"))).rejects.toThrow(
        `process.exit(${EXIT_CODES.BAD_ARGS})`,
      );
    });
  });

  describe("--network", () => {
    it("accepts testnet", async () => {
      const { rawOptions } = await parseArgumentsIntoOptions(args("--network", "testnet"));
      expect(rawOptions.network).toBe("testnet");
    });

    it("accepts local", async () => {
      const { rawOptions } = await parseArgumentsIntoOptions(args("--network", "local"));
      expect(rawOptions.network).toBe("local");
    });

    it("exits BAD_ARGS on invalid network", async () => {
      await expect(parseArgumentsIntoOptions(args("--network", "ropsten"))).rejects.toThrow(
        `process.exit(${EXIT_CODES.BAD_ARGS})`,
      );
    });
  });

  describe("package manager flags", () => {
    it("--use-npm sets packageManager to npm", async () => {
      const { rawOptions } = await parseArgumentsIntoOptions(args("--use-npm"));
      expect(rawOptions.packageManager).toBe("npm");
    });

    it("-p / --use-pnpm sets packageManager to pnpm", async () => {
      const { rawOptions } = await parseArgumentsIntoOptions(args("-p"));
      expect(rawOptions.packageManager).toBe("pnpm");
    });

    it("--use-yarn sets packageManager to yarn", async () => {
      const { rawOptions } = await parseArgumentsIntoOptions(args("--use-yarn"));
      expect(rawOptions.packageManager).toBe("yarn");
    });

    it("--use-bun sets packageManager to bun", async () => {
      const { rawOptions } = await parseArgumentsIntoOptions(args("--use-bun"));
      expect(rawOptions.packageManager).toBe("bun");
    });

    it("exits BAD_ARGS when multiple PM flags are combined", async () => {
      await expect(parseArgumentsIntoOptions(args("--use-npm", "--use-pnpm"))).rejects.toThrow(
        `process.exit(${EXIT_CODES.BAD_ARGS})`,
      );
    });
  });

  describe("--skip-install", () => {
    it("sets install to false", async () => {
      const { rawOptions } = await parseArgumentsIntoOptions(args("--skip-install"));
      expect(rawOptions.install).toBe(false);
    });

    it("install defaults to true when flag is absent", async () => {
      const { rawOptions } = await parseArgumentsIntoOptions(args());
      expect(rawOptions.install).toBe(true);
    });
  });

  describe("--yes / -y", () => {
    it("applies all DEFAULT_OPTIONS when no other flags given", async () => {
      const { rawOptions } = await parseArgumentsIntoOptions(args("--yes"));
      expect(rawOptions.project).toBe(DEFAULT_OPTIONS.project);
      expect(rawOptions.template).toBe(DEFAULT_OPTIONS.template);
      expect(rawOptions.frontend).toBe(DEFAULT_OPTIONS.frontend);
      expect(rawOptions.network).toBe(DEFAULT_OPTIONS.network);
      expect(rawOptions.install).toBe(DEFAULT_OPTIONS.install);
    });

    it("explicit flags win over --yes defaults", async () => {
      const { rawOptions } = await parseArgumentsIntoOptions(
        args("--yes", "--template", "hts-nft", "--network", "mainnet"),
      );
      expect(rawOptions.template).toBe("hts-nft");
      expect(rawOptions.network).toBe("mainnet");
    });

    it("-y short alias works", async () => {
      const { rawOptions } = await parseArgumentsIntoOptions(args("-y"));
      expect(rawOptions.project).toBe(DEFAULT_OPTIONS.project);
    });
  });

  describe("--ci", () => {
    it("implies --yes: applies all defaults", async () => {
      const { rawOptions } = await parseArgumentsIntoOptions(args("--ci"));
      expect(rawOptions.project).toBe(DEFAULT_OPTIONS.project);
      expect(rawOptions.template).toBe(DEFAULT_OPTIONS.template);
      expect(rawOptions.network).toBe(DEFAULT_OPTIONS.network);
    });

    it("sets HBAR_CI env var to '1'", async () => {
      await parseArgumentsIntoOptions(args("--ci"));
      expect(process.env.HBAR_CI).toBe("1");
    });

    it("does not set HBAR_CI when --ci is absent", async () => {
      await parseArgumentsIntoOptions(args());
      expect(process.env.HBAR_CI).toBeUndefined();
    });
  });

  describe("--log-level", () => {
    it("defaults to info", async () => {
      await parseArgumentsIntoOptions(args());
      expect(process.env.HBAR_LOG_LEVEL).toBe("info");
    });

    it("accepts verbose", async () => {
      await parseArgumentsIntoOptions(args("--log-level", "verbose"));
      expect(process.env.HBAR_LOG_LEVEL).toBe("verbose");
    });

    it("exits BAD_ARGS on invalid log level", async () => {
      await expect(parseArgumentsIntoOptions(args("--log-level", "trace"))).rejects.toThrow(
        `process.exit(${EXIT_CODES.BAD_ARGS})`,
      );
    });
  });

  describe("solidityFrameworkChoices", () => {
    it("returns all three choices when no extension is given", async () => {
      const { solidityFrameworkChoices } = await parseArgumentsIntoOptions(args());
      expect(solidityFrameworkChoices).toHaveLength(3);
    });
  });
});

describe("detectPackageManager", () => {
  const originalAgent = process.env.npm_config_user_agent;

  afterEach(() => {
    if (originalAgent === undefined) {
      delete process.env.npm_config_user_agent;
    } else {
      process.env.npm_config_user_agent = originalAgent;
    }
  });

  it("returns pnpm when user agent starts with pnpm", () => {
    process.env.npm_config_user_agent = "pnpm/8.0.0 npm/? node/v20.0.0";
    expect(detectPackageManager()).toBe("pnpm");
  });

  it("returns yarn when user agent starts with yarn", () => {
    process.env.npm_config_user_agent = "yarn/3.5.0 npm/? node/v20.0.0";
    expect(detectPackageManager()).toBe("yarn");
  });

  it("returns bun when user agent starts with bun", () => {
    process.env.npm_config_user_agent = "bun/1.0.0 node/v20.0.0";
    expect(detectPackageManager()).toBe("bun");
  });

  it("returns npm when user agent starts with npm", () => {
    process.env.npm_config_user_agent = "npm/10.0.0 node/v20.0.0";
    expect(detectPackageManager()).toBe("npm");
  });

  it("falls back to npm when user agent is absent and no lockfiles", () => {
    delete process.env.npm_config_user_agent;
    // Run from a temp directory that contains no lockfiles so the
    // existsSync lockfile probes all return false.
    const originalCwd = process.cwd();
    const tmpDir = tmpdir();
    process.chdir(tmpDir);
    try {
      expect(detectPackageManager()).toBe("npm");
    } finally {
      process.chdir(originalCwd);
    }
  });
});
