import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, Calendar, Clock, ArrowRight, CheckCircle, Video, Lock, ShieldCheck } from "lucide-react";
import { createServerSupabaseClient } from "src/lib/supabase-server";
import { Navbar } from "src/components/navbar";
import { Footer } from "src/components/footer";
import { Section } from "src/components/section";
import { VideoPlayer } from "src/components/video-player";

export const dynamic = "force-dynamic"; // Ensures page reloads dynamically on Vercel

async function getCourseDetails(slug: string) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Fetch course
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .single();

    if (!courseError && course) {
      // Fetch lectures
      const { data: lectures } = await supabase
        .from("lectures")
        .select("*")
        .eq("course_id", course.id)
        .order("week_number", { ascending: true })
        .order("order_index", { ascending: true });

      return { course, lectures: lectures || [] };
    }
  } catch (err) {
    console.warn(`Error fetching course slug ${slug}, using fallback:`, err);
  }

  // Universal fallback for dynamic course slugs when database is offline/paused
  const isP1 = slug.includes("p1") || slug.includes("pure");
  const mockCourse = {
    id: "a5fa5e99-8cfb-4a5c-897d-419b457e5e32",
    title: isP1 ? "A-Level Pure Mathematics P1" : "A-Level Maths: Quadratic Equations",
    slug: slug,
    description: "Master A-Level Mathematics with step-by-step video lectures, past paper practice, handwritten notes, and anti-cheat progression gating.",
    price_pkr: 4000,
    vsl_video_id: "dQw4w9WgXcQ",
    status: "published",
  };

  const mockLectures = [
    { id: "1a3d90fc-2b63-4a1b-9f93-8bc6fa825c11", course_id: mockCourse.id, week_number: 1, order_index: 0, title: "Lecture 1.1: Introduction to Quadratics & Factoring", bunny_video_id: "dQw4w9WgXcQ", duration_seconds: 600 },
    { id: "2b4e91fd-3c74-4b2c-a0a4-9cd7fa936d22", course_id: mockCourse.id, week_number: 1, order_index: 1, title: "Lecture 1.2: Completing the Square Method", bunny_video_id: "dQw4w9WgXcQ", duration_seconds: 900 },
    { id: "3c5f92fe-4d85-4c3d-b1b5-ade8fa047e33", course_id: mockCourse.id, week_number: 1, order_index: 2, title: "Lecture 1.3: Deriving and Using the Quadratic Formula", bunny_video_id: "dQw4w9WgXcQ", duration_seconds: 1200 },
    { id: "4d6a03ff-5e96-4d4e-c2c6-bdf9fa158f44", course_id: mockCourse.id, week_number: 1, order_index: 3, title: "Lecture 1.4: Discriminant & Nature of Roots", bunny_video_id: "dQw4w9WgXcQ", duration_seconds: 800 },
  ];

  return { course: mockCourse, lectures: mockLectures };
}

// Generate static routes for published courses
export async function generateStaticParams() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase
      .from("courses")
      .select("slug")
      .eq("status", "published");

    if (data && data.length > 0) {
      return data.map((c) => ({ courseSlug: c.slug }));
    }
  } catch (e) {
    // ignore
  }

  return [{ courseSlug: "quadratic-equations" }];
}

interface PageProps {
  params: Promise<{ courseSlug: string }>;
}

