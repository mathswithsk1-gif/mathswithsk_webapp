import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "src/lib/supabase-server";
import { verifyWebhookSignature } from "src/lib/payments/safepay";
import { sendAccessGrantedEmail } from "src/lib/email";
import { invalidateCache, getEnrollmentKey, getUnlockedLecturesKey } from "src/lib/redis";

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get("x-sfpy-signature") || "";
    const timestamp = req.headers.get("x-sfpy-timestamp") || "";
    
    // 1. Read the raw text body to verify signature accurately
    const rawBody = await req.text();

    // 2. Validate webhook signature
    const isValid = verifyWebhookSignature(rawBody, signature, timestamp);
    if (!isValid) {
      console.warn("Invalid webhook signature received.");
      return new NextResponse("Unauthorized: Invalid signature", { status: 401 });
    }

    // 3. Parse payload JSON
    const payload = JSON.parse(rawBody);
    
    // Determine the event type/action
    const eventType = typeof payload.notification === "string" 
      ? payload.notification 
      : payload.type || "";
      
    // Determine the payment status/state
    const status = payload.data?.status || 
                   payload.notification?.state || 
                   payload.state || 
                   "";

    // We accept:
    // - mock notificationType: "payment.succeeded"
    // - real webhook event types: "payment:completed", "payment.completed", "payment:succeeded", "payment.succeeded"
    const isMockSuccess = eventType === "payment.succeeded" && payload.data?.status === "success";
    const isRealSuccess = (eventType === "payment:completed" || eventType === "payment.completed" || eventType === "payment:succeeded" || eventType === "payment.succeeded");
    
    if (!isMockSuccess && !isRealSuccess) {
      console.log(`Ignored webhook notification type: ${eventType}, status: ${status}`);
      return NextResponse.json({ success: true, message: `Ignored notification type: ${eventType}` });
    }

    // Extract reference (gatewayRef in our DB)
    const reference = payload.data?.reference || 
                      payload.notification?.reference || 
                      payload.reference || 
                      "";
                      
    if (!reference) {
      return new NextResponse("Missing transaction reference", { status: 400 });
    }

    // Use payload amount if present, otherwise fallback to looking up in DB
    const amountStr = payload.data?.amount || 
                      payload.notification?.amount || 
                      payload.amount || 
                      "0";
    const amount = parseInt(amountStr, 10);

    console.log(`Processing payment webhook: event=${eventType}, ref=${reference}, amount=${amount}`);

    // 4. Initialize privileged Supabase Admin Client (RLS bypass)
    const adminSupabase = createAdminClient();

    // 5. Look up payment details and verify status (handling idempotency)
    const { data: payment, error: fetchError } = await adminSupabase
      .from("payments")
      .select("*, courses(title), students(name, email)")
      .eq("gateway_ref", reference)
      .single();

    if (fetchError || !payment) {
      console.error(`Payment not found for reference ${reference}:`, fetchError);
      return new NextResponse("Payment record not found", { status: 404 });
    }

    // Idempotence check: If payment is already paid, return 200 immediately
    if (payment.status === "paid") {
      console.log(`Payment reference ${reference} has already been processed (status=paid). Idempotency exit.`);
      return NextResponse.json({ success: true, message: "Payment already processed" });
    }

    // 6. Begin transactional update using single DB calls (since postgres handles simple updates concurrently)
    // Update payment status to paid
    const { error: updatePaymentError } = await adminSupabase
      .from("payments")
      .update({ status: "paid" })
      .eq("id", payment.id);

    if (updatePaymentError) {
      console.error("Failed to update payment status:", updatePaymentError);
      return new NextResponse("Database error updating payment", { status: 500 });
    }

    // 7. If coupon was used, increment used count
    if (payment.coupon_id) {
      // Fetch coupon count and increment it
      try {
        const { error: rpcErr } = await adminSupabase.rpc("increment_coupon_usage", { coupon_id_param: payment.coupon_id });
        if (rpcErr) throw rpcErr;
      } catch (err) {
        // Fallback if RPC is not present (standard update increment)
        const { data: cp } = await adminSupabase.from("coupons").select("used_count").eq("id", payment.coupon_id).single();
        if (cp) {
          await adminSupabase.from("coupons").update({ used_count: cp.used_count + 1 }).eq("id", payment.coupon_id);
        }
      }
    }

    // 8. Grant enrollment (insert or upsert active enrollment)
    const { error: enrollmentError } = await adminSupabase
      .from("enrollments")
      .upsert({
        student_id: payment.student_id,
        course_id: payment.course_id,
        status: "active",
        granted_at: new Date().toISOString(),
      }, {
        onConflict: "student_id,course_id"
      });

    if (enrollmentError) {
      console.error("Failed to grant course enrollment:", enrollmentError);
      return new NextResponse("Database error creating enrollment", { status: 500 });
    }

    // 9. Invalidate cached student enrollment and unlock states in Upstash Redis
    const enrollCacheKey = getEnrollmentKey(payment.student_id, payment.course_id);
    const unlockCacheKey = getUnlockedLecturesKey(payment.student_id, payment.course_id);
    
    await Promise.all([
      invalidateCache(enrollCacheKey),
      invalidateCache(unlockCacheKey),
    ]).catch((err) => console.error("Upstash cache invalidation failed:", err));

    // 10. Send transactional welcome email asynchronously
    const studentName = payment.students?.name || "Student";
    const studentEmail = payment.students?.email || "";
    const courseTitle = payment.courses?.title || "your enrolled course";

    if (studentEmail) {
      // Async trigger, do not block webhook resolution
      sendAccessGrantedEmail({
        to: studentEmail,
        studentName: studentName,
        courseName: courseTitle,
      }).catch((e) => console.error("Background welcome email error:", e));
    }

    return NextResponse.json({
      success: true,
      message: "Payment processed and enrollment activated successfully.",
    });

  } catch (err: any) {
    console.error("Webhook processing exception:", err);
    return new NextResponse(err.message || "Internal Server Error", { status: 500 });
  }
}
