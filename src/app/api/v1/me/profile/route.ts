import { apiErrorResponse } from "@/lib/api-errors";
import { requireSession } from "@/lib/auth/authorization";
import { getAppEnv } from "@/lib/cloudflare-env";
import { jsonResponse } from "@/lib/http";
import { getOwnStudentProfile } from "@/modules/students/service";

export async function GET(request: Request): Promise<Response> {
  try {
    const env = getAppEnv();
    const actor = await requireSession(env, request.headers, {
      roles: ["STUDENT"],
    });
    const student = await getOwnStudentProfile(env.DB, actor.user.id);
    return jsonResponse({ student });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
