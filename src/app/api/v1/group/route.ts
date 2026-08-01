import { apiErrorResponse } from "@/lib/api-errors";
import { requireSession } from "@/lib/auth/authorization";
import { assertTrustedOrigin } from "@/lib/auth/security";
import { getAppEnv } from "@/lib/cloudflare-env";
import { jsonResponse } from "@/lib/http";
import { getActiveGroup, updateGroupSettings } from "@/modules/group/service";

export async function GET(request: Request): Promise<Response> {
  try {
    const env = getAppEnv();
    await requireSession(env, request.headers);
    return jsonResponse({ group: await getActiveGroup(env.DB) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(request: Request): Promise<Response> {
  try {
    const env = getAppEnv();
    assertTrustedOrigin(request, env);
    const actor = await requireSession(env, request.headers, {
      roles: ["ADMIN"],
    });
    const group = await updateGroupSettings(
      env.DB,
      actor.user.id,
      await request.json().catch(() => ({})),
    );
    return jsonResponse({ group });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
