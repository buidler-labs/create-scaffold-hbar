import { BRAND_COLORS } from "./consts";
import chalk from "chalk";

const LOG_LEVELS = ["error", "warn", "info", "verbose", "debug"] as const;
type LogLevel = (typeof LOG_LEVELS)[number];

export interface LoggerEnv {
  HBAR_LOG_LEVEL?: string;
  HBAR_CI?: string;
}

function levelIndex(level: string): number {
  const i = LOG_LEVELS.indexOf(level as LogLevel);
  return i >= 0 ? i : LOG_LEVELS.indexOf("info");
}

export function createLogger(env: LoggerEnv = {}) {
  const level = (env.HBAR_LOG_LEVEL ?? "info").toLowerCase();
  const ci = env.HBAR_CI === "1";
  const index = levelIndex(level);

  const shouldLog = (minLevel: LogLevel) => levelIndex(minLevel) <= index;

  const formatCi = (lvl: string, msg: string) => `${lvl.toUpperCase()}: ${msg}`;

  return {
    error(msg: string) {
      if (!shouldLog("error")) return;
      if (ci) {
        console.error(formatCi("error", msg));
      } else {
        console.error(chalk.hex(BRAND_COLORS.errorRed)(msg));
      }
    },
    warn(msg: string) {
      if (!shouldLog("warn")) return;
      if (ci) {
        console.log(formatCi("warn", msg));
      } else {
        console.log(chalk.hex(BRAND_COLORS.warningAmber)(msg));
      }
    },
    info(msg: string) {
      if (!shouldLog("info")) return;
      if (ci) {
        console.log(formatCi("info", msg));
      } else {
        console.log(chalk.hex(BRAND_COLORS.hederaTeal)(msg));
      }
    },
    verbose(msg: string) {
      if (!shouldLog("verbose")) return;
      if (ci) {
        console.log(formatCi("verbose", msg));
      } else {
        console.log(chalk.hex(BRAND_COLORS.textMuted)(msg));
      }
    },
    debug(msg: string) {
      if (!shouldLog("debug")) return;
      if (ci) {
        console.log(formatCi("debug", msg));
      } else {
        console.log(chalk.hex(BRAND_COLORS.textMuted)(msg));
      }
    },
  };
}
