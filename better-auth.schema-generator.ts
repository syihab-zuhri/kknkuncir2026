import { betterAuth } from "better-auth/minimal";

import { authSharedOptions } from "./src/lib/auth/shared-options";

// The CLI receives the Drizzle/SQLite adapter through command-line flags. It
// only needs the final plugins and user fields to generate the auth schema.
export const auth = betterAuth(authSharedOptions);
