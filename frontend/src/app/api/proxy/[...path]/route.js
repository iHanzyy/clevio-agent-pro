const DEFAULT_BACKEND_BASE = "https://new-langchain.chiefaiofficer.id";

export const dynamic = "force-dynamic";

const backendBase =
  process.env.BACKEND_BASE_URL?.replace(/\/$/, "") || DEFAULT_BACKEND_BASE;

async function forward(request, context, method) {
  const resolvedParams = await context.params;
  const pathSegments = Array.isArray(resolvedParams?.path)
    ? resolvedParams.path
    : [];

  const incomingUrl = new URL(request.url);
  const targetUrl = `${backendBase}/api/v1/${pathSegments.join("/")}${
    incomingUrl.search
  }`;

  const headers = new Headers();

  request.headers.forEach((value, key) => {
    if (key.toLowerCase() === "host") return;
    headers.set(key, value);
  });

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
