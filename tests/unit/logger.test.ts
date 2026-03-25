import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createLogger } from "../../src/utils/logger";

describe("createLogger", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  describe("level gating", () => {
    it("logs error when level is error", () => {
      const logger = createLogger({ HBAR_LOG_LEVEL: "error", HBAR_CI: "0" });
      logger.error("e");
      expect(errorSpy).toHaveBeenCalledTimes(1);
      logger.warn("w");
      logger.info("i");
      logger.verbose("v");
      logger.debug("d");
      expect(logSpy).not.toHaveBeenCalled();
    });

    it("logs error and warn when level is warn", () => {
      const logger = createLogger({ HBAR_LOG_LEVEL: "warn", HBAR_CI: "0" });
      logger.error("e");
      logger.warn("w");
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(logSpy).toHaveBeenCalledTimes(1);
      logger.info("i");
      logger.verbose("v");
      logger.debug("d");
      expect(logSpy).toHaveBeenCalledTimes(1);
    });

    it("logs info when level is info", () => {
      const logger = createLogger({ HBAR_LOG_LEVEL: "info", HBAR_CI: "0" });
      logger.info("hello");
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("hello"));
    });

    it("does not log debug when level is info", () => {
      const logger = createLogger({ HBAR_LOG_LEVEL: "info", HBAR_CI: "0" });
      logger.debug("secret");
      expect(logSpy).not.toHaveBeenCalled();
    });

    it("logs verbose and debug when level is debug", () => {
      const logger = createLogger({ HBAR_LOG_LEVEL: "debug", HBAR_CI: "0" });
      logger.verbose("v");
      logger.debug("d");
      expect(logSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe("CI mode", () => {
    it("produces plain LEVEL: message with no ANSI escape codes", () => {
      const logger = createLogger({ HBAR_LOG_LEVEL: "debug", HBAR_CI: "1" });
      logger.error("something went wrong");
      logger.info("ok");
      expect(errorSpy).toHaveBeenCalledWith("ERROR: something went wrong");
      expect(logSpy).toHaveBeenCalledWith("INFO: ok");
      const allOutput = [errorSpy.mock.calls[0][0], logSpy.mock.calls[0][0]].join("");
      const ansiEscape = "\u001b[";
      expect(allOutput).not.toContain(ansiEscape);
    });
  });

  describe("normal mode", () => {
    it("produces output with message and does not use CI LEVEL: format", () => {
      const logger = createLogger({ HBAR_LOG_LEVEL: "info", HBAR_CI: "0" });
      logger.info("teal message");
      const out = logSpy.mock.calls[0][0];
      expect(out).toContain("teal message");
      expect(out).not.toMatch(/^INFO: /);
    });

    it("error level uses stderr", () => {
      const logger = createLogger({ HBAR_LOG_LEVEL: "error", HBAR_CI: "0" });
      logger.error("fail");
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(logSpy).not.toHaveBeenCalled();
    });
  });
});
