import { DefaultRenderer, ListrTaskWrapper, SimpleRenderer } from "listr2";
import { execa, execaCommand } from "execa";
import chalk from "chalk";
import type { PackageManager } from "../types";
import { InstallError } from "../utils/errors";

const INSTALL_ARGS: Record<PackageManager, string[]> = {
  yarn: ["install"],
};

export { InstallError };

function getBinary(pm: PackageManager): string {
  return pm;
}

/** Returns true if the package manager binary is available on PATH. */
async function isPackageManagerAvailable(pm: PackageManager): Promise<boolean> {
  const binary = getBinary(pm);
  const checkCmd = process.platform === "win32" ? "where" : "which";
  const args = process.platform === "win32" ? [binary] : [binary];
  const { exitCode } = await execa(checkCmd, args, { reject: false });
  return exitCode === 0;
}

function getInstallCommand(pm: PackageManager): string {
  return `${pm} install`;
}

export async function installPackages(
  targetDir: string,
  task: ListrTaskWrapper<any, typeof DefaultRenderer, typeof SimpleRenderer>,
  packageManager: PackageManager,
): Promise<void> {
  const available = await isPackageManagerAvailable(packageManager);
  if (!available) {
    const cmd = getInstallCommand(packageManager);
    task.output = chalk.yellow(`${packageManager} not found on PATH. Run manually: ${chalk.bold(cmd)}`);
    return;
  }

  const args = INSTALL_ARGS[packageManager];
  const execute = execaCommand(`${packageManager} ${args.join(" ")}`, {
    cwd: targetDir,
    reject: false,
  });

  let outputBuffer = "";
  const chunkSize = 1024;

  const pushOutput = (data: Buffer) => {
    outputBuffer += data.toString();
    if (outputBuffer.length > chunkSize) {
      outputBuffer = outputBuffer.slice(-chunkSize);
    }
    const visibleOutput =
      outputBuffer
        .match(new RegExp(`.{1,${chunkSize}}`, "g"))
        ?.slice(-1)
        .map(chunk => chunk.trimEnd() + "\n")
        .join("") ?? outputBuffer;
    task.output = visibleOutput;
    if (visibleOutput.includes("Link step")) {
      task.output = chalk.yellow("starting link step, this might take a little time...");
    }
  };

  execute.stdout?.on("data", pushOutput);
  execute.stderr?.on("data", pushOutput);

  try {
    const result = await execute;
    if (result.exitCode !== 0) {
      const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
      throw new InstallError(
        `Dependency installation failed (exit code ${result.exitCode}).`,
        undefined,
        output || undefined,
      );
    }
  } catch (err) {
    if (err instanceof InstallError) throw err;
    const exitCode = err && typeof err === "object" && "exitCode" in err ? (err as { exitCode: number }).exitCode : 1;
    throw new InstallError(`Dependency installation failed (exit code ${exitCode}).`, err);
  }
}
