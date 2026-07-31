import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

process.env.WRANGLER_LOG = "none";

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.test.jsonc" },
    }),
  ],
  test: {
    include: ["test/**/*.test.ts"],
  },
});
