import * as fs from "node:fs";
import { $, Glob } from "bun";

const hash = (await $`git rev-parse --short HEAD`).text().trim();
const version = `0.0.0-${hash}`;

const packageJsons: { file: string; packageJson: any }[] = [];

// find all files
const files = new Glob("./packages/*/package.json").scan(".");
for await (const file of files) {
  packageJsons.push({
    file,
    packageJson: JSON.parse(fs.readFileSync(file, "utf8")),
  });
}

const packageNames = packageJsons.map((el) => el.packageJson.name as string);

// update versions
for (const { file, packageJson } of packageJsons) {
  packageJson.version = version;

  for (const field of ["dependencies", "devDependencies", "peerDependencies"]) {
    for (const dependencyName of Object.keys(packageJson[field] || {})) {
      if (packageNames.includes(dependencyName)) {
        packageJson[field][dependencyName] = version;
      }
    }
  }

  fs.writeFileSync(file, `${JSON.stringify(packageJson, null, 2)}\n`);
}
