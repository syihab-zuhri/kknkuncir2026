import { apiErrorResponse } from "@/lib/api-errors";
import { requireSession } from "@/lib/auth/authorization";
import { assertTrustedOrigin } from "@/lib/auth/security";
import { createAuth } from "@/lib/auth/server";
import { getAppEnv } from "@/lib/cloudflare-env";
import { copySessionCookie, jsonResponse } from "@/lib/http";

export async function POST(request: Request): Promise<Response> {
  try {
    const env = getAppEnv();
    assertTrustedOrigin(request, env);
    await requireSession(env, request.headers, { allowPasswordChange: true });
    const response = await createAuth(env).api.signOut({
      headers: request.headers,
      asResponse: true,
    });
    const headers = new Headers();
    copySessionCookie(response, headers);

    return jsonResponse({ success: response.ok }, { headers });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
