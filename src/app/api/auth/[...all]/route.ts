import { getAppEnv } from "@/lib/cloudflare-env";
import { jsonResponse } from "@/lib/http";
import { createAuth } from "@/lib/auth/server";

const exposedBetterAuthPaths = new Set([
  "GET /api/auth/get-session",
  "POST /api/auth/sign-out",
]);

async function handler(request: Request): Promise<Response> {
  const routeKey = `${request.method} ${new URL(request.url).pathname}`;

  if (!exposedBetterAuthPaths.has(routeKey)) {
    return jsonResponse(
      { error: { code: "NOT_FOUND", message: "Endpoint tidak tersedia." } },
      { status: 404 },
    );
  }

  return createAuth(getAppEnv()).handler(request);
}

export {
  handler as DELETE,
  handler as GET,
  handler as PATCH,
  handler as POST,
  handler as PUT,
};
