import React from "react";
import { redirect, notFound } from "next/navigation";
import { createServerSupabaseClient, createAdminClient } from "src/lib/supabase-server";
import { checkEnrollment, isLectureUnlocked, getUnlockedLectureIds } from "src/lib/unlock";
import { generateSignedBunnyUrl } from "src/lib/video";
import { Navbar } from "src/components/navbar";
import { Footer } from "src/components/footer";
import { Section } from "src/components/section";
import { LectureClient } from "./lecture-client";

export const dynamic = "force-dynamic";

async function getLecturePlayerDetails(slug: string, lectureId: string) {
  const supabase = await createServerSupabaseClient();
  
  // 1. Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect("/portal");
  }

  const adminSupabase = createAdminClient();

  // 2. Fetch course details
  const { data: course, error: courseError } = await adminSupabase
    .from("courses")
    .select("id, title, slug")
    .eq("slug", slug)
    .single();

  if (courseError || !course) {
    notFound();
  }

  // 3. Verify active course enrollment
  const isEnrolled = await checkEnrollment(user.id, course.id);
  if (!isEnrolled) {
    redirect(`/courses/${course.slug}`);
  }

  // 4. Verify lecture is unlocked sequentially
  const isUnlocked = await isLectureUnlocked(user.id, course.id, lectureId);
  if (!isUnlocked) {
    // Redirect to course dashboard with locked flag
    redirect(`/portal/courses/${course.slug}?locked=true`);
  }

  // 5. Fetch current lecture details
  const { data: lecture, error: lectureError } = await adminSupabase
    .from("lectures")
    .select("id, title, bunny_video_id, duration_seconds")
    .eq("id", lectureId)
    .single();

  if (lectureError || !lecture) {
    notFound();
  }

  // 6. Fetch progress
  const { data: progress } = await adminSupabase
    .from("progress")
    .select("max_position_seconds, completed")
    .eq("student_id", user.id)
    .eq("lecture_id", lectureId)
    .single();

  const maxPosition = progress ? Number(progress.max_position_seconds) : 0;
  const completed = progress ? progress.completed : false;

  // 7. Get entire lecture chain for next/prev calculations
  const { data: lectures, error: chainError } = await adminSupabase
    .from("lectures")
    .select("id")
    .eq("course_id", course.id)
    .order("week_number", { ascending: true })
    .order("order_index", { ascending: true });

  let prevLectureId: string | null = null;
  let nextLectureId: string | null = null;

  if (!chainError && lectures) {
    const currentIndex = lectures.findIndex((l) => l.id === lectureId);
    if (currentIndex > 0) {
      prevLectureId = lectures[currentIndex - 1].id;
    }
    if (currentIndex < lectures.length - 1) {
      nextLectureId = lectures[currentIndex + 1].id;
    }
  }

  // 8. Check if the next lecture is unlocked in advance (usually unlocked if this is completed)
  let isNextUnlocked = false;
  if (nextLectureId) {
    const unlockedIds = await getUnlockedLectureIds(user.id, course.id);
    isNextUnlocked = unlockedIds.has(nextLectureId);
  }

  // 9. Generate secure signed URL for Bunny Stream
  const signedUrl = generateSignedBunnyUrl(lecture.bunny_video_id);

  return {
    course,
    lecture,
    signedUrl,
    maxPosition,
    completed,
    prevLectureId,
    nextLectureId,
    isNextUnlocked,
  };
}

export default async function LecturePage({
  params,
}: {
  params: Promise<{ courseSlug: string; lectureId: string }>;
}) {
  const { courseSlug, lectureId } = await params;
  const data = await getLecturePlayerDetails(courseSlug, lectureId);

  return (
    <>
      <Navbar />

      <main className="flex-grow bg-slate-50/40 dark:bg-slate-950/20 py-8 min-h-[70vh]">
        <Section bg="white" className="rounded-3xl border border-slate-200/40 dark:border-slate-800/60 p-6 md:p-8 shadow-sm">
          <LectureClient
            course={data.course}
            lecture={data.lecture}
            signedUrl={data.signedUrl}
            initialMaxPosition={data.maxPosition}
            initialCompleted={data.completed}
            prevLectureId={data.prevLectureId}
            nextLectureId={data.nextLectureId}
            isNextUnlocked={data.isNextUnlocked}
          />
        </Section>
      </main>

      <Footer />
    </>
  );
}
