import crypto from "crypto";
import { Safepay } from "@sfpy/node-sdk";

const apiKey = process.env.SAFEPAY_API_KEY || "";
const secret = process.env.SAFEPAY_SECRET || "";
const webhookSecret = process.env.SAFEPAY_WEBHOOK_SECRET || "";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

/**
 * Mock mode is only allowed outside production. In production a missing key is a
 * configuration error, otherwise anyone could "pay" through the mock page for free.
 */
export const isMockPayment =
  apiKey === "mock" || (!apiKey && process.env.NODE_ENV !== "production");

/**
 * Safepay environment. Set SAFEPAY_ENVIRONMENT=production only when using live keys;
 * defaults to sandbox so test keys work on a production Vercel deploy.
 */
const safepayEnvironment: "sandbox" | "production" =
  process.env.SAFEPAY_ENVIRONMENT === "production" ? "production" : "sandbox";

function getSafepayClient() {
  if (!apiKey || !secret) {
    throw new Error("Online payments are not configured. Please use EasyPaisa / JazzCash or contact support.");
  }
  return new Safepay({
    environment: safepayEnvironment as any,
    apiKey,
    v1Secret: secret,
    webhookSecret,
  });
}

interface CheckoutParams {
  amount: number;
  reference: string;
  courseSlug: string;
  /** Called with the Safepay tracker token so the caller can store it against the payment */
  onTracker?: (tracker: string) => Promise<void>;
}

/**
 * Generates the redirect URL for Safepay Sandbox or production checkout.
 * Falls back to our local mock checkout route if no API key is defined.
 */
export async function generateCheckoutUrl({ amount, reference, courseSlug, onTracker }: CheckoutParams): Promise<string> {
  if (isMockPayment) {
    return `/checkout/mock-safepay?reference=${reference}&amount=${amount}&courseSlug=${courseSlug}`;
  }

  const safepay = getSafepayClient();

  try {
    const session = await safepay.payments.create({
      amount,
      currency: "PKR",
    });

    if (onTracker) await onTracker(session.token);

    // Safepay appends tracker/reference/sig to these URLs when it sends the student back
    const redirectUrl = `${siteUrl}/api/payments/safepay/return?ref=${encodeURIComponent(reference)}&course=${encodeURIComponent(courseSlug)}`;
    const cancelUrl = `${siteUrl}/checkout/${courseSlug}?payment_status=cancelled`;

    return safepay.checkout.create({
      token: session.token,
      orderId: reference,
      cancelUrl,
      redirectUrl,
      source: "custom",
      webhooks: true,
    });
  } catch (err) {
    console.error("Safepay SDK error generating checkout URL:", err);
    throw new Error("Could not start the Safepay checkout. Please try again or use a manual transfer.");
  }
}

/**
 * Verifies the signature Safepay attaches when redirecting the student back:
 * sig = HMAC-SHA256(tracker, v1Secret)
 */
export function verifyReturnSignature(tracker: string, sig: string): boolean {
  if (!tracker || !sig || !secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(tracker).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Verifies that the webhook payload is signed with the correct Safepay secret.
 * Supports multiple signature schemes for robustness.
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  timestamp?: string | null
): boolean {
  if (isMockPayment) {
    // In mock mode, we use a simple header check or verify against local test secret
    const localSecret = webhookSecret || "mock-webhook-secret";
    const hash = crypto
      .createHmac("sha256", localSecret)
      .update(payload)
      .digest("hex");
    return hash === signature;
  }

  // 1. Try modern Safepay signature format: timestamp + '.' + payload
  if (timestamp) {
    const signingPayload = `${timestamp}.${payload}`;
    
    // Check 1.a: secret as plain string, sha256
    const hashPlainSha256 = crypto
      .createHmac("sha256", webhookSecret)
      .update(signingPayload)
      .digest("hex");
    if (hashPlainSha256 === signature) return true;

    // Check 1.b: secret decoded from base64, sha256
    try {
      const decodedSecret = Buffer.from(webhookSecret, "base64");
      const hashBase64Sha256 = crypto
        .createHmac("sha256", decodedSecret)
        .update(signingPayload)
        .digest("hex");
      if (hashBase64Sha256 === signature) return true;
    } catch (e) {}

    // Check 1.c: secret decoded from hex, sha256
    try {
      const decodedSecretHex = Buffer.from(webhookSecret, "hex");
      const hashHexSha256 = crypto
        .createHmac("sha256", decodedSecretHex)
        .update(signingPayload)
        .digest("hex");
      if (hashHexSha256 === signature) return true;
    } catch (e) {}
  }

  // 2. Try raw payload hashing (fallback or legacy webhook format)
  // Check 2.a: secret as plain string, sha256
  const hashRawPlainSha256 = crypto
    .createHmac("sha256", webhookSecret)
    .update(payload)
    .digest("hex");
  if (hashRawPlainSha256 === signature) return true;

  // Check 2.b: secret decoded from base64, sha256
  try {
    const decodedSecret = Buffer.from(webhookSecret, "base64");
    const hashRawBase64Sha256 = crypto
      .createHmac("sha256", decodedSecret)
      .update(payload)
      .digest("hex");
    if (hashRawBase64Sha256 === signature) return true;
  } catch (e) {}

  // Check 2.c: secret decoded from hex, sha256
  try {
    const decodedSecretHex = Buffer.from(webhookSecret, "hex");
    const hashRawHexSha256 = crypto
      .createHmac("sha256", decodedSecretHex)
      .update(payload)
      .digest("hex");
    if (hashRawHexSha256 === signature) return true;
  } catch (e) {}

  // 3. Try SDK verify webhook format (SHA512 of parsed payload data)
  try {
    const parsed = JSON.parse(payload);
    if (parsed.data) {
      const dataStr = Buffer.from(JSON.stringify(parsed.data));
      
      const hashSdkSha512 = crypto
        .createHmac("sha512", webhookSecret)
        .update(dataStr)
        .digest("hex");
      if (hashSdkSha512 === signature) return true;

      // Hex decoded secret
      const decodedSecretHex = Buffer.from(webhookSecret, "hex");
      const hashSdkHexSha512 = crypto
        .createHmac("sha512", decodedSecretHex)
        .update(dataStr)
        .digest("hex");
      if (hashSdkHexSha512 === signature) return true;
    }
  } catch (e) {}

  console.warn("Webhook signature validation failed. None of the signature algorithms matched.");
  return false;
}

/**
 * Utility to sign a mock payload for local webhook testing
 */
export function signMockWebhookPayload(payload: string): string {
  const localSecret = webhookSecret || "mock-webhook-secret";
  return crypto
    .createHmac("sha256", localSecret)
    .update(payload)
    .digest("hex");
}