export default async function CoursePage({ params }: PageProps) {
  const { courseSlug } = await params;
  const data = await getCourseDetails(courseSlug);

  if (!data) {
    notFound();
  }

  const { course, lectures } = data;

  // Group lectures by week
  const lecturesByWeek: Record<number, typeof lectures> = {};
  lectures.forEach((lecture) => {
    if (!lecturesByWeek[lecture.week_number]) {
      lecturesByWeek[lecture.week_number] = [];
    }
    lecturesByWeek[lecture.week_number].push(lecture);
  });

  const weeks = Object.keys(lecturesByWeek).map(Number).sort((a, b) => a - b);
  const totalLectures = lectures.length;
  const totalDurationMin = Math.round(
    lectures.reduce((acc, curr) => acc + curr.duration_seconds, 0) / 60
  );

  return (
    <>
      <Navbar />

      <main className="flex-grow">
        {/* HEADER HERO */}
        <Section bg="gradient" className="pt-12 pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Title / Info */}
            <div className="lg:col-span-7 space-y-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
                Full Syllabus Course
              </span>
              <h1 className="text-3xl md:text-5xl font-black text-black dark:text-white leading-tight">
                {course.title}
              </h1>
              <p className="text-slate-600 dark:text-slate-300 text-lg leading-relaxed">
                {course.description}
              </p>

              {/* Course Meta Pills */}
              <div className="flex flex-wrap gap-4 pt-2">
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900/50 px-4 py-2.5 rounded-xl text-sm font-semibold">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span>Self-Paced Learning</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900/50 px-4 py-2.5 rounded-xl text-sm font-semibold">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <span>{totalLectures} In-Depth Lectures</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900/50 px-4 py-2.5 rounded-xl text-sm font-semibold">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>{totalDurationMin} Mins of Video</span>
                </div>
              </div>
            </div>

            {/* Sticky Pricing / CTA Card */}
            <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 p-8 rounded-3xl shadow-xl space-y-6 relative">
              <div className="space-y-1">
                <span className="block text-xs text-slate-400 font-bold uppercase tracking-wider">Full Access Price</span>
                <span className="text-3xl font-black text-slate-950 dark:text-white">Rs. {course.price_pkr.toLocaleString()}</span>
                <span className="block text-xs text-slate-500">One-time payment. No monthly recurring fees.</span>
              </div>

              <div className="space-y-3.5 border-t border-b border-slate-100 dark:border-slate-800 py-6">
                <div className="flex gap-3 items-center text-sm">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>All lectures unlocked sequentially</span>
                </div>
                <div className="flex gap-3 items-center text-sm">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Anti-skip system for active progress logs</span>
                </div>
                <div className="flex gap-3 items-center text-sm">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Instructor Q&A forum & support</span>
                </div>
                <div className="flex gap-3 items-center text-sm">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Mobile-friendly study portal</span>
                </div>
              </div>

              <div className="space-y-3">
                <Link
                  href={`/checkout/${course.slug}`}
                  className="w-full inline-flex items-center justify-center gap-2 bg-primary text-white py-4 rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/95 transition-all hover:scale-[1.01]"
                >
                  <span>Enroll in Course</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <div className="flex justify-center items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Secure Checkout powered by Safepay</span>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* INTRO VIDEO FOR COURSE */}
        <Section bg="white" className="flex flex-col items-center">
          <div className="text-center max-w-2xl mb-8">
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-black dark:text-white">
              Course Outline & Lesson Video
            </h2>
            <p className="mt-2 text-slate-500 dark:text-slate-400 text-sm">
              Watch this topic overview to preview SK's teaching style on {course.title}.
            </p>
          </div>
          <div className="w-full max-w-3xl shadow-xl rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 bg-slate-950 p-2">
            <VideoPlayer
              videoId={course.vsl_video_id || "mock-vsl-video-id"}
              duration={180}
              isVSL={true}
            />
          </div>
        </Section>

        {/* CURRICULUM SYLLABUS SECTION */}
        <Section bg="muted">
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="text-center md:text-left">
              <h2 className="text-2xl md:text-3xl font-black tracking-tight text-black dark:text-white">
                Course Syllabus
              </h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Lectures are structured by week. Completing a lecture unlocks the subsequent lecture.
              </p>
            </div>

            <div className="space-y-6">
              {weeks.map((week) => (
                <div
                  key={week}
                  className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200/50 dark:border-slate-800/40 p-6 shadow-sm space-y-4"
                >
                  <h3 className="font-extrabold text-base text-black dark:text-white uppercase tracking-wider">
                    Week {week} Lessons
                  </h3>

                  <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {lecturesByWeek[week].map((lecture, index) => {
                      const mins = Math.floor(lecture.duration_seconds / 60);
                      const secs = lecture.duration_seconds % 60;
                      return (
                        <div
                          key={lecture.id}
                          className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0 text-sm text-slate-700 dark:text-slate-300"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-slate-400 dark:text-slate-500">
                              {week}.{index + 1}
                            </span>
                            <div className="flex items-center gap-2">
                              <Video className="w-4 h-4 text-slate-400 shrink-0" />
                              <span className="font-semibold">{lecture.title}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-xs font-semibold text-slate-400">
                            <span>
                              {mins}m {secs > 0 ? `${secs}s` : ""}
                            </span>
                            {index > 0 ? (
                              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded">
                                <Lock className="w-3 h-3 text-slate-400" />
                                <span>Locked</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded">
                                <CheckCircle className="w-3 h-3 text-emerald-500" />
                                <span>Free Unlocked</span>
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
        </Section>
      </main>

      <Footer />
    </>
  );
}
