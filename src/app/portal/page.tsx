import React from "react";
import { createServerSupabaseClient, createAdminClient } from "src/lib/supabase-server";
import { PortalClient } from "./portal-client";
import { Navbar } from "src/components/navbar";
import { Footer } from "src/components/footer";

export const dynamic = "force-dynamic"; // Portal must reflect changes instantly

async function getStudentDashboardData() {
  const supabase = await createServerSupabaseClient();
  
  // 1. Get authenticated auth user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { userProfile: null, enrollments: [] };
  }

  // 2. Fetch student details from public table using admin client (to bypass RLS for quick bootstrap)
  const adminSupabase = createAdminClient();
  let { data: student, error: studentError } = await adminSupabase
    .from("students")
    .select("name, email, role")
    .eq("id", user.id)
    .single();

  // Self-healing: if student record doesn't exist in public.students, insert it
  if (studentError || !student) {
    console.warn(`Student profile missing in DB for user ${user.id}. Creating auto-profile...`);
    const fallbackName = user.user_metadata?.name || user.email?.split("@")[0] || "Student";
    const assignedRole = user.user_metadata?.role || "student";
    
    const { error: insertError } = await adminSupabase
      .from("students")
      .insert({
        id: user.id,
        name: fallbackName,
        email: user.email!,
        phone: user.user_metadata?.phone || null,
        role: assignedRole,
      });

    if (!insertError) {
      student = {
        name: fallbackName,
        email: user.email!,
        role: assignedRole,
      };
    } else {
      console.warn("Auto-profile insertion failed:", insertError);
      return { userProfile: null, enrollments: [] };
    }
  }

  // 3. Fetch active enrollments
  const { data: enrollmentsData, error: enrollError } = await adminSupabase
    .from("enrollments")
    .select("course_id, courses(id, title, slug, description)")
    .eq("student_id", user.id)
    .eq("status", "active");

  if (enrollError || !enrollmentsData || enrollmentsData.length === 0) {
    return { userProfile: student, enrollments: [] };
  }

  // 4. Calculate progress percentages for each course
  const enrollmentsWithProgress = [];

  for (const enroll of enrollmentsData) {
    const course: any = enroll.courses;
    if (!course) continue;

    // Fetch total lectures for this course
    const { count: totalLectures } = await adminSupabase
      .from("lectures")
      .select("id", { count: "exact", head: true })
      .eq("course_id", course.id);

    // Fetch completed lectures in this course for this student
    const { data: progressList } = await adminSupabase
      .from("progress")
      .select("lecture_id")
      .eq("student_id", user.id)
      .eq("completed", true);

    const completedIds = new Set(progressList ? progressList.map((p) => p.lecture_id) : []);

    // Get lecture IDs belonging to this course to calculate intersection
    const { data: courseLectures } = await adminSupabase
      .from("lectures")
      .select("id")
      .eq("course_id", course.id);

    const courseLectureIds = courseLectures ? courseLectures.map((l) => l.id) : [];
    const completedInCourse = courseLectureIds.filter((id) => completedIds.has(id)).length;

    const progressPercent = totalLectures && totalLectures > 0
      ? Math.round((completedInCourse / totalLectures) * 100)
      : 0;

    enrollmentsWithProgress.push({
      course: {
        id: course.id,
        title: course.title,
        slug: course.slug,
        description: course.description,
      },
      progressPercent,
    });
  }

  return {
    userProfile: student,
    enrollments: enrollmentsWithProgress,
  };
}

export default async function PortalPage() {
  const { userProfile, enrollments } = await getStudentDashboardData();

  return (
    <>
      <Navbar />

      <main className="flex-grow bg-slate-50/40 dark:bg-slate-950/20 min-h-[70vh]">
        <PortalClient initialEnrollments={enrollments} userProfile={userProfile} />
      </main>

      <Footer />
    </>
  );
}
