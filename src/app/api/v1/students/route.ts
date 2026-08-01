import { apiErrorResponse } from "@/lib/api-errors";
import { requireSession } from "@/lib/auth/authorization";
import { getAppEnv } from "@/lib/cloudflare-env";
import { jsonResponse } from "@/lib/http";
import { getStudents } from "@/modules/students/service";

export async function GET(request: Request): Promise<Response> {
  try {
    const env = getAppEnv();
    await requireSession(env, request.headers, { roles: ["ADMIN"] });
    const result = await getStudents(env.DB, new URL(request.url).searchParams);
    return jsonResponse(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
