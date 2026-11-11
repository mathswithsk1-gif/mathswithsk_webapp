import { createAdminClient } from "src/lib/supabase-server";
import { sendAccessGrantedEmail } from "src/lib/email";
import { invalidateCache, getEnrollmentKey, getUnlockedLecturesKey } from "src/lib/redis";

export type FulfillResult =
  | { ok: true; alreadyPaid: boolean; studentId: string; courseId: string }
  | { ok: false; status: number; error: string };

/**
 * Marks a payment as paid and grants course access. Idempotent: safe to call from
 * both the Safepay webhook and the browser return URL for the same payment.
 *
 * `refs` is a list of identifiers to try (our gateway_ref and/or the Safepay tracker),
 * since different Safepay callbacks expose different fields.
 */
export async function fulfillPayment(refs: Array<string | null | undefined>): Promise<FulfillResult> {
  const candidates = Array.from(new Set(refs.filter((r): r is string => !!r && r.trim().length > 0)));
  if (candidates.length === 0) {
    return { ok: false, status: 400, error: "Missing transaction reference" };
  }

  const adminSupabase = createAdminClient();

  const { data: payment, error: fetchError } = await adminSupabase
    .from("payments")
    .select("*, courses(title), students(name, email)")
    .in("gateway_ref", candidates)
    .limit(1)
    .maybeSingle();

  if (fetchError || !payment) {
    console.error(`Payment not found for refs ${candidates.join(", ")}:`, fetchError);
    return { ok: false, status: 404, error: "Payment record not found" };
  }

  if (payment.status === "paid") {
    return { ok: true, alreadyPaid: true, studentId: payment.student_id, courseId: payment.course_id };
  }

  // Only flip pending -> paid once, even if webhook and return URL race each other
  const { data: updated, error: updateError } = await adminSupabase
    .from("payments")
    .update({ status: "paid" })
    .eq("id", payment.id)
    .neq("status", "paid")
    .select("id");

  if (updateError) {
    console.error("Failed to update payment status:", updateError);
    return { ok: false, status: 500, error: "Database error updating payment" };
  }
  if (!updated || updated.length === 0) {
    // Another request won the race and already fulfilled it
    return { ok: true, alreadyPaid: true, studentId: payment.student_id, courseId: payment.course_id };
  }

  if (payment.coupon_id) {
    try {
      const { error: rpcErr } = await adminSupabase.rpc("increment_coupon_usage", { coupon_id_param: payment.coupon_id });
      if (rpcErr) throw rpcErr;
    } catch {
      const { data: cp } = await adminSupabase.from("coupons").select("used_count").eq("id", payment.coupon_id).single();
      if (cp) {
        await adminSupabase.from("coupons").update({ used_count: cp.used_count + 1 }).eq("id", payment.coupon_id);
      }
    }
  }

  const { error: enrollmentError } = await adminSupabase
    .from("enrollments")
    .upsert(
      {
        student_id: payment.student_id,
        course_id: payment.course_id,
        status: "active",
        granted_at: new Date().toISOString(),
      },
      { onConflict: "student_id,course_id" }
    );

  if (enrollmentError) {
    console.error("Failed to grant course enrollment:", enrollmentError);
    return { ok: false, status: 500, error: "Database error creating enrollment" };
  }

  await Promise.all([
    invalidateCache(getEnrollmentKey(payment.student_id, payment.course_id)),
    invalidateCache(getUnlockedLecturesKey(payment.student_id, payment.course_id)),
  ]).catch((err) => console.error("Upstash cache invalidation failed:", err));

  const studentEmail = payment.students?.email || "";
  if (studentEmail) {
    sendAccessGrantedEmail({
      to: studentEmail,
      studentName: payment.students?.name || "Student",
      courseName: payment.courses?.title || "your enrolled course",
    }).catch((e) => console.error("Background welcome email error:", e));
  }

  return { ok: true, alreadyPaid: false, studentId: payment.student_id, courseId: payment.course_id };
}
