import { apiErrorResponse } from "@/lib/api-errors";
import { requireSession } from "@/lib/auth/authorization";
import { getAppEnv } from "@/lib/cloudflare-env";
import { jsonResponse } from "@/lib/http";

export async function GET(request: Request): Promise<Response> {
  try {
    const context = await requireSession(getAppEnv(), request.headers, {
      allowPasswordChange: true,
    });

    return jsonResponse({
      user: context.user,
      role: context.user.role,
      nextAction: context.user.mustChangePassword
        ? "CHANGE_PASSWORD"
        : context.user.role === "ADMIN"
          ? "ADMIN_HOME"
          : "STUDENT_HOME",
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
