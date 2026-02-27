import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  platform: "node",
  clean: true,
  target: "node20",
  banner: {
    js: "#!/usr/bin/env node",
  },
});
