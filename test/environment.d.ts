import type { D1Migration } from "cloudflare:test";

declare global {
  interface CloudflareEnv {
    TEST_MIGRATIONS: D1Migration[];
  }

  namespace Cloudflare {
    interface Env {
      TEST_MIGRATIONS: D1Migration[];
    }
  }
}

export {};
