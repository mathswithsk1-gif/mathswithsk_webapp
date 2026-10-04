"use server";

import { createServerSupabaseClient, createAdminClient } from "src/lib/supabase-server";
import { invalidateCache, getEnrollmentKey, getUnlockedLecturesKey } from "src/lib/redis";
import { sendAccessGrantedEmail } from "src/lib/email";

/**
 * Helper to assert that the logged-in user is an Admin.
 * Throws an error if not authenticated or not an admin.
 */
async function verifyAdminAuth() {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    throw new Error("Unauthorized. Please log in.");
  }

  const adminSupabase = createAdminClient();
  const { data: student, error: dbError } = await adminSupabase
    .from("students")
    .select("role")
    .eq("id", user.id)
    .single();

  if (dbError || !student || student.role !== "admin") {
    throw new Error("Forbidden. Admin access required.");
  }

  return user;
}

// --- STUDENT & ENROLLMENT ACTIONS ---

export async function grantEnrollmentAction(studentId: string, courseId: string) {
  try {
    await verifyAdminAuth();
    
    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase
      .from("enrollments")
      .upsert({
        student_id: studentId,
        course_id: courseId,
        status: "active",
        granted_at: new Date().toISOString(),
      }, {
        onConflict: "student_id,course_id"
      });

    if (error) throw error;

    // Invalidate caches
    await Promise.all([
      invalidateCache(getEnrollmentKey(studentId, courseId)),
      invalidateCache(getUnlockedLecturesKey(studentId, courseId)),
    ]).catch(console.error);

    return { success: true };
  } catch (err: any) {
    console.error("Admin grant enrollment error:", err);
    return { success: false, error: err.message };
  }
}

export async function revokeEnrollmentAction(studentId: string, courseId: string) {
  try {
    await verifyAdminAuth();

    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase
      .from("enrollments")
      .update({ status: "revoked" })
      .eq("student_id", studentId)
      .eq("course_id", courseId);

    if (error) throw error;

    // Invalidate caches
    await Promise.all([
      invalidateCache(getEnrollmentKey(studentId, courseId)),
      invalidateCache(getUnlockedLecturesKey(studentId, courseId)),
    ]).catch(console.error);

    return { success: true };
  } catch (err: any) {
    console.error("Admin revoke enrollment error:", err);
    return { success: false, error: err.message };
  }
}

// --- COURSE & LECTURE ACTIONS ---

export async function createCourseAction(formData: FormData) {
  try {
    await verifyAdminAuth();

    const title = formData.get("title") as string;
    const slug = formData.get("slug") as string;
    const description = formData.get("description") as string;
    const pricePkr = parseInt(formData.get("pricePkr") as string, 10);
    const vslVideoId = formData.get("vslVideoId") as string;
    const status = formData.get("status") as "draft" | "published";

    if (!title || !slug || isNaN(pricePkr)) {
      throw new Error("Missing required fields.");
    }

    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase
      .from("courses")
      .insert({
        title,
        slug: slug.trim().toLowerCase(),
        description: description || null,
        price_pkr: pricePkr,
        vsl_video_id: vslVideoId || null,
        status: status || "draft",
      });

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error("Admin create course error:", err);
    return { success: false, error: err.message };
  }
}

