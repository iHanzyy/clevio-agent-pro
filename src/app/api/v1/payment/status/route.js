import { NextResponse } from "next/server";

const ensureStore = () => {
  if (!globalThis.__paymentStatusStore) {
    globalThis.__paymentStatusStore = new Map();
  }
  return globalThis.__paymentStatusStore;
};

const ensureSuffixStore = () => {
  if (!globalThis.__paymentSuffixStore) {
    globalThis.__paymentSuffixStore = new Map();
  }
  return globalThis.__paymentSuffixStore;
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
const suffixStore = ensureSuffixStore();
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

    let orderId = body.order_id || body.orderId || null;
    const orderSuffix = body.order_suffix || body.orderSuffix || null;

    if (!orderId && orderSuffix) {
      const mappedOrderId = suffixStore.get(orderSuffix);
      if (mappedOrderId) {
        orderId = mappedOrderId;
      }
    }

    if (!orderId) {
      console.warn("[payment-status] payload missing order_id", body);
      if (orderSuffix) {
        suffixStore.set(orderSuffix, null);
      }
      return NextResponse.json({
        success: true,
        order_id: null,
        transaction_status: null,
        data: {
          received_at: new Date().toISOString(),
          order_suffix: orderSuffix ?? null,
          source: body?.source || "n8n",
        },
      });
    }

    if (orderSuffix) {
      suffixStore.set(orderSuffix, orderId);
    }

    const isTransactionPayload = !!(
      body?.transaction_status ||
      body?.status_code ||
      body?.status_message ||
      body?.settlement_time ||
      body?.payment_type
    );

    const existing = statusStore.get(orderId) || {};
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
      order_suffix: orderSuffix || existing.order_suffix || null,
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
      return NextResponse.json(
        {
          success: true,
          stored: true,
          order_id: orderId,
          transaction_status: merged.transaction_status ?? null,
          data: merged,
        },
        { status: 200 },
      );
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
      return NextResponse.json(
        {
          success: true,
          stored: true,
          order_id: orderId,
          transaction_status: baseRecord.transaction_status ?? null,
          data: baseRecord,
        },
        { status: 200 },
      );
    }

    console.log("[payment-status] received generic payload", body);
    statusStore.set(orderId, baseRecord);
    latestRef.value = {
      order_id: orderId,
      payload: baseRecord,
      transaction_status: baseRecord.transaction_status ?? null,
      stored_at: new Date().toISOString(),
    };
    return NextResponse.json(
      {
        success: true,
        order_id: orderId,
        stored: true,
        transaction_status: baseRecord.transaction_status ?? null,
        data: baseRecord,
      },
      { status: 200 },
    );
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
  let orderId = searchParams.get("order_id") || searchParams.get("orderId");
  const orderSuffix =
    searchParams.get("order_suffix") || searchParams.get("orderSuffix") || null;

  if (!orderId && orderSuffix) {
    const mappedOrderId = suffixStore.get(orderSuffix);
    if (mappedOrderId) {
      orderId = mappedOrderId;
    }
  }

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
      order_suffix: orderSuffix || existing.order_suffix || null,
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
    return NextResponse.json({
      success: true,
      order_id: null,
      transaction_status: null,
      data: orderSuffix
        ? {
            order_suffix: orderSuffix,
            received_at: new Date().toISOString(),
            source: "redirect",
          }
        : null,
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
