export async function GET(request, context) {
  const resolvedParams = await context.params;
  const pathSegments = Array.isArray(resolvedParams?.path)
    ? resolvedParams.path
    : [];
  const url = new URL(request.url);
  const backendUrl = `https://lfzlwlbz-8000.asse.devtunnels.ms/api/v1/${pathSegments.join(
    "/"
  )}${url.search}`;

  try {
    const response = await fetch(backendUrl, {
      method: "GET",
      headers: {
        Authorization: request.headers.get("Authorization") || "",
      },
    });

    const data = await response.json();
    return Response.json(data, { status: response.status });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request, context) {
  const resolvedParams = await context.params;
  const pathSegments = Array.isArray(resolvedParams?.path)
    ? resolvedParams.path
    : [];
  const url = new URL(request.url);
  const backendUrl = `https://lfzlwlbz-8000.asse.devtunnels.ms/api/v1/${pathSegments.join(
    "/"
  )}${url.search}`;

  try {
    const body = await request.text();

    const response = await fetch(backendUrl, {
      method: "POST",
      headers: {
        Authorization: request.headers.get("Authorization") || "",
        "Content-Type":
          request.headers.get("Content-Type") || "application/json",
      },
      body: body || undefined,
    });

    const data = await response.json();
    return Response.json(data, { status: response.status });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
