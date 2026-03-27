# Developer Guide

This project is aimed to be consumed via `npx create`. The code in this repo is the source used to generate the consumable script.

The steps you should follow to make changes to the code are the following:

1. Clone and `cd` into the repo
2. Start a development server watching changes with `yarn dev`. This process will build the script as you save changes.

Now there are two scenarios depending on if you want to change the CLI tool itself, or the project resulting from running the CLI.

To avoid confusion when talking about this project or resulting projects, we'll refer to projects created via the CLI tool as "instance projects".

## Changes to the CLI

The CLI tool source code can be found under `src/`. As you make changes in those files, the development server will compile the source and generate the script inside `bin/`.

To run the script you can simply run

```bash
yarn cli
```

This command will run the compiled script inside `bin/`.

You can send any option or flag to the CLI command. For example, a handy command is `yarn cli --skip` to tell the CLI to skip installing dependencies.

## Adding or removing a new project type

- [ ] Update the [`TEMPLATE-FILES.md`](./TEMPLATE-FILES.md) file to include or remove the template file.
- [ ] (optional) If the file was removed then we add the changeset as `minor` update.
