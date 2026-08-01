import { getSessionCookie } from "better-auth/cookies";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { getAppEnv } from "@/lib/cloudflare-env";

import type { AppRole } from "./access-control";
import { AuthorizationError, requireSession } from "./authorization";

export async function requirePageSession(roles?: readonly AppRole[]) {
  await connection();
  const requestHeaders = new Headers(await headers());

  if (!getSessionCookie(requestHeaders, { cookiePrefix: "kkndesakuncir" })) {
    redirect("/login");
  }

  try {
    return await requireSession(getAppEnv(), requestHeaders, {
      roles,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      if (error.code === "PASSWORD_CHANGE_REQUIRED") {
        redirect("/change-password");
      }
      redirect("/login");
    }
    throw error;
  }
}

export async function requirePasswordChangeSession() {
  await connection();
  const requestHeaders = new Headers(await headers());

  if (!getSessionCookie(requestHeaders, { cookiePrefix: "kkndesakuncir" })) {
    redirect("/login");
  }

  try {
    return await requireSession(getAppEnv(), requestHeaders, {
      allowPasswordChange: true,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      redirect("/login");
    }
    throw error;
  }
}
