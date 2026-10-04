import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminClient } from "src/lib/supabase-server";
import { checkEnrollment, isLectureUnlocked } from "src/lib/unlock";
import { invalidateCache, getUnlockedLecturesKey } from "src/lib/redis";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { lectureId, positionSeconds } = body;

    if (!lectureId || positionSeconds === undefined || isNaN(positionSeconds)) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    // 1. Authenticate student session
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    // 2. Fetch lecture details to get course ID and duration
    const adminSupabase = createAdminClient();
    const { data: lecture, error: lectureError } = await adminSupabase
      .from("lectures")
      .select("id, course_id, duration_seconds")
      .eq("id", lectureId)
      .single();

    if (lectureError || !lecture) {
      return NextResponse.json({ error: "Lecture not found." }, { status: 404 });
    }

    // 3. Verify active course enrollment
    const isEnrolled = await checkEnrollment(user.id, lecture.course_id);
    if (!isEnrolled) {
      return NextResponse.json({ error: "Forbidden. Not enrolled in this course." }, { status: 403 });
    }

    // 4. Verify lecture is unlocked (can't record progress on a locked lecture)
    const isUnlocked = await isLectureUnlocked(user.id, lecture.course_id, lecture.id);
    if (!isUnlocked) {
      return NextResponse.json({ error: "Forbidden. This lecture is locked." }, { status: 403 });
    }

    // 5. Query current progress (if any) to check if already completed
    const { data: existingProgress } = await adminSupabase
      .from("progress")
      .select("max_position_seconds, completed")
      .eq("student_id", user.id)
      .eq("lecture_id", lectureId)
      .single();

    const alreadyCompleted = !!existingProgress?.completed;
    const currentMaxPosition = existingProgress?.max_position_seconds || 0;

    // We only update if the new position is further than the saved max position
    const newMaxPosition = Math.max(currentMaxPosition, positionSeconds);

    // 6. Calculate completion threshold (default is 90% of duration)
    const thresholdPercentage = parseFloat(process.env.COMPLETION_THRESHOLD || "0.9");
    const completionThreshold = lecture.duration_seconds * thresholdPercentage;
    const shouldMarkCompleted = newMaxPosition >= completionThreshold;

    const isCompletedNow = alreadyCompleted || shouldMarkCompleted;
    const completedAt = isCompletedNow 
      ? (existingProgress?.completed ? (existingProgress as any).completed_at : new Date().toISOString()) 
      : null;

    // 7. Upsert progress row
    const { error: upsertError } = await adminSupabase
      .from("progress")
      .upsert({
        student_id: user.id,
        lecture_id: lectureId,
        max_position_seconds: newMaxPosition,
        completed: isCompletedNow,
        completed_at: completedAt,
        last_seen_at: new Date().toISOString(),
      }, {
        onConflict: "student_id,lecture_id"
      });

    if (upsertError) {
      console.error("Progress upsert error:", upsertError);
      return NextResponse.json({ error: "Failed to save progress." }, { status: 500 });
    }

    // 8. If course lecture was completed just now, invalidate the sequential unlock cache
    if (shouldMarkCompleted && !alreadyCompleted) {
      console.log(`Lecture ${lectureId} completed by student ${user.id}. Invalidating cache...`);
      const cacheKey = getUnlockedLecturesKey(user.id, lecture.course_id);
      await invalidateCache(cacheKey).catch((err) => 
        console.error("Failed to invalidate unlock cache:", err)
      );
    }

    return NextResponse.json({
      success: true,
      completed: isCompletedNow,
      maxPositionSeconds: newMaxPosition,
    });

  } catch (err: any) {
    console.error("Progress endpoint exception:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
