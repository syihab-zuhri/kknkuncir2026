import { apiErrorResponse } from "@/lib/api-errors";
import { requireSession } from "@/lib/auth/authorization";
import { assertTrustedOrigin } from "@/lib/auth/security";
import type { AppEnv } from "@/lib/cloudflare-env";
import { jsonResponse } from "@/lib/http";

import { createSession } from "./service";

export async function handleCreateSessionRequest(
  request: Request,
  env: AppEnv,
): Promise<Response> {
  try {
    assertTrustedOrigin(request, env);
    const actor = await requireSession(env, request.headers, {
      roles: ["ADMIN"],
    });
    const session = await createSession(
      env.DB,
      actor.user.id,
      await request.json().catch(() => ({})),
    );
    return jsonResponse({ session }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
