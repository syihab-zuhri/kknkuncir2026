import { apiErrorResponse } from "@/lib/api-errors";
import { requireSession } from "@/lib/auth/authorization";
import { assertTrustedOrigin } from "@/lib/auth/security";
import { getAppEnv } from "@/lib/cloudflare-env";
import { jsonResponse } from "@/lib/http";
import { provisionStudent } from "@/modules/students/service";

export async function POST(request: Request): Promise<Response> {
  try {
    const env = getAppEnv();
    assertTrustedOrigin(request, env);
    const actor = await requireSession(env, request.headers, {
      roles: ["ADMIN"],
    });
    const student = await provisionStudent(
      env,
      actor.user.id,
      request.headers,
      await request.json().catch(() => ({})),
    );

    return jsonResponse({ student }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
