import { NextResponse } from "next/server";

const ensureStore = () => {
  if (!globalThis.__paymentStatusStore) {
    globalThis.__paymentStatusStore = new Map();
  }
  return globalThis.__paymentStatusStore;
};

const ensureLatestRef = () => {
  if (!globalThis.__latestPaymentStatus) {
    globalThis.__latestPaymentStatus = null;
  }
  return {
    get value() {
      return globalThis.__latestPaymentStatus;
    },
    set value(next) {
      globalThis.__latestPaymentStatus = next;
    },
  };
};

const statusStore = ensureStore();
const latestRef = ensureLatestRef();

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

    const isTransactionPayload = !!(
      body?.transaction_status ||
      body?.status_code ||
      body?.status_message ||
      body?.settlement_time ||
      body?.payment_type
    );

    const existing = orderId ? statusStore.get(orderId) || {} : {};
    const baseRecord = {
      ...existing,
      ...(typeof body === "object" ? body : {}),
      transaction_status:
        typeof body === "object" && body.transaction_status !== undefined
          ? body.transaction_status
          : existing.transaction_status !== undefined
          ? existing.transaction_status
          : null,
      received_at: new Date().toISOString(),
      source: body?.source || existing.source || "n8n",
    };

    if (body?.success && body?.stored && orderId) {
      console.log("[payment-status] received success payload", body);
      const merged = {
        ...baseRecord,
        transaction_status: baseRecord.transaction_status || "settlement",
      };
      statusStore.set(orderId, merged);
      latestRef.value = {
        order_id: orderId,
        payload: merged,
        transaction_status: merged.transaction_status || "settlement",
        stored_at: new Date().toISOString(),
      };
      return NextResponse.json({
        success: true,
        stored: true,
        order_id: orderId,
      });
    }

    if (isTransactionPayload && orderId) {
      console.log("[payment-status] received transaction payload", body);
      statusStore.set(orderId, baseRecord);
      latestRef.value = {
        order_id: orderId,
        payload: baseRecord,
        transaction_status: baseRecord.transaction_status ?? null,
        stored_at: new Date().toISOString(),
      };
      return NextResponse.json({
        success: true,
        stored: true,
        order_id: orderId,
      });
    }

    if (orderId) {
      console.log("[payment-status] received generic payload", body);
      statusStore.set(orderId, baseRecord);
      latestRef.value = {
        order_id: orderId,
        payload: baseRecord,
        transaction_status: baseRecord.transaction_status ?? null,
        stored_at: new Date().toISOString(),
      };
      return NextResponse.json({
        success: true,
        stored: true,
        order_id: orderId,
      });
    }

    if (!orderId) {
      const latest = latestRef.value;
      console.log("[payment-status] lookup latest", latest);
      return NextResponse.json({
        success: true,
        order_id: latest?.order_id ?? null,
        transaction_status: latest?.transaction_status ?? null,
        data: latest?.payload ?? null,
      });
    }

    const stored =
      statusStore.get(orderId) ||
      (latestRef.value && latestRef.value.order_id === orderId
        ? latestRef.value.payload
        : null);

    console.log("[payment-status] lookup", orderId, stored);

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

  if (orderId) {
    const queryPayload = Object.fromEntries(searchParams.entries());
    const existing = statusStore.get(orderId) || {};
    const merged = {
      ...existing,
      ...queryPayload,
      transaction_status:
        queryPayload.transaction_status || existing.transaction_status || null,
      received_at: new Date().toISOString(),
      source: queryPayload.source || existing.source || "redirect",
    };

    statusStore.set(orderId, merged);
    latestRef.value = {
      order_id: orderId,
      payload: merged,
      transaction_status: merged.transaction_status ?? null,
      stored_at: new Date().toISOString(),
    };
  }

  if (!orderId) {
    const latest = latestRef.value;
    return NextResponse.json({
      success: true,
      order_id: latest?.order_id ?? null,
      transaction_status: latest?.transaction_status ?? null,
      data: latest?.payload ?? null,
    });
  }

  const stored =
    statusStore.get(orderId) ||
    (latestRef.value && latestRef.value.order_id === orderId
      ? latestRef.value.payload
      : null);

  return NextResponse.json({
    success: true,
    order_id: orderId,
    transaction_status: stored?.transaction_status ?? null,
    data: stored,
  });
}
