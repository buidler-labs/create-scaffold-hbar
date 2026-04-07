import { describe, it, expect, vi, afterEach } from "vitest";
import { expandOutroPlaceholders, renderOutroMessage } from "../../src/utils/render-outro-message";
import type { Options } from "../../src/types";
import { SOLIDITY_FRAMEWORKS } from "../../src/utils/consts";

function baseOptions(overrides: Partial<Options> = {}): Options {
  return {
    project: "my-app",
    install: true,
    solidityFramework: SOLIDITY_FRAMEWORKS.FOUNDRY,
    template: "blank",
    frontend: "nextjs-app",
    wallet: ["rainbowkit"],
    network: "testnet",
    packageManager: "yarn",
    ...overrides,
  };
}

describe("expandOutroPlaceholders", () => {
  const run = (s: string) => (s === "start" ? "yarn start" : `yarn ${s}`);

  it("replaces {run:script} tokens", () => {
    expect(expandOutroPlaceholders("Run {run:start} now", run)).toBe("Run yarn start now");
  });

  it("supports multiple placeholders", () => {
    expect(expandOutroPlaceholders("{run:chain} then {run:deploy}", run)).toBe("yarn chain then yarn deploy");
  });
});

describe("renderOutroMessage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses default Foundry outro when outroSteps is absent", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    renderOutroMessage(baseOptions());
    const text = log.mock.calls.map(c => c.join("")).join("\n");
    expect(text).toContain("Run locally:");
    expect(text).toContain("Deploy to Hedera testnet:");
  });

  it("renders template outro steps instead of default body", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    renderOutroMessage(
      baseOptions({
        outroSteps: ["+Start the frontend: {run:start}"],
        solidityFramework: null,
      }),
    );
    const text = log.mock.calls.map(c => c.join("")).join("\n");
    expect(text).not.toContain("Run locally:");
    expect(text).toContain("yarn start");
    expect(text).toContain("Congratulations!");
    expect(text).toContain("Thanks for using Scaffold-HBAR");
  });
});
