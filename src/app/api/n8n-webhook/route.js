import { NextResponse } from "next/server";

const N8N_WEBHOOK_URL =
  process.env.N8N_WEBHOOK_URL ||
  "https://n8n.srv651498.hstgr.cloud/webhook/44e8e63d-ebf4-4278-bdf6-ff0f8e5955fb/chat";

export async function POST(request) {
  try {
    // Parse incoming request body
    const payload = await request.json();

    console.log("[n8n-webhook] Forwarding request to n8n:", {
      url: N8N_WEBHOOK_URL,
      session_id: payload.session_id,
      template_id: payload.template_id,
    });

    // Forward request to n8n webhook
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    // Handle non-OK responses
    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error("[n8n-webhook] n8n returned error:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });

      return NextResponse.json(
        {
          success: false,
          error: `n8n webhook failed: ${response.status} ${response.statusText}`,
          details: errorText,
        },
        { status: response.status }
      );
    }

    // Parse n8n response
    const data = await response.json().catch(async () => {
      // If JSON parsing fails, return text
      const text = await response.text();
      return { success: true, message: text };
    });

    console.log("[n8n-webhook] n8n response:", data);

    return NextResponse.json(
      {
        success: true,
        data,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[n8n-webhook] Proxy error:", error);

    // Handle timeout or network errors
    if (error.name === "AbortError" || error.code === "ETIMEDOUT") {
      return NextResponse.json(
        {
          success: false,
          error: "Request to n8n timed out",
          details: error.message,
        },
        { status: 504 } // Gateway Timeout
      );
    }

    // Handle other errors
    return NextResponse.json(
      {
        success: false,
        error: "Failed to forward request to n8n",
        details: error.message,
      },
      { status: 502 } // Bad Gateway
    );
  }
}

// Handle preflight OPTIONS request for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
