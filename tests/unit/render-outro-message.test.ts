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

  it("uses npm commands when npm package manager is selected", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    renderOutroMessage(baseOptions({ packageManager: "npm" }));
    const text = log.mock.calls.map(c => c.join("")).join("\n");
    expect(text).toContain("npm run chain");
    expect(text).toContain("npm run deploy -- --network"); // Should have -- separator for args
    expect(text).not.toContain("yarn chain");
  });

  it("shows npm install instructions when install is skipped", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    renderOutroMessage(baseOptions({ install: false, packageManager: "npm" }));
    const text = log.mock.calls.map(c => c.join("")).join("\n");
    expect(text).toContain("npm install --legacy-peer-deps && npm run format");
    expect(text).not.toContain("yarn install");
  });
});
