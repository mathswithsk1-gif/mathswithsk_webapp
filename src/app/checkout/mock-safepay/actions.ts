"use server";

import { signMockWebhookPayload } from "src/lib/payments/safepay";

interface SimulationResult {
  success: boolean;
  error?: string;
}

/**
 * Server Action that signs a mock payment payload and posts it to the webhook API.
 * This simulates a successful payment event from Safepay.
 */
export async function simulateWebhookPayment(
  reference: string,
  amount: number
): Promise<SimulationResult> {
  if (!reference || isNaN(amount)) {
    return { success: false, error: "Invalid payment parameters." };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  // 1. Construct the exact JSON payload Safepay sends on payment success
  const payloadData = {
    notification: "payment.succeeded",
    data: {
      reference: reference,
      amount: amount.toString(),
      currency: "PKR",
      transaction: `trans_${Math.random().toString(36).substring(2, 11)}`,
      tracker: `track_${Math.random().toString(36).substring(2, 11)}`,
      token: `tok_${Math.random().toString(36).substring(2, 11)}`,
      gateway: "card",
      status: "success",
    },
  };

  const payloadString = JSON.stringify(payloadData);

  // 2. Sign the payload using our HMAC SHA256 function
  const signature = signMockWebhookPayload(payloadString);

  try {
    // 3. Make a real HTTP POST request to the local webhook handler
    const response = await fetch(`${siteUrl}/api/payments/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-SFPY-SIGNATURE": signature,
      },
      body: payloadString,
    });

    if (!response.ok) {
      const responseText = await response.text();
      return {
        success: false,
        error: `Webhook returned status ${response.status}: ${responseText}`,
      };
    }

    return { success: true };
  } catch (err: any) {
    console.error("Failed to post mock payment webhook:", err);
    return {
      success: false,
      error: err.message || "Network error connecting to webhook endpoint.",
    };
  }
}
