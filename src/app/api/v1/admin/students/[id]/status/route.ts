import { apiErrorResponse } from "@/lib/api-errors";
import { requireSession } from "@/lib/auth/authorization";
import { assertTrustedOrigin } from "@/lib/auth/security";
import { getAppEnv } from "@/lib/cloudflare-env";
import { jsonResponse } from "@/lib/http";
import { changeStudentStatus } from "@/modules/students/service";

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
    const student = await changeStudentStatus(
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
