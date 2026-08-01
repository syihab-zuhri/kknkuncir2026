import { apiErrorResponse } from "@/lib/api-errors";
import { requireSession } from "@/lib/auth/authorization";
import { assertTrustedOrigin } from "@/lib/auth/security";
import { getAppEnv } from "@/lib/cloudflare-env";
import { jsonResponse } from "@/lib/http";
import { importStudents } from "@/modules/students/service";

export async function POST(request: Request): Promise<Response> {
  try {
    const env = getAppEnv();
    assertTrustedOrigin(request, env);
    const actor = await requireSession(env, request.headers, {
      roles: ["ADMIN"],
    });
    const result = await importStudents(
      env,
      actor.user.id,
      request.headers,
      await request.json().catch(() => ({})),
    );

    return jsonResponse(result, { status: result.dryRun ? 200 : 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
