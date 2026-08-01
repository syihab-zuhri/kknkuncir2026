export function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "private, no-store");

  return new Response(JSON.stringify(body), { ...init, headers });
}

export function copySessionCookie(source: Response, target: Headers): void {
  const cookie = source.headers.get("set-cookie");

  if (cookie) {
    target.append("set-cookie", cookie);
  }
}