export async function updateCourseStatusAction(courseId: string, status: "draft" | "published") {
  try {
    await verifyAdminAuth();

    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase
      .from("courses")
      .update({ status })
      .eq("id", courseId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error("Admin update course status error:", err);
    return { success: false, error: err.message };
  }
}

export async function createLectureAction(formData: FormData) {
  try {
    await verifyAdminAuth();

    const courseId = formData.get("courseId") as string;
    const weekNumber = parseInt(formData.get("weekNumber") as string, 10);
    const orderIndex = parseInt(formData.get("orderIndex") as string, 10);
    const title = formData.get("title") as string;
    const bunnyVideoId = formData.get("bunnyVideoId") as string;
    const durationSeconds = parseInt(formData.get("durationSeconds") as string, 10);

    if (!courseId || isNaN(weekNumber) || isNaN(orderIndex) || !title || !bunnyVideoId || isNaN(durationSeconds)) {
      throw new Error("Missing required fields.");
    }

    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase
      .from("lectures")
      .insert({
        course_id: courseId,
        week_number: weekNumber,
        order_index: orderIndex,
        title,
        bunny_video_id: bunnyVideoId,
        duration_seconds: durationSeconds,
        published_at: new Date().toISOString(),
      });

    if (error) throw error;

    // Purge unlock cache for all students enrolled in this course to refresh their unlock chain
    // (In production, we would query student IDs or flush the cache keys. To be safe, we can let TTL handle it or clear hot ones)
    return { success: true };
  } catch (err: any) {
    console.error("Admin create lecture error:", err);
    return { success: false, error: err.message };
  }
}

// --- COUPON ACTIONS ---

export async function createCouponAction(formData: FormData) {
  try {
    await verifyAdminAuth();

    const code = formData.get("code") as string;
    const discountType = formData.get("discountType") as "percent" | "fixed";
    const value = parseFloat(formData.get("value") as string);
    const maxUsesStr = formData.get("maxUses") as string;
    const expiresAtStr = formData.get("expiresAt") as string;

    if (!code || !discountType || isNaN(value)) {
      throw new Error("Missing required fields.");
    }

    const maxUses = maxUsesStr ? parseInt(maxUsesStr, 10) : null;
    const expiresAt = expiresAtStr ? new Date(expiresAtStr).toISOString() : null;

    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase
      .from("coupons")
      .insert({
        code: code.trim().toUpperCase(),
        discount_type: discountType,
        value,
        max_uses: maxUses,
        used_count: 0,
        expires_at: expiresAt,
        active: true,
      });

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error("Admin create coupon error:", err);
    return { success: false, error: err.message };
  }
}

export async function toggleCouponActiveAction(couponId: string, active: boolean) {
  try {
    await verifyAdminAuth();

    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase
      .from("coupons")
      .update({ active })
      .eq("id", couponId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error("Admin toggle coupon error:", err);
    return { success: false, error: err.message };
  }
}

export async function updateCourseAction(courseId: string, formData: FormData) {
  try {
    await verifyAdminAuth();

    const title = formData.get("title") as string;
    const slug = formData.get("slug") as string;
    const description = formData.get("description") as string;
    const pricePkr = parseInt(formData.get("pricePkr") as string, 10);
    const vslVideoId = formData.get("vslVideoId") as string;
    const status = formData.get("status") as "draft" | "published";

    if (!courseId || !title || !slug || isNaN(pricePkr)) {
      throw new Error("Missing required fields.");
    }

    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase
      .from("courses")
      .update({
        title,
        slug: slug.trim().toLowerCase(),
        description: description || null,
        price_pkr: pricePkr,
        vsl_video_id: vslVideoId || null,
        status: status || "draft",
      })
      .eq("id", courseId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error("Admin update course error:", err);
    return { success: false, error: err.message };
  }
}

export async function deleteCourseAction(courseId: string) {
  try {
    await verifyAdminAuth();

    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase
      .from("courses")
      .delete()
      .eq("id", courseId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error("Admin delete course error:", err);
    return { success: false, error: err.message };
  }
}

export async function deleteLectureAction(lectureId: string) {
  try {
    await verifyAdminAuth();

    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase
      .from("lectures")
      .delete()
      .eq("id", lectureId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error("Admin delete lecture error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Approves a manual payment request (EasyPaisa/JazzCash).
 * Set status to 'paid' and upsert an active enrollment record.
 */
export async function approveManualPaymentAction(paymentId: string) {
  try {
    await verifyAdminAuth();
    
    const adminSupabase = createAdminClient();
    
    // 1. Fetch payment details to get student_id and course_id
    const { data: payment, error: fetchError } = await adminSupabase
      .from("payments")
      .select("student_id, course_id, students(name, email), courses(title)")
      .eq("id", paymentId)
      .single();
      
    if (fetchError || !payment) {
      throw new Error("Payment request not found.");
    }
    
    // 2. Update payment status to 'paid'
    const { error: updateError } = await adminSupabase
      .from("payments")
      .update({ status: "paid" })
      .eq("id", paymentId);
      
    if (updateError) throw updateError;
    
    // 3. Upsert enrollment
    const { error: enrollError } = await adminSupabase
      .from("enrollments")
      .upsert({
        student_id: payment.student_id,
        course_id: payment.course_id,
        status: "active",
        granted_at: new Date().toISOString(),
      }, {
        onConflict: "student_id,course_id"
      });
      
    if (enrollError) throw enrollError;
    
    // 4. Invalidate caches
    await Promise.all([
      invalidateCache(getEnrollmentKey(payment.student_id, payment.course_id)),
      invalidateCache(getUnlockedLecturesKey(payment.student_id, payment.course_id)),
    ]).catch(console.error);

    // 5. Send Access Granted Confirmation Email
    try {
      const studentData = payment.students as any;
      const courseData = payment.courses as any;
      if (studentData?.email) {
        await sendAccessGrantedEmail({
          to: studentData.email,
          studentName: studentData.name || "Student",
          courseName: courseData?.title || "A-Level Mathematics",
        });
      }
    } catch (emailErr) {
      console.warn("Failed to deliver confirmation email:", emailErr);
    }
    
    return { success: true };
  } catch (err: any) {
    console.error("Admin approve manual payment error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Rejects a manual payment request by setting status to 'failed'.
 */
export async function rejectManualPaymentAction(paymentId: string) {
  try {
    await verifyAdminAuth();
    
    const adminSupabase = createAdminClient();
    
    // Update payment status to 'failed'
    const { error: updateError } = await adminSupabase
      .from("payments")
      .update({ status: "failed" })
      .eq("id", paymentId);
      
    if (updateError) throw updateError;
    
    return { success: true };
  } catch (err: any) {
    console.error("Admin reject manual payment error:", err);
    return { success: false, error: err.message };
  }
}

// --- BLOG MANAGEMENT ACTIONS ---

export async function createPostAction(formData: FormData) {
  try {
    await verifyAdminAuth();

    const title = formData.get("title") as string;
    const slug = formData.get("slug") as string;
    const content = formData.get("content") as string;
    const metaTitle = formData.get("metaTitle") as string;
    const metaDescription = formData.get("metaDescription") as string;
    const imageUrl = formData.get("imageUrl") as string;
    const status = (formData.get("status") as "draft" | "published") || "draft";

    if (!title || !slug || !content) {
      throw new Error("Title, slug, and content are required.");
    }

    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase
      .from("posts")
      .insert({
        title,
        slug: slug.trim().toLowerCase(),
        content,
        meta_title: metaTitle || title,
        meta_description: metaDescription || null,
        image_url: imageUrl || null,
        status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error("Admin create post error:", err);
    return { success: false, error: err.message };
  }
}

export async function updatePostAction(postId: string, formData: FormData) {
  try {
    await verifyAdminAuth();

    const title = formData.get("title") as string;
    const slug = formData.get("slug") as string;
    const content = formData.get("content") as string;
    const metaTitle = formData.get("metaTitle") as string;
    const metaDescription = formData.get("metaDescription") as string;
    const imageUrl = formData.get("imageUrl") as string;
    const status = formData.get("status") as "draft" | "published";

    if (!postId || !title || !slug || !content) {
      throw new Error("Missing required fields.");
    }

    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase
      .from("posts")
      .update({
        title,
        slug: slug.trim().toLowerCase(),
        content,
        meta_title: metaTitle || title,
        meta_description: metaDescription || null,
        image_url: imageUrl || null,
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", postId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error("Admin update post error:", err);
    return { success: false, error: err.message };
  }
}

export async function togglePostStatusAction(postId: string, status: "draft" | "published") {
  try {
    await verifyAdminAuth();

    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase
      .from("posts")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", postId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error("Admin toggle post status error:", err);
    return { success: false, error: err.message };
  }
}

export async function deletePostAction(postId: string) {
  try {
    await verifyAdminAuth();

    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase
      .from("posts")
      .delete()
      .eq("id", postId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error("Admin delete post error:", err);
    return { success: false, error: err.message };
  }
}


