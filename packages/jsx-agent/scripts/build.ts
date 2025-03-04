import { build } from "tsup";

await build({
  entry: ["src/index.ts", "src/context/internal.ts", "src/jsx/index.ts"],
  splitting: true,
  sourcemap: true,
  clean: true,
  external: [],
  format: "esm",
  dts: true,
});
