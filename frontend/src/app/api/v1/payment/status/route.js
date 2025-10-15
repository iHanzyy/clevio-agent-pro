import { NextResponse } from "next/server";

const ensureStore = () => {
  if (!globalThis.__paymentStatusStore) {
    globalThis.__paymentStatusStore = new Map();
  }
  return globalThis.__paymentStatusStore;
};

const statusStore = ensureStore();

const isTransactionPayload = (payload) => {
  if (!payload || typeof payload !== "object") return false;
  if (payload.transaction_status) return true;
  if (payload.status_code || payload.status_message) return true;
  if (payload.settlement_time || payload.payment_type) return true;
  return false;
};

export async function POST(request) {
  try {
    const rawBody = await request.json();
    const body = Array.isArray(rawBody) ? rawBody[0] : rawBody;

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: "Invalid JSON payload" },
        { status: 400 },
      );
    }

    const orderId =
      body.order_id ||
      body.orderId ||
      null;

    if (isTransactionPayload(body)) {
      if (orderId) {
        statusStore.set(orderId, {
          ...body,
          received_at: new Date().toISOString(),
        });
      }
      return NextResponse.json({
        success: true,
        stored: Boolean(orderId),
        order_id: orderId ?? null,
      });
    }

    if (!orderId) {
      return NextResponse.json(
        {
          success: false,
          error: "order_id is required to look up payment status",
        },
        { status: 400 },
      );
    }

    const stored = statusStore.get(orderId) || null;

    return NextResponse.json({
      success: true,
      order_id: orderId,
      transaction_status: stored?.transaction_status ?? null,
      data: stored,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Unable to process request",
      },
      { status: 400 },
    );
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("order_id") || searchParams.get("orderId");

  if (!orderId) {
    return NextResponse.json(
      {
        success: false,
        error: "Provide order_id query parameter",
      },
      { status: 400 },
    );
  }

  const stored = statusStore.get(orderId) || null;

  return NextResponse.json({
    success: true,
    order_id: orderId,
    transaction_status: stored?.transaction_status ?? null,
    data: stored,
  });
}
