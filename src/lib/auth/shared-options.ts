import { admin } from "better-auth/plugins/admin";
import { username } from "better-auth/plugins/username";

import { accessControl, authRoles } from "./access-control";
import { isValidNim, normalizeNim } from "./identity";

function definePlugins<T extends unknown[]>(...plugins: T): T {
  return plugins;
}

export const authSharedOptions = {
  appName: "kkndesakuncir",
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 10,
    maxPasswordLength: 128,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  user: {
    additionalFields: {
      isActive: {
        type: "boolean" as const,
        required: true,
        defaultValue: true,
        input: false,
        fieldName: "is_active",
      },
      mustChangePassword: {
        type: "boolean" as const,
        required: true,
        defaultValue: true,
        input: false,
        fieldName: "must_change_password",
      },
    },
  },
  disabledPaths: ["/sign-up/email", "/is-username-available"],
  plugins: definePlugins(
    username({
      minUsernameLength: 3,
      maxUsernameLength: 30,
      usernameNormalization: normalizeNim,
      usernameValidator: isValidNim,
      validationOrder: { username: "post-normalization" as const },
    }),
    admin({
      ac: accessControl,
      roles: authRoles,
      adminRoles: ["ADMIN"],
      defaultRole: "STUDENT",
      bannedUserMessage: "Akun dinonaktifkan. Hubungi admin.",
    }),
  ),
};
