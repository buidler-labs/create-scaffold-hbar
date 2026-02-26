import { describe, it, expect, afterEach } from "vitest";
import { tmpdir } from "os";
import { detectPackageManager } from "../../src/utils/detect-pm";

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
    const originalCwd = process.cwd();
    process.chdir(tmpdir());
    try {
      expect(detectPackageManager()).toBe("npm");
    } finally {
      process.chdir(originalCwd);
    }
  });
});
