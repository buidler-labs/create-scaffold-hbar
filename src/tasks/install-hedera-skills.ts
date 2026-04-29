import path from "path";
import { DefaultRenderer, ListrTaskWrapper, SimpleRenderer } from "listr2";
import { execa } from "execa";
import chalk from "chalk";
import { HEDERA_SKILLS_ADD_NONINTERACTIVE_ARGS, HEDERA_SKILLS_MARKETPLACE_SPEC } from "../utils/consts";

/**
 * Runs `npx skills add` for {@link HEDERA_SKILLS_MARKETPLACE_SPEC} in the project root.
 * Failures are non-fatal: the scaffolded app is still usable without marketplace skills.
 */
export async function installHederaSkillsMarketplace(
  targetDir: string,
  task: ListrTaskWrapper<any, typeof DefaultRenderer, typeof SimpleRenderer>,
): Promise<void> {
  const subprocess = execa(
    "npx",
    ["--yes", "skills", "add", HEDERA_SKILLS_MARKETPLACE_SPEC, ...HEDERA_SKILLS_ADD_NONINTERACTIVE_ARGS],
    {
      cwd: targetDir,
      reject: false,
      // Do not force CI=1: skills uses multiselect when not given -y/--all; keep user's CI if set.
      env: { ...process.env, FORCE_COLOR: "0" },
    },
  );

  let outputBuffer = "";
  const chunkSize = 1024;

  const pushOutput = (data: Buffer) => {
    outputBuffer += data.toString();
    if (outputBuffer.length > chunkSize) {
      outputBuffer = outputBuffer.slice(-chunkSize);
    }
    task.output = outputBuffer.trimEnd();
  };

  subprocess.stdout?.on("data", pushOutput);
  subprocess.stderr?.on("data", pushOutput);

  const result = await subprocess;
  if (result.exitCode !== 0) {
    const tail = [result.stdout, result.stderr].filter(Boolean).join("\n").trim().slice(-800);
    task.output = chalk.yellow(
      `Hedera Skills install exited with code ${result.exitCode}. You can add them later:\n` +
        `  cd ${path.basename(targetDir)} && npx skills add ${HEDERA_SKILLS_MARKETPLACE_SPEC} ${HEDERA_SKILLS_ADD_NONINTERACTIVE_ARGS.join(" ")}` +
        (tail ? `\n${tail}` : ""),
    );
  }
}
