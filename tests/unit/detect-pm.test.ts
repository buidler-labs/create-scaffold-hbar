import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { detectPackageManager, isValidPackageManager } from "../../src/utils/detect-pm";
import fs from "fs";

vi.mock("fs");
vi.mock("path", () => ({
  default: {
    join: (...args: string[]) => args.join("/"),
  },
}));

describe("detectPackageManager", () => {
  const mockedFs = vi.mocked(fs);
  const originalCwd = process.cwd.bind(process);

  beforeEach(() => {
    process.cwd = () => "/test/project";
    mockedFs.existsSync.mockClear();
  });

  afterEach(() => {
    process.cwd = originalCwd;
  });

  it("returns yarn when yarn.lock exists", () => {
    mockedFs.existsSync.mockImplementation((filepath: fs.PathLike) => {
      return filepath.toString().endsWith("yarn.lock");
    });
    expect(detectPackageManager()).toBe("yarn");
  });

  it("returns npm when package-lock.json exists", () => {
    mockedFs.existsSync.mockImplementation((filepath: fs.PathLike) => {
      return filepath.toString().endsWith("package-lock.json");
    });
    expect(detectPackageManager()).toBe("npm");
  });

  it("returns yarn when no lockfile exists (default)", () => {
    mockedFs.existsSync.mockReturnValue(false);
    expect(detectPackageManager()).toBe("yarn");
  });

  it("prefers yarn.lock over package-lock.json when both exist", () => {
    mockedFs.existsSync.mockImplementation((filepath: fs.PathLike) => {
      const str = filepath.toString();
      return str.endsWith("yarn.lock") || str.endsWith("package-lock.json");
    });
    // yarn is checked first, so it should return yarn
    expect(detectPackageManager()).toBe("yarn");
  });
});

describe("isValidPackageManager", () => {
  it("returns true for 'yarn'", () => {
    expect(isValidPackageManager("yarn")).toBe(true);
  });

  it("returns true for 'npm'", () => {
    expect(isValidPackageManager("npm")).toBe(true);
  });

  it("returns true for 'none'", () => {
    expect(isValidPackageManager("none")).toBe(true);
  });

  it("returns false for invalid package managers", () => {
    expect(isValidPackageManager("pnpm")).toBe(false);
    expect(isValidPackageManager("bun")).toBe(false);
    expect(isValidPackageManager("")).toBe(false);
  });
});
