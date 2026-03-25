import * as p from "@clack/prompts";
import chalk from "chalk";
import figlet from "figlet";
import { BRAND_COLORS } from "./consts";

const COMPACT_TITLE = chalk.hex(BRAND_COLORS.hederaTeal).bold(" create-hbar ");

export function renderIntroMessage() {
  const columns = process.stdout.columns ?? 80;

  if (columns < 100) {
    p.intro(COMPACT_TITLE);
    return;
  }

  const banner = figlet.textSync("create-hbar", { font: "Small" });
  const coloredBanner = chalk.hex(BRAND_COLORS.hederaTeal)(banner);
  console.log(coloredBanner);
  p.intro(COMPACT_TITLE);
}
