import { apiErrorResponse } from "@/lib/api-errors";
import { requireSession } from "@/lib/auth/authorization";
import { assertTrustedOrigin } from "@/lib/auth/security";
import { getAppEnv } from "@/lib/cloudflare-env";
import { jsonResponse } from "@/lib/http";
import { getSessionActorScope } from "@/modules/sessions/authorization";
import { editSession, getSessionDetail } from "@/modules/sessions/service";

type SessionRoute = { params: Promise<{ id: string }> };

export async function GET(
  request: Request,
  route: SessionRoute,
): Promise<Response> {
  try {
    const env = getAppEnv();
    const actor = await requireSession(env, request.headers);
    const { id } = await route.params;
    return jsonResponse(
      await getSessionDetail(env.DB, id, getSessionActorScope(actor)),
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  route: SessionRoute,
): Promise<Response> {
  try {
    const env = getAppEnv();
    assertTrustedOrigin(request, env);
    const actor = await requireSession(env, request.headers, {
      roles: ["ADMIN"],
    });
    const { id } = await route.params;
    const session = await editSession(
      env.DB,
      actor.user.id,
      id,
      await request.json().catch(() => ({})),
    );
    return jsonResponse({ session });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
