import { apiErrorResponse } from "@/lib/api-errors";
import { requireSession } from "@/lib/auth/authorization";
import { assertTrustedOrigin } from "@/lib/auth/security";
import { getAppEnv } from "@/lib/cloudflare-env";
import { jsonResponse } from "@/lib/http";
import { openSession } from "@/modules/sessions/service";

export async function POST(
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
    return jsonResponse({
      session: await openSession(env.DB, actor.user.id, id),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
