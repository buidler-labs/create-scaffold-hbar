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
}));


vi.mock("../../src/utils/template-capabilities", () => ({
  resolveTemplateCapabilities: vi.fn().mockResolvedValue({
    frontend: ["nextjs-app", "none"],
    solidityFramework: ["foundry", "hardhat", "none"],
    defaults: { frontend: "nextjs-app", solidityFramework: "foundry" },
  }),
}));

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
    packageManager: "yarn",
    install: true,
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
    delete process.env.HBAR_ACCEPT_DEFAULTS;
    delete process.env.HBAR_CI;
  });

  // ── Skipping prompts when value is pre-supplied ──────────────────────────

  it("skips project prompt when project is pre-supplied", async () => {
    const result = await promptForMissingOptions(makeRawOptions({ project: "my-app" }));
    expect(result.project).toBe("my-app");
    expect(mockText).not.toHaveBeenCalled();
  });

  it("skips template prompt when template is pre-supplied", async () => {
    const result = await promptForMissingOptions(makeRawOptions({ template: "payments-scheduler" }));
    expect(result.template).toBe("payments-scheduler");
  });

  it("skips frontend prompt when frontend is pre-supplied", async () => {
    const result = await promptForMissingOptions(makeRawOptions({ frontend: "nextjs-app" }));
    expect(result.frontend).toBe("nextjs-app");
  });

  it("skips solidityFramework prompt when pre-supplied", async () => {
    const result = await promptForMissingOptions(makeRawOptions({ solidityFramework: "hardhat" }));
    expect(result.solidityFramework).toBe("hardhat");
  });

  it("skips wallet prompt when wallet is pre-supplied", async () => {
    const result = await promptForMissingOptions(makeRawOptions({ wallet: ["rainbowkit"] }));
    expect(result.wallet).toEqual(["rainbowkit"]);
  });

  it("skips network prompt when network is pre-supplied", async () => {
    const result = await promptForMissingOptions(makeRawOptions({ network: "mainnet" }));
    expect(result.network).toBe("mainnet");
  });

  it("always uses yarn as package manager", async () => {
    const result = await promptForMissingOptions(makeRawOptions());
    expect(result.packageManager).toBe("yarn");
  });

  it("skips install prompt when install is false (--skip-install)", async () => {
    const result = await promptForMissingOptions(makeRawOptions({ install: false }));
    expect(result.install).toBe(false);
    expect(mockConfirm).not.toHaveBeenCalled();
  });

  // ── All prompts active (no flags supplied) ───────────────────────────────

  it("invokes interactive prompts when flags are not pre-supplied", async () => {
    await promptForMissingOptions(makeRawOptions());
    expect(mockText).toHaveBeenCalledTimes(1);
    expect(mockSelect).toHaveBeenCalled();
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
    mockMultiselect.mockResolvedValue(["rainbowkit"] as Wallet[]);
    const result = await promptForMissingOptions(makeRawOptions({ frontend: "nextjs-app" }));
    expect(result.wallet).toEqual(["rainbowkit"]);
    expect(mockMultiselect).toHaveBeenCalledTimes(1);
  });

  // ── Pass-through fields ──────────────────────────────────────────────────

  // ── onCancel exits with 130 ──────────────────────────────────────────────

  it("exits with CANCELLED code when a prompt returns cancel", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error(`process.exit(${EXIT_CODES.CANCELLED})`);
    });
    const clack = await import("@clack/prompts");
    const isCancelMock = clack.isCancel as unknown as ReturnType<typeof vi.fn>;
    isCancelMock.mockReturnValueOnce(true);
    mockText.mockResolvedValueOnce("__cancel__");

    try {
      await expect(promptForMissingOptions(makeRawOptions())).rejects.toThrow(`process.exit(${EXIT_CODES.CANCELLED})`);
      expect(mockCancel).toHaveBeenCalledWith("Scaffolding cancelled.");
      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.CANCELLED);
    } finally {
      isCancelMock.mockReset();
      isCancelMock.mockReturnValue(false);
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
      wallet: ["rainbowkit"],
      network: "mainnet",
      packageManager: "yarn",
      install: false,
    });

    const result = await promptForMissingOptions(raw);

    expect(result).toEqual({
      project: "full-project",
      template: "defi-swap",
      frontend: "nextjs-app",
      solidityFramework: "foundry",
      wallet: ["rainbowkit"],
      network: "mainnet",
      packageManager: "yarn",
      install: false,
    });

    expect(mockText).not.toHaveBeenCalled();
    expect(mockSelect).not.toHaveBeenCalled();
    expect(mockMultiselect).not.toHaveBeenCalled();
    expect(mockConfirm).not.toHaveBeenCalled();
  });
});
