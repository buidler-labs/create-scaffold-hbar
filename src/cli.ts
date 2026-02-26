import { createProject } from "./main";
import { InstallError } from "./tasks";
import { parseArgumentsIntoOptions } from "./utils/parse-arguments-into-options";
import { promptForMissingOptions } from "./utils/prompt-for-missing-options";
import { renderIntroMessage } from "./utils/render-intro-message";
import type { Args } from "./types";
import chalk from "chalk";
import { SOLIDITY_FRAMEWORKS, EXIT_CODES } from "./utils/consts";
import { validateFoundry, checkSystemRequirements } from "./utils/system-validation";

export async function cli(args: Args) {
  try {
    renderIntroMessage();

    const { errors } = await checkSystemRequirements();

    if (errors.length > 0) {
      console.log(chalk.red("\n❌ create-hbar requirements not met:"));
      errors.forEach(error => console.log(chalk.red(`  - ${error}`)));
      process.exit(EXIT_CODES.GENERIC);
    }

    const { rawOptions } = await parseArgumentsIntoOptions(args);

    const options = await promptForMissingOptions(rawOptions);
    if (options.solidityFramework === SOLIDITY_FRAMEWORKS.FOUNDRY) {
      await validateFoundry();
    }

    await createProject(options);
  } catch (error: unknown) {
    if (error instanceof InstallError) {
      console.error(chalk.red(`\n${error.message}`));
      process.exit(error.exitCode);
    }
    console.log("%s Error occurred", chalk.red.bold("ERROR"), error);
    console.log("%s Exiting...", chalk.red.bold("Uh oh! Sorry about that!"));
    process.exitCode = EXIT_CODES.GENERIC;
    return;
  }
}
