import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createAdminClient } from "src/lib/supabase-server";
import { checkEnrollment, isLectureUnlocked } from "src/lib/unlock";
import { generateSignedBunnyUrl } from "src/lib/video";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lectureId = searchParams.get("lectureId");

    if (!lectureId) {
      return NextResponse.json({ error: "Missing lectureId parameter" }, { status: 400 });
    }

    // 1. Authenticate user session
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    // 2. Fetch lecture details using admin client (to fetch metadata safely)
    const adminSupabase = createAdminClient();
    const { data: lecture, error: lectureError } = await adminSupabase
      .from("lectures")
      .select("id, course_id, bunny_video_id")
      .eq("id", lectureId)
      .single();

    if (lectureError || !lecture) {
      return NextResponse.json({ error: "Lecture not found." }, { status: 404 });
    }

    // 3. Verify active course enrollment
    const isEnrolled = await checkEnrollment(user.id, lecture.course_id);
    if (!isEnrolled) {
      return NextResponse.json(
        { error: "Forbidden. You are not enrolled in this course." },
        { status: 403 }
      );
    }

    // 4. Verify lecture is unlocked sequentially
    const isUnlocked = await isLectureUnlocked(user.id, lecture.course_id, lecture.id);
    if (!isUnlocked) {
      return NextResponse.json(
        { error: "Forbidden. This lecture is locked. Complete the previous lecture first." },
        { status: 403 }
      );
    }

    // 5. Generate signed Bunny Stream URL
    const signedUrl = generateSignedBunnyUrl(lecture.bunny_video_id);

    return NextResponse.json({
      success: true,
      url: signedUrl,
    });
  } catch (err: any) {
    console.error("Video signing endpoint exception:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
