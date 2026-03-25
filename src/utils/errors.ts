import * as p from "@clack/prompts";
import { EXIT_CODES } from "./consts";

export class HbarError extends Error {
  constructor(
    message: string,
    public readonly exitCode: number,
    public readonly hint?: string,
  ) {
    super(message);
    this.name = "HbarError";
  }
}

export class ValidationError extends HbarError {
  constructor(message: string) {
    super(message, EXIT_CODES.BAD_ARGS);
    this.name = "ValidationError";
  }
}

export class DirectoryConflictError extends HbarError {
  constructor(message: string) {
    super(message, EXIT_CODES.DIR_CONFLICT);
    this.name = "DirectoryConflictError";
  }
}

export class NetworkError extends HbarError {
  constructor(message: string) {
    super(message, EXIT_CODES.NETWORK_ERROR);
    this.name = "NetworkError";
  }
}

export class InstallError extends HbarError {
  declare cause?: Error;

  constructor(message: string, cause?: unknown, hint?: string) {
    super(message, EXIT_CODES.INSTALL_FAILED, hint);
    this.name = "InstallError";
    if (cause instanceof Error) {
      this.cause = cause;
    }
  }
}

export function printError(message: string, hint?: string): void {
  p.log.error(message);
  if (hint) {
    p.log.info(hint);
  }
}
