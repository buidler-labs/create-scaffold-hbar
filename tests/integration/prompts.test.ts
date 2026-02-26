import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DEFAULT_OPTIONS, EXIT_CODES } from "../../src/utils/consts";
import type { RawOptions, Wallet } from "../../src/types";

// ─── Mock @clack/prompts ─────────────────────────────────────────────────────
// Track which prompts were actually invoked so we can assert that pre-supplied
// options correctly skip their corresponding prompt.

const mockText = vi.fn();
const mockSelect = vi.fn();
const mockMultiselect = vi.fn();
const mockConfirm = vi.fn();
const mockCancel = vi.fn();
const mockGroup = vi.fn();

vi.mock("@clack/prompts", () => ({
  text: (...args: unknown[]): unknown => mockText(...args),
  select: (...args: unknown[]): unknown => mockSelect(...args),
  multiselect: (...args: unknown[]): unknown => mockMultiselect(...args),
  confirm: (...args: unknown[]): unknown => mockConfirm(...args),
  cancel: (...args: unknown[]): unknown => mockCancel(...args),
  isCancel: vi.fn().mockReturnValue(false),
  intro: vi.fn(),
  outro: vi.fn(),
  log: { info: vi.fn(), success: vi.fn(), warn: vi.fn(), error: vi.fn(), message: vi.fn(), step: vi.fn() },
  group: async (prompts: Record<string, (...a: unknown[]) => unknown>, opts?: { onCancel?: () => void }) => {
    mockGroup(prompts, opts);
    const results: Record<string, unknown> = {};
    for (const [key, fn] of Object.entries(prompts)) {
      results[key] = await fn({ results });
    }
    return results;
  },
}));

// ─── Mock detect package manager (avoid filesystem probe during tests) ───────
vi.mock("../../src/utils/parse-arguments-into-options", async importOriginal => {
  const actual: Record<string, unknown> = await importOriginal();
  return {
    ...actual,
    detectPackageManager: vi.fn().mockReturnValue("npm"),
  };
});

// ─── Import the function under test AFTER mocks are registered ───────────────
import { promptForMissingOptions } from "../../src/utils/prompt-for-missing-options";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRawOptions(overrides: Partial<RawOptions> = {}): RawOptions {
  return {
    project: null,
    template: null,
    frontend: null,
    solidityFramework: null,
    wallet: null,
    network: null,
    packageManager: null,
    install: true,
    dev: false,
    externalExtension: null,
    help: false,
    ...overrides,
  };
}

