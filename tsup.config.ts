import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "node20",
  outDir: "dist",
  external: ["@prisma/client", "express"],
  esbuildOptions(options) {
    options.alias = {
      app: "./src/app",
    };
  },
});
