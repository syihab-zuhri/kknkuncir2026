import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access";

export const accessControl = createAccessControl(defaultStatements);

export const adminRole = accessControl.newRole({
  ...adminAc.statements,
});

export const studentRole = accessControl.newRole({
  user: [],
  session: [],
});

export const authRoles = {
  ADMIN: adminRole,
  STUDENT: studentRole,
} as const;

export type AppRole = keyof typeof authRoles;
