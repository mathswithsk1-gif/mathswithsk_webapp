import React from "react";
import { redirect } from "next/navigation";
import { createServerSupabaseClient, createAdminClient } from "src/lib/supabase-server";
import { AdminClient } from "./admin-client";
import { Navbar } from "src/components/navbar";
import { Footer } from "src/components/footer";
import { Section } from "src/components/section";

export const dynamic = "force-dynamic"; // Admin panel must always render latest data

async function getAdminDashboardData() {
  const supabase = await createServerSupabaseClient();
  
  // 1. Authenticate user session
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect("/portal");
  }

  // 2. Query role from public.students using privileged admin client (RLS bypass)
  const adminSupabase = createAdminClient();
  const { data: studentProfile, error: dbError } = await adminSupabase
    .from("students")
    .select("role")
    .eq("id", user.id)
    .single();

  if (dbError || !studentProfile || studentProfile.role !== "admin") {
    // Redirect non-admins to the standard portal dashboard
    redirect("/portal?error=unauthorized");
  }

  // 3. Query stats aggregates
  // Revenue
  const { data: revenueData } = await adminSupabase
    .from("payments")
    .select("amount_pkr")
    .eq("status", "paid");
  
  const totalRevenue = revenueData
    ? revenueData.reduce((acc, curr) => acc + curr.amount_pkr, 0)
    : 0;

  // Students count (excluding admin users)
  const { count: studentCount } = await adminSupabase
    .from("students")
    .select("id", { count: "exact", head: true })
    .eq("role", "student");

  // Courses count
  const { count: courseCount } = await adminSupabase
    .from("courses")
    .select("id", { count: "exact", head: true });

  // Coupons count
  const { count: couponCount } = await adminSupabase
    .from("coupons")
    .select("id", { count: "exact", head: true })
    .eq("active", true);

  // 4. Query student listings (joining active enrollments)
  const { data: studentsList } = await adminSupabase
    .from("students")
    .select("*, enrollments(course_id, status)")
    .eq("role", "student")
    .order("created_at", { ascending: false });

  // 5. Query course listings
  const { data: coursesList } = await adminSupabase
    .from("courses")
    .select("*, lectures(*)")
    .order("created_at", { ascending: false });

  // Format courses with a lecture count
  const formattedCourses = coursesList
    ? coursesList.map((c) => ({
        id: c.id,
        title: c.title,
        slug: c.slug,
        price_pkr: c.price_pkr,
        description: c.description || "",
        vsl_video_id: c.vsl_video_id || "",
        status: c.status,
        lectures: c.lectures ? (c.lectures as any[]).sort((a, b) => {
          if (a.week_number !== b.week_number) return a.week_number - b.week_number;
          return a.order_index - b.order_index;
        }) : [],
        lectures_count: c.lectures ? (c.lectures as any[]).length : 0,
      }))
    : [];

  // 6. Query recent payments (joining student details and course title)
  const { data: paymentsList } = await adminSupabase
    .from("payments")
    .select("id, amount_pkr, status, gateway, gateway_ref, receipt_url, created_at, courses(title), students(name, email, phone)")
    .order("created_at", { ascending: false });

  // 7. Query coupon codes
  const { data: couponsList } = await adminSupabase
    .from("coupons")
    .select("*")
    .order("created_at", { ascending: false });

  // 8. Query blog posts
  const { data: postsList } = await adminSupabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false });

  const fallbackPosts = [
    {
      id: "e1112222-3333-4444-5555-666677778888",
      title: "How to Master Completing the Square in A-Level Maths",
      slug: "completing-the-square-guide",
      content: "Completing the square is one of the most vital techniques in A-Level Pure Mathematics...",
      meta_title: "Master Completing the Square - A-Level Maths Guide by SK",
      meta_description: "Learn how to complete the square in A-Level Mathematics with step-by-step examples...",
      image_url: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=1200&q=80",
      status: "published",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "f2223333-4444-5555-6666-777788889999",
      title: "Quadratic Formula Proof & Common Past Paper Traps",
      slug: "quadratic-formula-proof-and-traps",
      content: "### DRAFT POST - FOR ADMIN REVIEW ONLY\n\nThis article covers the formal derivation of the quadratic formula...",
      meta_title: "Quadratic Formula Proof & Exam Traps | A-Level Maths SK",
      meta_description: "Step-by-step proof of the quadratic formula and analysis of common mistakes made by students...",
      image_url: "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=1200&q=80",
      status: "draft",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  return {
    stats: {
      totalRevenue,
      totalStudents: studentCount || 0,
      totalCourses: courseCount || 0,
      totalCoupons: couponCount || 0,
    },
    students: studentsList || [],
    courses: formattedCourses,
    payments: paymentsList || [],
    coupons: couponsList || [],
    posts: postsList && postsList.length > 0 ? postsList : fallbackPosts,
  };
}

export default async function AdminPage() {
  const data = await getAdminDashboardData();

  return (
    <>
      <Navbar />

      <main className="flex-grow bg-slate-50/40 dark:bg-slate-950/20 py-8 min-h-[80vh]">
        <Section bg="white" className="rounded-3xl border border-slate-200/40 dark:border-slate-800/60 p-6 md:p-8 shadow-sm">
          <AdminClient
            stats={data.stats}
            students={data.students as any}
            courses={data.courses}
            coupons={data.coupons}
            payments={data.payments as any}
            posts={data.posts as any}
          />
        </Section>
      </main>

      <Footer />
    </>
  );
}
