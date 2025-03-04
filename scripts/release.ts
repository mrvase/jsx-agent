import { $ } from "bun";

// update versions based on changesets
await $`bunx changeset version`;

process.stdout.write("Do you want to commit and publish? (y/N) ");
for await (const line of console) {
  if (line !== "y" && line !== "Y") {
    process.exit(0);
  } else {
    break;
  }
}

// commit updated versions
await $`git add . && git commit -a -m "Update package versions"`;
// build packages
await $`bun run -F './packages/*' build`;
// publish packages to npm and create git tags
await $`bunx changeset publish`;
// push commits and tags to the remote repository
await $`git push --follow-tags`;
