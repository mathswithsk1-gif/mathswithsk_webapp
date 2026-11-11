import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "src/lib/payments/safepay";
import { fulfillPayment } from "src/lib/payments/fulfill";

const SUCCESS_EVENTS = new Set([
  "payment:created",
  "payment:completed",
  "payment.completed",
  "payment:succeeded",
  "payment.succeeded",
]);
const SUCCESS_STATES = new Set(["PAID", "TRACKER_ENDED", "SUCCESS", "COMPLETED"]);

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get("x-sfpy-signature") || "";
    const timestamp = req.headers.get("x-sfpy-timestamp") || "";
    const rawBody = await req.text();

    if (!verifyWebhookSignature(rawBody, signature, timestamp)) {
      console.warn("Invalid webhook signature received.");
      return new NextResponse("Unauthorized: Invalid signature", { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const data = payload.data ?? {};
    const notification = typeof data.notification === "object" ? data.notification : (typeof payload.notification === "object" ? payload.notification : {});

    const eventType = String(
      (typeof payload.notification === "string" ? payload.notification : "") || data.type || payload.type || ""
    ).toLowerCase();
    const state = String(notification.state || data.state || data.status || payload.state || "").toUpperCase();

    const isSuccess = SUCCESS_EVENTS.has(eventType) || SUCCESS_STATES.has(state);
    if (!isSuccess) {
      console.log(`Ignored webhook: type=${eventType}, state=${state}`);
      return NextResponse.json({ success: true, message: `Ignored notification type: ${eventType || state}` });
    }

    // Safepay identifies the payment by tracker; mock payloads use our reference.
    const refs = [
      notification.tracker,
      data.tracker,
      payload.tracker,
      notification.order_id,
      data.order_id,
      notification.reference,
      data.reference,
      payload.reference,
    ];

    const result = await fulfillPayment(refs);
    if (!result.ok) {
      return new NextResponse(result.error, { status: result.status });
    }

    return NextResponse.json({
      success: true,
      message: result.alreadyPaid ? "Payment already processed" : "Payment processed and enrollment activated successfully.",
    });
  } catch (err: any) {
    console.error("Webhook processing exception:", err);
    return new NextResponse(err.message || "Internal Server Error", { status: 500 });
  }
}
