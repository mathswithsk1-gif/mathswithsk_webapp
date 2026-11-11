import { NextRequest, NextResponse } from "next/server";
import { verifyReturnSignature } from "src/lib/payments/safepay";
import { fulfillPayment } from "src/lib/payments/fulfill";

/**
 * Safepay sends the student back here after a successful payment, adding
 * `tracker` and `sig` (HMAC-SHA256 of tracker with the v1 secret) to the URL.
 * We verify the signature and grant access straight away, so the student does not
 * depend on the webhook arriving first. The webhook stays as a backup.
 */
async function handle(req: NextRequest, params: URLSearchParams) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;
  const courseSlug = params.get("course") || "";
  const ourRef = params.get("ref") || params.get("order_id") || "";
  const tracker = params.get("tracker") || "";
  const sig = params.get("sig") || "";

  const failUrl = courseSlug
    ? `${siteUrl}/checkout/${courseSlug}?payment_status=failed`
    : `${siteUrl}/portal?payment_status=failed`;

  if (!verifyReturnSignature(tracker, sig)) {
    console.warn(`Safepay return with invalid signature (tracker=${tracker}, ref=${ourRef})`);
    return NextResponse.redirect(failUrl, 303);
  }

  const result = await fulfillPayment([tracker, ourRef]);
  if (!result.ok) {
    console.error(`Safepay return fulfillment failed: ${result.error}`);
    return NextResponse.redirect(failUrl, 303);
  }

  return NextResponse.redirect(`${siteUrl}/portal?payment_status=success&ref=${encodeURIComponent(tracker)}`, 303);
}

export async function GET(req: NextRequest) {
  return handle(req, req.nextUrl.searchParams);
}

// Some Safepay flows POST the result as a form; merge it with the query string
export async function POST(req: NextRequest) {
  const params = new URLSearchParams(req.nextUrl.searchParams);
  try {
    const form = await req.formData();
    form.forEach((v, k) => {
      if (typeof v === "string") params.set(k, v);
    });
  } catch {
    // body was not form data; fall back to query only
  }
  return handle(req, params);
}
