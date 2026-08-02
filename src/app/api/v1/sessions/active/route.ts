import { apiErrorResponse } from "@/lib/api-errors";
import { requireSession } from "@/lib/auth/authorization";
import { getAppEnv } from "@/lib/cloudflare-env";
import { jsonResponse } from "@/lib/http";
import { getActiveSessionCards } from "@/modules/sessions/service";

export async function GET(request: Request): Promise<Response> {
  try {
    const env = getAppEnv();
    await requireSession(env, request.headers);
    return jsonResponse(await getActiveSessionCards(env.DB));
  } catch (error) {
    return apiErrorResponse(error);
  }
}
