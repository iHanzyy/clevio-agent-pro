export const dynamic = "force-dynamic";

const backendBase =
  process.env.BACKEND_BASE_URL && process.env.BACKEND_BASE_URL.length > 0
    ? process.env.BACKEND_BASE_URL
    : process.env.BACKEND_BASE_URL;

let backendOrigin = backendBase;
try {
  backendOrigin = new URL(backendBase).origin;
} catch (error) {
  console.warn(
    "⚠️ Invalid BACKEND_BASE_URL; using raw value for Origin header",
    error
  );
}

async function forward(request, context, method) {
  const resolvedParams = await context.params;
  const pathSegments = Array.isArray(resolvedParams?.path)
    ? resolvedParams.path
    : [];
  const lastSegment = pathSegments.length
    ? pathSegments[pathSegments.length - 1] || ""
    : "";

  const incomingUrl = new URL(request.url);
  let pathSuffix = pathSegments.length ? `/${pathSegments.join("/")}` : "";
  if (pathSegments.length && pathSegments[pathSegments.length - 1] === "") {
    pathSuffix = pathSuffix.replace(/\/+$/, "/");
  }

  const incomingHasTrailingSlash =
    incomingUrl.pathname.length > 1 && incomingUrl.pathname.endsWith("/");
  const needsTrailingSlashForPost =
    method === "POST" && lastSegment === "agents";

  let apiPath = `/api/v1${pathSuffix}${
    needsTrailingSlashForPost || incomingHasTrailingSlash ? "/" : ""
  }`;

  if (incomingUrl.search) {
    apiPath += incomingUrl.search;
  }
  const targetUrl = new URL(apiPath, backendBase).toString();
  console.log("[proxy] forwarding", {
    incoming: request.method + " " + incomingUrl.pathname,
    target: targetUrl,
    pathSegments,
    hasTrailing: incomingHasTrailingSlash,
  });

  const headers = new Headers();

  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (["host", "content-length", "connection"].includes(lower)) return;
    headers.set(key, value);
  });
  headers.set("Origin", backendOrigin);

  if (!headers.has("content-type") && method !== "GET" && method !== "HEAD") {
    headers.set("content-type", "application/json");
  }

  const init = {
    method,
    headers,
  };

  if (method !== "GET" && method !== "HEAD") {
    const buffer = Buffer.from(await request.arrayBuffer());
    init.body = buffer;
  }

  const response = await fetch(targetUrl, init);

  const responseHeaders = new Headers();
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === "content-length") return;
    responseHeaders.set(key, value);
  });

  return new Response(response.body, {
    status: response.status,
    headers: responseHeaders,
  });
}

export async function GET(request, context) {
  return forward(request, context, "GET");
}

export async function POST(request, context) {
  return forward(request, context, "POST");
}

export async function PUT(request, context) {
  return forward(request, context, "PUT");
}

export async function PATCH(request, context) {
  return forward(request, context, "PATCH");
}

export async function DELETE(request, context) {
  return forward(request, context, "DELETE");
}

export async function OPTIONS(request, context) {
  return forward(request, context, "OPTIONS");
}

export async function HEAD(request, context) {
  return forward(request, context, "HEAD");
}
