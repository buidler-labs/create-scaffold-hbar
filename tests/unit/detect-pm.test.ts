import { describe, it, expect } from "vitest";
import { detectPackageManager } from "../../src/utils/detect-pm";

describe("detectPackageManager", () => {
  it("always returns yarn", () => {
    expect(detectPackageManager()).toBe("yarn");
  });
});
