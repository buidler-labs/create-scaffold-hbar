import { describe, it, expect, beforeEach, vi } from "vitest";
import { EXIT_CODES } from "../../src/utils/consts";

vi.mock("@clack/prompts", () => ({
  log: {
    error: vi.fn(),
    info: vi.fn(),
  },
}));

import * as p from "@clack/prompts";
import {
  HbarError,
  ValidationError,
  DirectoryConflictError,
  NetworkError,
  InstallError,
  printError,
} from "../../src/utils/errors";

describe("HbarError", () => {
  it("sets exitCode and hint", () => {
    const err = new HbarError("oops", 42, "try again");
    expect(err.message).toBe("oops");
    expect(err.exitCode).toBe(42);
    expect(err.hint).toBe("try again");
    expect(err.name).toBe("HbarError");
  });

  it("allows hint to be omitted", () => {
    const err = new HbarError("oops", 1);
    expect(err.hint).toBeUndefined();
  });
});

describe("HbarError subclasses", () => {
  it("ValidationError has exitCode 2 and correct name", () => {
    const err = new ValidationError("invalid input");
    expect(err.exitCode).toBe(EXIT_CODES.BAD_ARGS);
    expect(err.name).toBe("ValidationError");
  });

  it("DirectoryConflictError has exitCode 3 and correct name", () => {
    const err = new DirectoryConflictError("dir exists");
    expect(err.exitCode).toBe(EXIT_CODES.DIR_CONFLICT);
    expect(err.name).toBe("DirectoryConflictError");
  });

  it("NetworkError has exitCode 4 and correct name", () => {
    const err = new NetworkError("fetch failed");
    expect(err.exitCode).toBe(EXIT_CODES.NETWORK_ERROR);
    expect(err.name).toBe("NetworkError");
  });

  it("InstallError has exitCode 5 and correct name", () => {
    const err = new InstallError("install failed");
    expect(err.exitCode).toBe(EXIT_CODES.INSTALL_FAILED);
    expect(err.name).toBe("InstallError");
  });

  it("InstallError accepts cause and hint", () => {
    const cause = new Error("original");
    const err = new InstallError("wrapped", cause, "run yarn install");
    expect(err.cause).toBe(cause);
    expect(err.hint).toBe("run yarn install");
  });
});

describe("printError", () => {
  beforeEach(() => {
    vi.mocked(p.log.error).mockClear();
    vi.mocked(p.log.info).mockClear();
  });

  it("calls p.log.error with the message", () => {
    printError("Something broke");
    expect(p.log.error).toHaveBeenCalledWith("Something broke");
  });

  it("calls p.log.info with hint when provided", () => {
    printError("Failed", "Run with --help");
    expect(p.log.error).toHaveBeenCalledWith("Failed");
    expect(p.log.info).toHaveBeenCalledWith("Run with --help");
  });

  it("does not call p.log.info when hint is omitted", () => {
    printError("Failed");
    expect(p.log.info).not.toHaveBeenCalled();
  });
});
