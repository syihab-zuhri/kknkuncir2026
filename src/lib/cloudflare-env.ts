import { getCloudflareContext } from "@opennextjs/cloudflare";

export type AppEnv = CloudflareEnv & {
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL?: string;
  BOOTSTRAP_ADMIN_NAME?: string;
  BOOTSTRAP_ADMIN_PASSWORD?: string;
  BOOTSTRAP_ADMIN_TOKEN?: string;
  BOOTSTRAP_ADMIN_USERNAME?: string;
};

export function getAppEnv(): AppEnv {
  return getCloudflareContext().env as AppEnv;
}
