import React from "react";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createServerSupabaseClient, createAdminClient } from "src/lib/supabase-server";
import { checkEnrollment, getUnlockedLectureIds } from "src/lib/unlock";
import { Navbar } from "src/components/navbar";
import { Footer } from "src/components/footer";
import { Section } from "src/components/section";
import { BookOpen, Video, Lock, CheckCircle, ArrowLeft, Play, Clock, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic"; // Portal must reflect updates immediately

async function getCoursePortalData(slug: string) {
  const supabase = await createServerSupabaseClient();
  
  // 1. Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect("/portal");
  }

  const adminSupabase = createAdminClient();

  // 2. Fetch course by slug
  const { data: course, error: courseError } = await adminSupabase
    .from("courses")
    .select("id, title, slug, description")
    .eq("slug", slug)
    .single();

  if (courseError || !course) {
    notFound();
  }

  // 3. Verify enrollment
  const isEnrolled = await checkEnrollment(user.id, course.id);
  if (!isEnrolled) {
    redirect(`/courses/${course.slug}`);
  }

  // 4. Fetch all lectures
  const { data: lectures, error: lecturesError } = await adminSupabase
    .from("lectures")
    .select("id, week_number, order_index, title, duration_seconds")
    .eq("course_id", course.id)
    .order("week_number", { ascending: true })
    .order("order_index", { ascending: true });

  if (lecturesError || !lectures) {
    return { course, lectures: [], unlockedIds: new Set<string>(), progresses: new Map() };
  }

  // 5. Fetch unlocked lecture IDs set
  const unlockedIds = await getUnlockedLectureIds(user.id, course.id);

  // 6. Fetch progress details
  const { data: progressList } = await adminSupabase
    .from("progress")
    .select("lecture_id, max_position_seconds, completed")
    .eq("student_id", user.id);

  const progresses = new Map<string, { max_position_seconds: number; completed: boolean }>();
  if (progressList) {
    progressList.forEach((p) => {
      progresses.set(p.lecture_id, {
        max_position_seconds: Number(p.max_position_seconds),
        completed: p.completed,
      });
    });
  }

  return {
    course,
    lectures,
    unlockedIds,
    progresses,
  };
}

export default async function CoursePortalPage({
  params,
}: {
  params: Promise<{ courseSlug: string }>;
}) {
  const { courseSlug } = await params;
  const { course, lectures, unlockedIds, progresses } = await getCoursePortalData(courseSlug);

  // Group lectures by week
  const lecturesByWeek: Record<number, any[]> = {};
  lectures.forEach((lecture) => {
    if (!lecturesByWeek[lecture.week_number]) {
      lecturesByWeek[lecture.week_number] = [];
    }
    lecturesByWeek[lecture.week_number].push(lecture);
  });

  const weeks = Object.keys(lecturesByWeek).map(Number).sort((a, b) => a - b);
  const totalLectures = lectures.length;
  const completedLectures = lectures.filter((l) => progresses.get(l.id)?.completed).length;
  const progressPercent = totalLectures > 0 ? Math.round((completedLectures / totalLectures) * 100) : 0;

  return (
    <>
      <Navbar />

      <main className="flex-grow bg-slate-50/40 dark:bg-slate-950/20 py-8 min-h-[70vh]">
        <Section bg="white" className="rounded-3xl border border-slate-200/40 dark:border-slate-800/60 p-6 md:p-8 shadow-sm">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Back to Portal link */}
            <Link
              href="/portal"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-primary transition-colors uppercase"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Portal</span>
            </Link>

            {/* Course Title and overall completion progress */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end border-b border-slate-100 dark:border-slate-800 pb-8">
              <div className="md:col-span-2 space-y-3">
                <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold uppercase">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Student Classroom</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-black text-black dark:text-white">
                  {course.title}
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {course.description}
                </p>
              </div>

              {/* Progress Panel */}
              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-5 rounded-2xl space-y-3.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-semibold uppercase">Course Progress</span>
                  <span className="font-extrabold text-primary">{progressPercent}%</span>
                </div>
                <div className="h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase">
                  <span>{completedLectures} / {totalLectures} Completed</span>
                  {progressPercent === 100 && (
                    <span className="text-emerald-500 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 fill-current" />
                      <span>Certified</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Curriculum breakdown */}
            <div className="space-y-6">
              <h2 className="text-lg font-extrabold text-black dark:text-white">
                Course Study Guide
              </h2>

              <div className="space-y-6">
                {weeks.map((week) => (
                  <div
                    key={week}
                    className="bg-white dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800/60 rounded-2xl p-6 shadow-sm space-y-4"
                  >
                    <h3 className="text-xs font-black text-black dark:text-white uppercase tracking-wider">
                      Week {week} Lectures
                    </h3>

                    <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {lecturesByWeek[week].map((lecture, index) => {
                        const isUnlocked = unlockedIds.has(lecture.id);
                        const progress = progresses.get(lecture.id);
                        const isCompleted = !!progress?.completed;
                        const durationMin = Math.floor(lecture.duration_seconds / 60);

                        return (
                          <div
                            key={lecture.id}
                            className={`flex flex-col sm:flex-row sm:items-center justify-between py-4 first:pt-0 last:pb-0 ${
                              isUnlocked ? "" : "opacity-60"
                            }`}
                          >
                            {/* Left side: Number, title */}
                            <div className="flex items-start gap-3">
                              <span className="font-bold text-slate-450 text-sm mt-0.5 select-none shrink-0 w-6">
                                {week}.{index + 1}
                              </span>

                              <div className="space-y-1">
                                {isUnlocked ? (
                                  <Link
                                    href={`/portal/courses/${course.slug}/${lecture.id}`}
                                    className="font-bold text-slate-800 hover:text-primary transition-colors text-sm dark:text-slate-200 dark:hover:text-primary flex items-center gap-1.5"
                                  >
                                    <Video className="w-4 h-4 text-primary shrink-0" />
                                    <span>{lecture.title}</span>
                                  </Link>
                                ) : (
                                  <div className="font-bold text-slate-500 text-sm flex items-center gap-1.5 cursor-not-allowed select-none">
                                    <Video className="w-4 h-4 text-slate-400 shrink-0" />
                                    <span>{lecture.title}</span>
                                  </div>
                                )}
                                
                                <div className="flex items-center gap-2.5 text-xs text-slate-400">
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    <span>{durationMin} mins</span>
                                  </span>
                                  {isUnlocked && progress && !isCompleted && (
                                    <span>• Watch progress: {Math.round((progress.max_position_seconds / lecture.duration_seconds) * 100)}%</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Right side: Lock check indicators */}
                            <div className="mt-3 sm:mt-0 flex items-center gap-4 text-xs font-semibold shrink-0">
                              {isCompleted ? (
                                <div className="inline-flex items-center gap-1 text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/15">
                                  <CheckCircle className="w-3.5 h-3.5 fill-current" />
                                  <span>Completed</span>
                                </div>
                              ) : isUnlocked ? (
                                <Link
                                  href={`/portal/courses/${course.slug}/${lecture.id}`}
                                  className="inline-flex items-center gap-1 text-primary bg-primary/10 px-3 py-1.5 rounded-xl hover:bg-primary/20 transition-colors"
                                >
                                  <Play className="w-3.5 h-3.5 fill-current" />
                                  <span>Watch Lecture</span>
                                </Link>
                              ) : (
                                <div className="inline-flex items-center gap-1 text-slate-400 bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-transparent" title="Finish the previous lecture to unlock.">
                                  <Lock className="w-3.5 h-3.5" />
                                  <span>Locked</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>
      </main>

      <Footer />
    </>
  );
}
