import { describe, it, expect, afterEach } from "vitest";
import { tmpdir } from "os";
import path from "path";
import fs from "fs";
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

  it("returns npm when user agent starts with npm", () => {
    process.env.npm_config_user_agent = "npm/10.0.0 node/v20.0.0";
    expect(detectPackageManager()).toBe("npm");
  });

  it("falls back to npm when user agent is absent and no lockfiles", () => {
    delete process.env.npm_config_user_agent;
    const originalCwd = process.cwd();
    const isolatedTmpDir = fs.mkdtempSync(path.join(tmpdir(), "detect-pm-"));
    process.chdir(isolatedTmpDir);
    try {
      expect(detectPackageManager()).toBe("npm");
    } finally {
      process.chdir(originalCwd);
      fs.rmSync(isolatedTmpDir, { recursive: true, force: true });
    }
  });
});
