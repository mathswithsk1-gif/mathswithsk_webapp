"use server";

import crypto from "crypto";
import { createServerSupabaseClient, createAdminClient } from "src/lib/supabase-server";
import { generateCheckoutUrl } from "src/lib/payments/safepay";

interface CouponResult {
  valid: boolean;
  error?: string;
  discountAmount?: number;
  finalPrice?: number;
  couponId?: string;
}

interface CheckoutResult {
  success: boolean;
  error?: string;
  redirectUrl?: string;
}

/**
 * Validates a coupon code and calculates the discount
 */
export async function validateCouponAction(
  code: string,
  originalPrice: number
): Promise<CouponResult> {
  if (!code) {
    return { valid: false, error: "Coupon code is empty." };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data: coupon, error } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", code.trim().toUpperCase())
      .single();

    if (error || !coupon) {
      return { valid: false, error: "Invalid coupon code." };
    }

    if (!coupon.active) {
      return { valid: false, error: "This coupon is no longer active." };
    }

    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return { valid: false, error: "This coupon has expired." };
    }

    if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
      return { valid: false, error: "This coupon has reached its maximum usage limit." };
    }

    let discountAmount = 0;
    if (coupon.discount_type === "percent") {
      discountAmount = Math.round((originalPrice * Number(coupon.value)) / 100);
    } else if (coupon.discount_type === "fixed") {
      discountAmount = Math.round(Number(coupon.value));
    }

    // Ensure price doesn't go below 0
    const finalPrice = Math.max(0, originalPrice - discountAmount);

    return {
      valid: true,
      discountAmount,
      finalPrice,
      couponId: coupon.id,
    };
  } catch (err) {
    console.error("Coupon validation error:", err);
    return { valid: false, error: "Error validating coupon. Please try again." };
  }
}

/**
 * Creates a payment session and returns the Safepay checkout redirect URL
 */
export async function createPaymentSessionAction(
  courseId: string,
  couponCode?: string
): Promise<CheckoutResult> {
  try {
    const supabase = await createServerSupabaseClient();
    
    // 1. Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "You must be logged in to purchase a course." };
    }

    const adminSupabase = createAdminClient();

    // 2. Fetch course details to get the price and slug
    const { data: course, error: courseError } = await adminSupabase
      .from("courses")
      .select("*")
      .eq("id", courseId)
      .single();

    if (courseError || !course) {
      return { success: false, error: "Course details not found." };
    }

    let finalAmount = course.price_pkr;
    let couponId: string | null = null;

    // 3. Apply coupon code if provided
    if (couponCode && couponCode.trim()) {
      const couponVal = await validateCouponAction(couponCode, course.price_pkr);
      if (!couponVal.valid) {
        return { success: false, error: couponVal.error || "Invalid coupon code applied." };
      }
      finalAmount = couponVal.finalPrice!;
      couponId = couponVal.couponId!;
    }

    // 4. Generate unique gateway reference
    const randomRefSuffix = crypto.randomBytes(6).toString("hex");
    const gatewayRef = `sk_ref_${randomRefSuffix}`;

    // 5. Insert payment record using privileged admin client (bypassing RLS)
    const { error: paymentError } = await adminSupabase
      .from("payments")
      .insert({
        student_id: user.id,
        course_id: course.id,
        amount_pkr: finalAmount,
        coupon_id: couponId,
        gateway: "safepay",
        gateway_ref: gatewayRef,
        status: finalAmount === 0 ? "paid" : "pending",
      });

    if (paymentError) {
      console.error("Payment insert error:", paymentError);
      return { success: false, error: "Failed to initialize payment session. " + paymentError.message };
    }

    // 6. If price is 0, grant direct course enrollment and redirect to portal immediately
    if (finalAmount === 0) {
      const { error: enrollError } = await adminSupabase
        .from("enrollments")
        .insert({
          student_id: user.id,
          course_id: course.id,
          status: "active",
        });

      if (enrollError) {
        console.error("Free enrollment insert error:", enrollError);
        return { success: false, error: "Failed to grant course access. " + enrollError.message };
      }

      return {
        success: true,
        redirectUrl: "/portal",
      };
    }

    // 7. Generate checkout URL
    const redirectUrl = await generateCheckoutUrl({
      amount: finalAmount,
      reference: gatewayRef,
      courseSlug: course.slug,
    });

    return {
      success: true,
      redirectUrl,
    };
  } catch (err: any) {
    console.error("Checkout session exception:", err);
    return { success: false, error: err.message || "An unexpected error occurred." };
  }
}

/**
 * Creates a manual payment request (EasyPaisa/JazzCash) and inserts a pending payment record
 */
export async function createManualPaymentRequestAction(
  courseId: string,
  gateway: "easypaisa" | "jazzcash",
  couponCode?: string,
  receiptUrl?: string
): Promise<{ success: boolean; error?: string; gatewayRef?: string }> {
  try {
    const supabase = await createServerSupabaseClient();
    
    // 1. Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "You must be logged in to register." };
    }

    const adminSupabase = createAdminClient();

    // 2. Fetch course details to get the price
    const { data: course, error: courseError } = await adminSupabase
      .from("courses")
      .select("*")
      .eq("id", courseId)
      .single();

    if (courseError || !course) {
      return { success: false, error: "Course details not found." };
    }

    let finalAmount = course.price_pkr;
    let couponId: string | null = null;

    // 3. Apply coupon code if provided
    if (couponCode && couponCode.trim()) {
      const couponVal = await validateCouponAction(couponCode, course.price_pkr);
      if (!couponVal.valid) {
        return { success: false, error: couponVal.error || "Invalid coupon code applied." };
      }
      finalAmount = couponVal.finalPrice!;
      couponId = couponVal.couponId!;
    }

    // 4. Generate unique gateway reference
    const randomRefSuffix = crypto.randomBytes(6).toString("hex");
    const gatewayRef = `sk_manual_${gateway === "easypaisa" ? "ep" : "jc"}_${randomRefSuffix}`;

    // 5. Insert pending payment record using privileged admin client (bypassing RLS)
    const { error: paymentError } = await adminSupabase
      .from("payments")
      .insert({
        student_id: user.id,
        course_id: course.id,
        amount_pkr: finalAmount,
        coupon_id: couponId,
        gateway: gateway,
        gateway_ref: gatewayRef,
        receipt_url: receiptUrl || null,
        status: "pending",
      });

    if (paymentError) {
      console.error("Manual payment insert error:", paymentError);
      return { success: false, error: "Failed to initialize manual payment: " + paymentError.message };
    }

    return {
      success: true,
      gatewayRef,
    };
  } catch (err: any) {
    console.error("Manual checkout exception:", err);
    return { success: false, error: err.message || "An unexpected error occurred." };
  }
}
