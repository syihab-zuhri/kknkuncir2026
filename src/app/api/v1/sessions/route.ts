import { apiErrorResponse } from "@/lib/api-errors";
import { requireSession } from "@/lib/auth/authorization";
import { getAppEnv } from "@/lib/cloudflare-env";
import { jsonResponse } from "@/lib/http";
import { handleCreateSessionRequest } from "@/modules/sessions/api";
import { getSessionActorScope } from "@/modules/sessions/authorization";
import { getSessions } from "@/modules/sessions/service";

export async function GET(request: Request): Promise<Response> {
  try {
    const env = getAppEnv();
    const actor = await requireSession(env, request.headers);
    return jsonResponse(
      await getSessions(
        env.DB,
        new URL(request.url).searchParams,
        getSessionActorScope(actor),
      ),
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  return handleCreateSessionRequest(request, getAppEnv());
}
