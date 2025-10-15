export async function GET(request, { params }) {
  const { path } = params;
  const url = new URL(request.url);
  const backendUrl = `https://lfzlwlbz-8000.asse.devtunnels.ms/api/v1/${path.join(
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

export async function POST(request, { params }) {
  const { path } = params;
  const url = new URL(request.url);
  const backendUrl = `https://lfzlwlbz-8000.asse.devtunnels.ms/api/v1/${path.join(
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
