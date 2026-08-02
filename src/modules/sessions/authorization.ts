import type { AuthContext } from "@/lib/auth/authorization";

import type { SessionActorScope } from "./repository";

export function getSessionActorScope(actor: AuthContext): SessionActorScope {
  if (actor.user.role === "ADMIN") return { role: "ADMIN" };
  if (!actor.studentId) throw new Error("STUDENT_SCOPE_NOT_RESOLVED");
  return { role: "STUDENT", studentId: actor.studentId };
}
