import { apiErrorResponse } from "@/lib/api-errors";
import { requireSession } from "@/lib/auth/authorization";
import { assertTrustedOrigin } from "@/lib/auth/security";
import { getAppEnv } from "@/lib/cloudflare-env";
import { jsonResponse } from "@/lib/http";
import { editStudent, getStudentForActor } from "@/modules/students/service";

export async function GET(
  request: Request,
  route: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const env = getAppEnv();
    const actor = await requireSession(env, request.headers);
    const { id } = await route.params;
    const student = await getStudentForActor(env.DB, id, {
      role: actor.user.role,
      userId: actor.user.id,
    });
    return jsonResponse({ student });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  route: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const env = getAppEnv();
    assertTrustedOrigin(request, env);
    const actor = await requireSession(env, request.headers, {
      roles: ["ADMIN"],
    });
    const { id } = await route.params;
    const student = await editStudent(
      env.DB,
      actor.user.id,
      id,
      await request.json().catch(() => ({})),
    );
    return jsonResponse({ student });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
