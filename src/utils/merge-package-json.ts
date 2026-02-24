import deepmerge from "@fastify/deepmerge";
import fs from "fs";

const merge = deepmerge({ all: true });

export function mergePackageJson(targetPackageJsonPath: string, secondPackageJsonPath: string, isDev: boolean) {
  const existsTarget = fs.existsSync(targetPackageJsonPath);
  const existsSecond = fs.existsSync(secondPackageJsonPath);
  if (!existsTarget && !existsSecond) {
    return;
  }

  const targetPkg = existsTarget ? (JSON.parse(fs.readFileSync(targetPackageJsonPath, "utf8")) as object) : {};
  const secondPkg = existsSecond ? (JSON.parse(fs.readFileSync(secondPackageJsonPath, "utf8")) as object) : {};

  const merged = merge(targetPkg, secondPkg);
  const formattedPkgStr = JSON.stringify(merged, null, 2);

  fs.writeFileSync(targetPackageJsonPath, formattedPkgStr, "utf8");
  if (isDev) {
    const devStr = `TODO: write relevant information for the contributor`;
    fs.writeFileSync(`${targetPackageJsonPath}.dev`, devStr, "utf8");
  }
}