describe("promptForMissingOptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock return values simulate user accepting defaults
    mockText.mockResolvedValue(DEFAULT_OPTIONS.project);
    mockSelect.mockImplementation((opts: { initialValue?: unknown }) => Promise.resolve(opts.initialValue));
    mockMultiselect.mockImplementation((opts: { initialValues?: unknown[] }) =>
      Promise.resolve(opts.initialValues ?? []),
    );
    mockConfirm.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Skipping prompts when value is pre-supplied ──────────────────────────

  it("skips project prompt when project is pre-supplied", async () => {
    const result = await promptForMissingOptions(makeRawOptions({ project: "my-app" }));
    expect(result.project).toBe("my-app");
    expect(mockText).not.toHaveBeenCalled();
  });

  it("skips template prompt when template is pre-supplied", async () => {
    const result = await promptForMissingOptions(makeRawOptions({ template: "hts-nft" }));
    expect(result.template).toBe("hts-nft");
  });

  it("skips frontend prompt when frontend is pre-supplied", async () => {
    const result = await promptForMissingOptions(makeRawOptions({ frontend: "vite-react" }));
    expect(result.frontend).toBe("vite-react");
  });

  it("skips solidityFramework prompt when pre-supplied", async () => {
    const result = await promptForMissingOptions(makeRawOptions({ solidityFramework: "hardhat" }));
    expect(result.solidityFramework).toBe("hardhat");
  });

  it("skips wallet prompt when wallet is pre-supplied", async () => {
    const result = await promptForMissingOptions(makeRawOptions({ wallet: ["walletconnect"] }));
    expect(result.wallet).toEqual(["walletconnect"]);
  });

  it("skips network prompt when network is pre-supplied", async () => {
    const result = await promptForMissingOptions(makeRawOptions({ network: "mainnet" }));
    expect(result.network).toBe("mainnet");
  });

  it("skips packageManager prompt when pre-supplied", async () => {
    const result = await promptForMissingOptions(makeRawOptions({ packageManager: "pnpm" }));
    expect(result.packageManager).toBe("pnpm");
  });

  it("skips install prompt when install is false (--skip-install)", async () => {
    const result = await promptForMissingOptions(makeRawOptions({ install: false }));
    expect(result.install).toBe(false);
    expect(mockConfirm).not.toHaveBeenCalled();
  });

  // ── All prompts active (no flags supplied) ───────────────────────────────

  it("calls p.group when no flags are pre-supplied", async () => {
    await promptForMissingOptions(makeRawOptions());
    expect(mockGroup).toHaveBeenCalledTimes(1);
  });

  it("invokes text prompt for project name when not supplied", async () => {
    mockText.mockResolvedValue("user-typed-name");
    const result = await promptForMissingOptions(makeRawOptions());
    expect(mockText).toHaveBeenCalledTimes(1);
    expect(result.project).toBe("user-typed-name");
  });

  it("invokes select for template when not supplied", async () => {
    mockSelect.mockResolvedValue("hcs-dao");
    const result = await promptForMissingOptions(makeRawOptions());
    expect(result.template).toBe("hcs-dao");
  });

  // ── Solidity framework "none" resolves to null ───────────────────────────

  it('maps solidityFramework "none" to null in resolved options', async () => {
    const result = await promptForMissingOptions(makeRawOptions({ solidityFramework: "none" }));
    expect(result.solidityFramework).toBeNull();
  });

  it("keeps solidityFramework value when not none", async () => {
    const result = await promptForMissingOptions(makeRawOptions({ solidityFramework: "foundry" }));
    expect(result.solidityFramework).toBe("foundry");
  });

  it("prompts for wallet when not pre-supplied", async () => {
    mockMultiselect.mockResolvedValue(["walletconnect"] as Wallet[]);
    const result = await promptForMissingOptions(makeRawOptions({ frontend: "nextjs-app" }));
    expect(result.wallet).toEqual(["walletconnect"]);
    expect(mockMultiselect).toHaveBeenCalledTimes(1);
  });

  // ── Pass-through fields ──────────────────────────────────────────────────

  it("preserves dev flag", async () => {
    const result = await promptForMissingOptions(makeRawOptions({ dev: true }));
    expect(result.dev).toBe(true);
  });

  it("preserves externalExtension", async () => {
    const ext = { repository: "https://github.com/org/ext" };
    const result = await promptForMissingOptions(makeRawOptions({ externalExtension: ext }));
    expect(result.externalExtension).toBe(ext);
  });

  // ── onCancel exits with 130 ──────────────────────────────────────────────

  it("exits with CANCELLED code when onCancel fires", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error(`process.exit(${EXIT_CODES.CANCELLED})`);
    });

    // Override group to immediately call onCancel
    mockGroup.mockImplementationOnce((_prompts: unknown, opts: { onCancel?: () => void } | undefined) => {
      opts?.onCancel?.();
    });

    // Re-mock group so our custom implementation is used
    const clack = await import("@clack/prompts");
    const originalGroup = clack.group;
    (clack as Record<string, unknown>).group = mockGroup;

    try {
      await expect(promptForMissingOptions(makeRawOptions())).rejects.toThrow(`process.exit(${EXIT_CODES.CANCELLED})`);
      expect(mockCancel).toHaveBeenCalledWith("Scaffolding cancelled.");
      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.CANCELLED);
    } finally {
      (clack as Record<string, unknown>).group = originalGroup;
      exitSpy.mockRestore();
    }
  });

  // ── Full options flow: all flags pre-supplied ────────────────────────────

  it("skips all prompts and returns correct options when fully pre-supplied", async () => {
    const raw = makeRawOptions({
      project: "full-project",
      template: "defi-swap",
      frontend: "nextjs-app",
      solidityFramework: "foundry",
      wallet: ["walletconnect"],
      network: "mainnet",
      packageManager: "bun",
      install: false,
      dev: true,
    });

    const result = await promptForMissingOptions(raw);

    expect(result).toEqual({
      project: "full-project",
      template: "defi-swap",
      frontend: "nextjs-app",
      solidityFramework: "foundry",
      wallet: ["walletconnect"],
      network: "mainnet",
      packageManager: "bun",
      install: false,
      dev: true,
      externalExtension: null,
    });

    expect(mockText).not.toHaveBeenCalled();
    expect(mockSelect).not.toHaveBeenCalled();
    expect(mockMultiselect).not.toHaveBeenCalled();
    expect(mockConfirm).not.toHaveBeenCalled();
  });
});
