import { $ } from "bun";

// update package versions to the form of 0.0.0-<hash>
await $`bun ./scripts/set-prerelease-versions.ts`;
// build and publish packages to npm
await $`bun run -F './packages/*' build && bun run -F './packages/*' publish:beta`;
// restore package versions to the original form
await $`git restore .`;
