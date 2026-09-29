import { createFileRoute } from "@tanstack/react-router";

// Forwards /api/v1/* to the local VidLeaf Python backend. Used when the app is
// served without VITE_VIDLEAF_API_URL (sandbox preview / local dev), because
// the sandbox dev server strips Vite's server.proxy config. In production the
// app calls the backend origin directly and this route is unused.
const BACKEND_ORIGIN = "http://127.0.0.1:8000";

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "host",
  "content-length",
]);

async function forward(request: Request, splat: string | undefined) {
  const incoming = new URL(request.url);
  const path = splat ? `/${splat}` : "/";
  const target = `${BACKEND_ORIGIN}/api/v1${path}${incoming.search}`;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) headers.set(key, value);
  });

  const body =
    request.method === "GET" || request.method === "HEAD"
      ? null
      : await request.arrayBuffer();

  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body,
    redirect: "manual",
  });

  const responseHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) responseHeaders.set(key, value);
  });
  responseHeaders.set("x-vidleaf-forwarded", "1");

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export const Route = createFileRoute("/api/v1/$")({
  server: {
    handlers: {
      GET: async ({ request, params }) => forward(request, params._splat),
      POST: async ({ request, params }) => forward(request, params._splat),
      PUT: async ({ request, params }) => forward(request, params._splat),
      PATCH: async ({ request, params }) => forward(request, params._splat),
      DELETE: async ({ request, params }) => forward(request, params._splat),
      OPTIONS: async ({ request, params }) => forward(request, params._splat),
      HEAD: async ({ request, params }) => forward(request, params._splat),
    },
  },
});
