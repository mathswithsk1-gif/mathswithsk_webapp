"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  BookOpen,
  DollarSign,
  Tag,
  Plus,
  Mail,
  MessageSquare,
  CheckCircle,
  XCircle,
  ToggleLeft,
  ToggleRight,
  Loader,
  PlusCircle,
  TrendingUp,
  FileVideo,
  Clock,
  Sparkles,
  FileText,
  Edit3,
  Trash2,
  Eye,
  Image as ImageIcon,
  X,
} from "lucide-react";
import { extractYouTubeId } from "src/lib/youtube";
import {
  grantEnrollmentAction,
  revokeEnrollmentAction,
  createCourseAction,
  updateCourseStatusAction,
  createLectureAction,
  createCouponAction,
  toggleCouponActiveAction,
  updateCourseAction,
  deleteCourseAction,
  deleteLectureAction,
  approveManualPaymentAction,
  rejectManualPaymentAction,
  createPostAction,
  updatePostAction,
  deletePostAction,
  togglePostStatusAction,
} from "./actions";

interface AdminClientProps {
  stats: {
    totalRevenue: number;
    totalStudents: number;
    totalCourses: number;
    totalCoupons: number;
  };
  students: Array<{
    id: string;
    name: string;
    email: string;
    phone: string | null;
    created_at: string;
    enrollments: Array<{
      course_id: string;
      status: string;
    }>;
  }>;
  courses: Array<{
    id: string;
    title: string;
    slug: string;
    price_pkr: number;
    description: string;
    vsl_video_id: string;
    status: string;
    lectures_count: number;
    lectures?: Array<{
      id: string;
      title: string;
      week_number: number;
      order_index: number;
      bunny_video_id: string;
      duration_seconds: number;
    }>;
  }>;
  coupons: Array<{
    id: string;
    code: string;
    discount_type: string;
    value: number;
    max_uses: number | null;
    used_count: number;
    expires_at: string | null;
    active: boolean;
  }>;
  payments: Array<{
    id: string;
    amount_pkr: number;
    status: string;
    gateway: string;
    gateway_ref: string;
    receipt_url?: string | null;
    created_at: string;
    courses: { title: string } | null;
    students: { name: string; email: string; phone: string | null } | null;
  }>;
  posts?: Array<{
    id: string;
    title: string;
    slug: string;
    content: string;
    meta_title: string | null;
    meta_description: string | null;
    image_url: string | null;
    status: string;
    created_at: string;
    updated_at: string;
  }>;
}

export function AdminClient({ stats, students, courses, coupons, payments, posts = [] }: AdminClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"overview" | "students" | "courses" | "coupons" | "approvals" | "blog">("overview");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // Form states
  const [courseTitle, setCourseTitle] = useState("");
  const [courseSlug, setCourseSlug] = useState("");
  const [courseDesc, setCourseDesc] = useState("");
  const [coursePrice, setCoursePrice] = useState(4000);
  const [courseVsl, setCourseVsl] = useState("");
  const [courseStatus, setCourseStatus] = useState<"draft" | "published">("draft");
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);

  const [selectedCourseId, setSelectedCourseId] = useState(courses[0]?.id || "");
  const [lectWeek, setLectWeek] = useState(1);
  const [lectOrder, setLectOrder] = useState(0);
  const [lectTitle, setLectTitle] = useState("");
  const [lectVideoId, setLectVideoId] = useState("");
  const [lectDuration, setLectDuration] = useState(600);

  const [coupCode, setCoupCode] = useState("");
  const [coupType, setCoupType] = useState<"percent" | "fixed">("percent");
  const [coupValue, setCoupValue] = useState(10);
  const [coupMaxUses, setCoupMaxUses] = useState("");
  const [coupExpiry, setCoupExpiry] = useState("");

  const [formMsg, setFormMsg] = useState("");

  // Course Delete
  const handleCourseDelete = async (courseId: string) => {
    if (!confirm("Are you sure you want to delete this course and all its data?")) return;
    setLoadingAction(`delete-course-${courseId}`);
    const res = await deleteCourseAction(courseId);
    setLoadingAction(null);
    if (res.success) {
      setFormMsg("Course deleted successfully!");
      router.refresh();
    } else {
      alert(`Error: ${res.error}`);
    }
  };

  // Lecture Delete
  const handleLectureDelete = async (lectureId: string) => {
    if (!confirm("Are you sure you want to delete this lecture?")) return;
    setLoadingAction(`delete-lecture-${lectureId}`);
    const res = await deleteLectureAction(lectureId);
    setLoadingAction(null);
    if (res.success) {
      setFormMsg("Lecture deleted successfully!");
      router.refresh();
    } else {
      alert(`Error: ${res.error}`);
    }
  };

  // Student Access Handlers
  const handleEnrollmentToggle = async (studentId: string, courseId: string, currentlyActive: boolean) => {
    const actionKey = `enroll-${studentId}-${courseId}`;
    setLoadingAction(actionKey);

    const res = currentlyActive
      ? await revokeEnrollmentAction(studentId, courseId)
      : await grantEnrollmentAction(studentId, courseId);

    setLoadingAction(null);
    if (res.success) {
      router.refresh();
    } else {
      alert(res.error || "Failed to update enrollment.");
    }
  };

  const handleApprovePayment = async (paymentId: string) => {
    if (!confirm("Are you sure you want to approve this payment? This will grant the student immediate access to the course.")) return;
    setLoadingAction(`approve-payment-${paymentId}`);
    const res = await approveManualPaymentAction(paymentId);
    setLoadingAction(null);
    if (res.success) {
      router.refresh();
    } else {
      alert(res.error || "Failed to approve payment.");
    }
  };

  const handleRejectPayment = async (paymentId: string) => {
    if (!confirm("Are you sure you want to reject this payment? This will mark the transaction as failed.")) return;
    setLoadingAction(`reject-payment-${paymentId}`);
    const res = await rejectManualPaymentAction(paymentId);
    setLoadingAction(null);
    if (res.success) {
      router.refresh();
    } else {
      alert(res.error || "Failed to reject payment.");
    }
  };

  // Course submit
  const handleCourseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMsg("");

    if (editingCourseId) {
      setLoadingAction("update-course");
      const formData = new FormData();
      formData.append("title", courseTitle);
      formData.append("slug", courseSlug);
      formData.append("description", courseDesc);
      formData.append("pricePkr", coursePrice.toString());
      formData.append("vslVideoId", courseVsl);
      formData.append("status", courseStatus);

      const res = await updateCourseAction(editingCourseId, formData);
      setLoadingAction(null);

      if (res.success) {
        setFormMsg("Course updated successfully!");
        setEditingCourseId(null);
        setCourseTitle("");
        setCourseSlug("");
        setCourseDesc("");
        setCourseVsl("");
        router.refresh();
      } else {
        setFormMsg(`Error: ${res.error}`);
      }
    } else {
      setLoadingAction("create-course");

      const formData = new FormData();
      formData.append("title", courseTitle);
      formData.append("slug", courseSlug);
      formData.append("description", courseDesc);
      formData.append("pricePkr", coursePrice.toString());
      formData.append("vslVideoId", courseVsl);
      formData.append("status", courseStatus);

      const res = await createCourseAction(formData);
      setLoadingAction(null);

      if (res.success) {
        setFormMsg("Course created successfully!");
        setCourseTitle("");
        setCourseSlug("");
        setCourseDesc("");
        setCourseVsl("");
        router.refresh();
      } else {
        setFormMsg(`Error: ${res.error}`);
      }
    }
  };

  // Toggle Course status
  const handleCourseStatusToggle = async (courseId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "published" ? "draft" : "published";
    setLoadingAction(`status-${courseId}`);
    const res = await updateCourseStatusAction(courseId, nextStatus);
    setLoadingAction(null);
    if (res.success) {
      router.refresh();
    }
  };

  // Lecture submit
  const handleLectureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMsg("");
    setLoadingAction("create-lecture");

    const cleanVideoId = extractYouTubeId(lectVideoId);

    const formData = new FormData();
    formData.append("courseId", selectedCourseId);
    formData.append("weekNumber", lectWeek.toString());
    formData.append("orderIndex", lectOrder.toString());
    formData.append("title", lectTitle);
    formData.append("bunnyVideoId", cleanVideoId || lectVideoId);
    formData.append("durationSeconds", lectDuration.toString());

    const res = await createLectureAction(formData);
    setLoadingAction(null);

    if (res.success) {
      setFormMsg("Lecture uploaded and published successfully!");
      setLectTitle("");
      setLectVideoId("");
      setLectOrder(lectOrder + 1); // Auto-increment index for convenience
      router.refresh();
    } else {
      setFormMsg(`Error: ${res.error}`);
    }
  };

  // Coupon submit
  const handleCouponSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMsg("");
    setLoadingAction("create-coupon");

    const formData = new FormData();
    formData.append("code", coupCode);
    formData.append("discountType", coupType);
    formData.append("value", coupValue.toString());
    formData.append("maxUses", coupMaxUses);
    formData.append("expiresAt", coupExpiry);

    const res = await createCouponAction(formData);
    setLoadingAction(null);

    if (res.success) {
      setFormMsg("Coupon created successfully!");
      setCoupCode("");
      setCoupMaxUses("");
      setCoupExpiry("");
      router.refresh();
    } else {
      setFormMsg(`Error: ${res.error}`);
    }
  };

  // Toggle coupon status
  const handleCouponToggle = async (couponId: string, currentActive: boolean) => {
    setLoadingAction(`coupon-${couponId}`);
    const res = await toggleCouponActiveAction(couponId, !currentActive);
    setLoadingAction(null);
    if (res.success) {
      router.refresh();
    }
  };

  // Blog Post States
  const [postTitle, setPostTitle] = useState("");
  const [postSlug, setPostSlug] = useState("");
  const [postContent, setPostContent] = useState("");
  const [postMetaTitle, setPostMetaTitle] = useState("");
  const [postMetaDesc, setPostMetaDesc] = useState("");
  const [postImageUrl, setPostImageUrl] = useState("");
  const [postStatus, setPostStatus] = useState<"draft" | "published">("draft");
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [receiptModalUrl, setReceiptModalUrl] = useState<string | null>(null);

  const resetPostForm = () => {
    setPostTitle("");
    setPostSlug("");
    setPostContent("");
    setPostMetaTitle("");
    setPostMetaDesc("");
    setPostImageUrl("");
    setPostStatus("draft");
    setEditingPostId(null);
    setShowPostModal(false);
  };

  const handleEditPostClick = (post: any) => {
    setEditingPostId(post.id);
    setPostTitle(post.title || "");
    setPostSlug(post.slug || "");
    setPostContent(post.content || "");
    setPostMetaTitle(post.meta_title || "");
    setPostMetaDesc(post.meta_description || "");
    setPostImageUrl(post.image_url || "");
    setPostStatus(post.status || "draft");
    setShowPostModal(true);
  };

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMsg("");
    setLoadingAction("save-post");

    const formData = new FormData();
    formData.append("title", postTitle);
    formData.append("slug", postSlug || postTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
    formData.append("content", postContent);
    formData.append("metaTitle", postMetaTitle || postTitle);
    formData.append("metaDescription", postMetaDesc);
    formData.append("imageUrl", postImageUrl);
    formData.append("status", postStatus);

    const res = editingPostId
      ? await updatePostAction(editingPostId, formData)
      : await createPostAction(formData);

    setLoadingAction(null);
    if (res.success) {
      setFormMsg(editingPostId ? "Post updated successfully!" : "Post created successfully!");
      resetPostForm();
      router.refresh();
    } else {
      setFormMsg(`Error: ${res.error}`);
    }
  };

  const handlePostStatusToggle = async (postId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "published" ? "draft" : "published";
    setLoadingAction(`post-status-${postId}`);
    const res = await togglePostStatusAction(postId, nextStatus);
    setLoadingAction(null);
    if (res.success) {
      router.refresh();
    }
  };

  const handlePostDelete = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this blog post?")) return;
    setLoadingAction(`delete-post-${postId}`);
    const res = await deletePostAction(postId);
    setLoadingAction(null);
    if (res.success) {
      setFormMsg("Post deleted successfully!");
      router.refresh();
    } else {
      alert(`Error: ${res.error}`);
    }
  };

  return (
    <div className="space-y-8">
      {/* HEADER NAVIGATION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-black text-black dark:text-white flex items-center gap-2">
            <span>SK Admin Dashboard</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Overview, course settings, student access controls, coupons, and blog notes.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex flex-wrap gap-2">
          {["overview", "students", "courses", "coupons", "approvals", "blog"].map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab as any);
                setFormMsg("");
              }}
              className={`text-xs font-bold px-4 py-2.5 rounded-xl uppercase tracking-wider transition-all ${
                activeTab === tab
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-md"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-900 dark:text-slate-350 dark:hover:bg-slate-800"
              }`}
            >
              {tab === "blog" ? "blog & notes" : tab === "approvals" ? "approvals (manual)" : tab === "coupons" ? "promo codes" : tab}
            </button>
          ))}
        </div>
      </div>

      {/* TABS VIEWPORT */}
      {activeTab === "overview" && (
        /* Tab 1: OVERVIEW INDEX */
        <div className="space-y-8">
          {/* KPI CARDS GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-6 rounded-3xl shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <span className="block text-xs text-slate-400 font-semibold uppercase">Total Revenue</span>
                <span className="block text-2xl font-black text-slate-900 dark:text-white">PKR {stats.totalRevenue.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-6 rounded-3xl shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <span className="block text-xs text-slate-400 font-semibold uppercase">Students Registered</span>
                <span className="block text-2xl font-black text-slate-900 dark:text-white">{stats.totalStudents}</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-6 rounded-3xl shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <span className="block text-xs text-slate-400 font-semibold uppercase">Courses Available</span>
                <span className="block text-2xl font-black text-slate-900 dark:text-white">{stats.totalCourses}</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-6 rounded-3xl shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
                <Tag className="w-6 h-6" />
              </div>
              <div>
                <span className="block text-xs text-slate-400 font-semibold uppercase">Active Coupons</span>
                <span className="block text-2xl font-black text-slate-900 dark:text-white">{stats.totalCoupons}</span>
              </div>
            </div>
          </div>

          {/* RECENT TRANSACTIONS TABLE */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h2 className="text-base font-extrabold text-black dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <span>Recent Course Transactions</span>
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-850 text-slate-400 text-xs font-bold uppercase">
                    <th className="py-3 px-2">Date</th>
                    <th className="py-3 px-2">Student Email</th>
                    <th className="py-3 px-2">Course</th>
                    <th className="py-3 px-2">Amount Paid</th>
                    <th className="py-3 px-2">Reference</th>
                    <th className="py-3 px-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No transactions recorded yet.
                      </td>
                    </tr>
                  ) : (
                    payments.map((p) => {
                      const date = new Date(p.created_at).toLocaleDateString("en-PK", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 text-slate-650 dark:text-slate-300">
                          <td className="py-3 px-2 font-medium">{date}</td>
                          <td className="py-3 px-2">{p.students?.email || "Unknown Student"}</td>
                          <td className="py-3 px-2 font-bold">{p.courses?.title || "Unknown Course"}</td>
                          <td className="py-3 px-2 font-black text-slate-950 dark:text-white">Rs. {p.amount_pkr.toLocaleString()}</td>
                          <td className="py-3 px-2 font-mono text-xs text-slate-400">{p.gateway_ref}</td>
                          <td className="py-3 px-2 text-right">
                            <span
                              className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                p.status === "paid"
                                  ? "bg-emerald-500/10 text-emerald-500"
                                  : p.status === "failed"
                                  ? "bg-rose-500/10 text-rose-500"
                                  : "bg-amber-500/10 text-amber-500"
                              }`}
                            >
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "students" && (
        /* Tab 2: STUDENTS REGISTER & ACCESS GRANTS */
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="space-y-1">
            <h2 className="text-base font-extrabold text-black dark:text-white">
              Student Directory & Enrollment Access
            </h2>
            <p className="text-xs text-slate-400">
              Grant or revoke course access manually. Launch deep contact links to WhatsApp or Email.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-850 text-slate-400 text-xs font-bold uppercase">
                  <th className="py-3 px-2">Registered Student</th>
                  <th className="py-3 px-2">Contact</th>
                  <th className="py-3 px-2">Direct Messaging</th>
                  {courses.map((c) => (
                    <th key={c.id} className="py-3 px-2 text-center">
                      {c.title.replace("A-Level Maths: ", "")} Access
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                {students.map((student) => {
                  return (
                    <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 text-slate-650 dark:text-slate-350">
                      <td className="py-3 px-2">
                        <span className="block font-bold text-slate-900 dark:text-white">{student.name}</span>
                        <span className="block text-xs text-slate-450">{student.email}</span>
                      </td>
                      <td className="py-3 px-2">
                        <span className="block font-mono text-xs">{student.phone || "No phone"}</span>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <a
                            href={`mailto:${student.email}`}
                            className="p-1.5 rounded-lg border border-slate-200 hover:border-primary hover:text-primary dark:border-slate-800 transition-colors"
                            title="Send Email"
                          >
                            <Mail className="w-4 h-4" />
                          </a>
                          {student.phone && (
                            <a
                              href={`https://wa.me/${student.phone.replace(/[^0-9]/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg border border-slate-200 hover:border-emerald-500 hover:text-emerald-500 dark:border-slate-800 transition-colors"
                              title="WhatsApp Chat"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </td>
                      {courses.map((c) => {
                        const enrollment = student.enrollments.find((e) => e.course_id === c.id);
                        const isUnlocked = enrollment && enrollment.status === "active";
                        const actionKey = `enroll-${student.id}-${c.id}`;
                        const isLoading = loadingAction === actionKey;

                        return (
                          <td key={c.id} className="py-3 px-2 text-center">
                            <button
                              disabled={isLoading}
                              onClick={() => handleEnrollmentToggle(student.id, c.id, !!isUnlocked)}
                              className={`inline-flex items-center gap-1 text-[10px] font-black uppercase px-3 py-1.5 rounded-xl transition-all border ${
                                isUnlocked
                                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-rose-500/10 hover:text-rose-500 hover:border-rose-500/20"
                                  : "bg-slate-100 text-slate-400 border-transparent hover:bg-primary/10 hover:text-primary hover:border-primary/20"
                              }`}
                            >
                              {isLoading ? (
                                <Loader className="w-3.5 h-3.5 animate-spin" />
                              ) : isUnlocked ? (
                                <>
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  <span>Active (Revoke)</span>
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Locked (Grant)</span>
                                </>
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "courses" && (
        /* Tab 3: COURSES & LECTURES EDITOR */
        <div className="space-y-8 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* COURSE CRUD */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
              <div className="space-y-1">
                <h2 className="text-base font-extrabold text-black dark:text-white">
                  {editingCourseId ? "Course Editor" : "Course Creator"}
                </h2>
                <p className="text-xs text-slate-400">
                  {editingCourseId ? "Modify pricing, details, and VSL settings for the course." : "Register a new course package in draft or published state."}
                </p>
              </div>

              {formMsg && activeTab === "courses" && (
                <div className="p-4 rounded-xl text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                  {formMsg}
                </div>
              )}

              <form onSubmit={handleCourseSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">
                    Course Title
                  </label>
                  <input
                    type="text"
                    required
                    value={courseTitle}
                    onChange={(e) => setCourseTitle(e.target.value)}
                    placeholder="e.g. A-Level Maths: Trigonometry"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl py-3 px-4 text-sm outline-none focus:border-primary transition-colors text-slate-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">
                      Slug Identifier
                    </label>
                    <input
                      type="text"
                      required
                      value={courseSlug}
                      onChange={(e) => setCourseSlug(e.target.value)}
                      placeholder="trigonometry"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl py-3 px-4 text-sm outline-none focus:border-primary transition-colors text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">
                      Price (PKR)
                    </label>
                    <input
                      type="number"
                      required
                      value={coursePrice}
                      onChange={(e) => setCoursePrice(parseInt(e.target.value, 10))}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl py-3 px-4 text-sm outline-none focus:border-primary transition-colors text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">
                    YouTube VSL Video ID / URL
                  </label>
                  <input
                    type="text"
                    value={courseVsl}
                    onChange={(e) => setCourseVsl(e.target.value)}
                    placeholder="e.g. dQw4w9WgXcQ or https://www.youtube.com/watch?v=..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl py-3 px-4 text-sm outline-none focus:border-primary transition-colors text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">
                    Course Description
                  </label>
                  <textarea
                    rows={3}
                    value={courseDesc}
                    onChange={(e) => setCourseDesc(e.target.value)}
                    placeholder="Brief synopsis of course outcomes..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl py-3 px-4 text-sm outline-none focus:border-primary transition-colors text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      checked={courseStatus === "draft"}
                      onChange={() => setCourseStatus("draft")}
                      className="w-4 h-4 text-primary"
                    />
                    <span className="text-xs font-semibold text-slate-600">Draft</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      checked={courseStatus === "published"}
                      onChange={() => setCourseStatus("published")}
                      className="w-4 h-4 text-primary"
                    />
                    <span className="text-xs font-semibold text-slate-600">Published</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loadingAction === "create-course" || loadingAction === "update-course"}
                  className="w-full inline-flex items-center justify-center gap-2 bg-primary text-white py-3.5 rounded-xl font-bold hover:bg-primary/95 transition-all cursor-pointer"
                >
                  {loadingAction === "create-course" || loadingAction === "update-course" ? (
                    <Loader className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <PlusCircle className="w-5 h-5" />
                      <span>{editingCourseId ? "Update Course" : "Create Course"}</span>
                    </>
                  )}
                </button>

                {editingCourseId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCourseId(null);
                      setCourseTitle("");
                      setCourseSlug("");
                      setCourseDesc("");
                      setCoursePrice(4000);
                      setCourseVsl("");
                      setCourseStatus("draft");
                      setFormMsg("Cancelled course editing.");
                    }}
                    className="w-full text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors uppercase pt-2 text-center cursor-pointer"
                  >
                    Cancel Edit
                  </button>
                )}
              </form>
            </div>

            {/* LECTURE CRUD */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
              <div className="space-y-1">
                <h2 className="text-base font-extrabold text-black dark:text-white">
                  Lecture Publisher
                </h2>
                <p className="text-xs text-slate-400">
                  Upload and assign a lecture video to a course.
                </p>
              </div>

              <form onSubmit={handleLectureSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">
                    Select Course Parent
                  </label>
                  <select
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl py-3 px-4 text-sm outline-none focus:border-primary transition-colors text-slate-700 dark:text-slate-200"
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title} ({c.status})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">
                    Lecture Title
                  </label>
                  <input
                    type="text"
                    required
                    value={lectTitle}
                    onChange={(e) => setLectTitle(e.target.value)}
                    placeholder="e.g. Lecture 1.2: Solving Trigonometric Functions"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl py-3 px-4 text-sm outline-none focus:border-primary transition-colors text-slate-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">
                      Week Number
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={lectWeek}
                      onChange={(e) => setLectWeek(parseInt(e.target.value, 10))}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl py-3 px-4 text-sm outline-none focus:border-primary transition-colors text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">
                      Order Index (Chain Position)
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={lectOrder}
                      onChange={(e) => setLectOrder(parseInt(e.target.value, 10))}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl py-3 px-4 text-sm outline-none focus:border-primary transition-colors text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">
                      YouTube Video ID / URL *
                    </label>
                    <input
                      type="text"
                      required
                      value={lectVideoId}
                      onChange={(e) => setLectVideoId(e.target.value)}
                      placeholder="e.g. dQw4w9WgXcQ or https://youtu.be/..."
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl py-3 px-4 text-sm outline-none focus:border-primary transition-colors text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">
                      Duration (Seconds)
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={lectDuration}
                      onChange={(e) => setLectDuration(parseInt(e.target.value, 10))}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl py-3 px-4 text-sm outline-none focus:border-primary transition-colors text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loadingAction === "create-lecture"}
                  className="w-full inline-flex items-center justify-center gap-2 bg-primary text-white py-3.5 rounded-xl font-bold hover:bg-primary/95 transition-all cursor-pointer"
                >
                  {loadingAction === "create-lecture" ? (
                    <Loader className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <FileVideo className="w-5 h-5" />
                      <span>Upload & Publish Lecture</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* COURSE DIRECTORY & LECTURES LIST */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="space-y-1">
              <h2 className="text-base font-extrabold text-black dark:text-white">
                Course Directory & Lectures Manager
              </h2>
              <p className="text-xs text-slate-400">
                Manage existing courses, edit pricing/descriptions, toggle draft/publishing, and remove lectures.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {courses.map((c) => (
                <div key={c.id} className="border border-slate-100 dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <span className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded ${c.status === "published" ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"}`}>
                        {c.status}
                      </span>
                      <span className="text-xs font-black text-primary">Rs. {c.price_pkr.toLocaleString()}</span>
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white">{c.title}</h3>
                      <p className="text-[10px] text-slate-450 mt-1">Slug: <code className="font-mono">{c.slug}</code></p>
                      <p className="text-[11px] text-slate-400 mt-2 line-clamp-2">{c.description || "No description provided."}</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                    {/* List Lectures */}
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lectures ({c.lectures_count})</h4>
                      {c.lectures && c.lectures.length > 0 ? (
                        <div className="max-h-[140px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 pr-1 space-y-1">
                          {c.lectures.map((l) => (
                            <div key={l.id} className="flex justify-between items-center py-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                              <span className="truncate max-w-[180px]"><strong className="text-slate-400 font-mono mr-1">W{l.week_number}.{l.order_index}</strong>{l.title}</span>
                              <button
                                type="button"
                                disabled={loadingAction === `delete-lecture-${l.id}`}
                                onClick={() => handleLectureDelete(l.id)}
                                className="text-[10px] text-rose-500 font-bold hover:underline"
                              >
                                {loadingAction === `delete-lecture-${l.id}` ? "Removing..." : "Remove"}
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 italic">No lectures found.</p>
                      )}
                    </div>

                    {/* Controls */}
                    <div className="flex gap-2 justify-end pt-2">
                      <button
                        onClick={() => {
                          setEditingCourseId(c.id);
                          setCourseTitle(c.title);
                          setCourseSlug(c.slug);
                          setCourseDesc(c.description || "");
                          setCoursePrice(c.price_pkr);
                          setCourseVsl(c.vsl_video_id || "");
                          setCourseStatus(c.status as any);
                          setFormMsg(`Editing course: "${c.title}"`);
                          window.scrollTo({ top: 180, behavior: "smooth" });
                        }}
                        className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        Edit Course
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCourseStatusToggle(c.id, c.status)}
                        className="bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        Toggle Status
                      </button>
                      <button
                        type="button"
                        disabled={loadingAction === `delete-course-${c.id}`}
                        onClick={() => handleCourseDelete(c.id)}
                        className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        {loadingAction === `delete-course-${c.id}` ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "coupons" && (
        /* Tab 4: COUPONS CREATOR & ACTIVE TOGGLES */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coupon Form */}
          <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-6 h-fit">
            <div className="space-y-1">
              <h2 className="text-base font-extrabold text-black dark:text-white">
                Promo Code Builder
              </h2>
              <p className="text-xs text-slate-400">
                Build a percentage or flat PKR discount code.
              </p>
            </div>

            {formMsg && activeTab === "coupons" && (
              <div className="p-4 rounded-xl text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                {formMsg}
              </div>
            )}

            <form onSubmit={handleCouponSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">
                  Promo Code (e.g. MATHS10)
                </label>
                <input
                  type="text"
                  required
                  value={coupCode}
                  onChange={(e) => setCoupCode(e.target.value)}
                  placeholder="e.g. SK500"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl py-3 px-4 text-sm outline-none focus:border-primary transition-colors font-bold uppercase"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">
                  Discount Type
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="discountType"
                      checked={coupType === "percent"}
                      onChange={() => {
                        setCoupType("percent");
                        setCoupValue(10);
                      }}
                      className="w-4 h-4 text-primary"
                    />
                    <span className="text-xs font-semibold text-slate-655">Percent Off (%)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="discountType"
                      checked={coupType === "fixed"}
                      onChange={() => {
                        setCoupType("fixed");
                        setCoupValue(500);
                      }}
                      className="w-4 h-4 text-primary"
                    />
                    <span className="text-xs font-semibold text-slate-655">Fixed Amount (PKR)</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">
                    Discount Value
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={coupValue}
                    onChange={(e) => setCoupValue(parseFloat(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl py-3 px-4 text-sm outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">
                    Max Uses (Optional)
                  </label>
                  <input
                    type="number"
                    value={coupMaxUses}
                    onChange={(e) => setCoupMaxUses(e.target.value)}
                    placeholder="Unlimited"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl py-3 px-4 text-sm outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">
                  Expiry Date (Optional)
                </label>
                <input
                  type="date"
                  value={coupExpiry}
                  onChange={(e) => setCoupExpiry(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl py-3 px-4 text-sm outline-none focus:border-primary transition-colors text-slate-650 dark:text-slate-350"
                />
              </div>

              <button
                type="submit"
                disabled={loadingAction === "create-coupon"}
                className="w-full inline-flex items-center justify-center gap-2 bg-primary text-white py-3.5 rounded-xl font-bold hover:bg-primary/95 transition-all"
              >
                {loadingAction === "create-coupon" ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    <span>Create Promo Code</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Promo Code Directory list */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-6 rounded-3xl shadow-sm space-y-4">
            <h2 className="text-base font-extrabold text-black dark:text-white">
              Promo Code Directory
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-850 text-slate-400 text-xs font-bold uppercase">
                    <th className="py-3 px-2">Code</th>
                    <th className="py-3 px-2">Discount</th>
                    <th className="py-3 px-2">Uses</th>
                    <th className="py-3 px-2">Expires</th>
                    <th className="py-3 px-2 text-right">Active Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-855 text-slate-650 dark:text-slate-350">
                  {coupons.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No promo codes created yet.
                      </td>
                    </tr>
                  ) : (
                    coupons.map((c) => {
                      const expiry = c.expires_at 
                        ? new Date(c.expires_at).toLocaleDateString("en-PK", { day: "numeric", month: "short" }) 
                        : "Never";
                      const isLoading = loadingAction === `coupon-${c.id}`;

                      return (
                        <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                          <td className="py-3 px-2 font-mono font-bold text-slate-950 dark:text-white">
                            {c.code}
                          </td>
                          <td className="py-3 px-2 font-semibold">
                            {c.discount_type === "percent" ? `${c.value}% Off` : `Rs. ${c.value.toLocaleString()} Off`}
                          </td>
                          <td className="py-3 px-2 font-medium">
                            {c.used_count} / {c.max_uses ?? "∞"}
                          </td>
                          <td className="py-3 px-2 text-xs text-slate-400">{expiry}</td>
                          <td className="py-3 px-2 text-right">
                            <button
                              disabled={isLoading}
                              onClick={() => handleCouponToggle(c.id, c.active)}
                              className={`p-1.5 rounded-lg transition-colors inline-flex ${
                                c.active ? "text-emerald-500 hover:text-rose-500" : "text-slate-400 hover:text-emerald-500"
                              }`}
                            >
                              {isLoading ? (
                                <Loader className="w-5 h-5 animate-spin" />
                              ) : c.active ? (
                                <ToggleRight className="w-7 h-7 stroke-[1.8]" />
                              ) : (
                                <ToggleLeft className="w-7 h-7 stroke-[1.8]" />
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "approvals" && (
        /* Tab 5: MANUAL PAYMENT APPROVALS */
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6 animate-fade-in">
          <div className="space-y-1">
            <h2 className="text-base font-extrabold text-black dark:text-white">
              Pending Manual Payment Approvals
            </h2>
            <p className="text-xs text-slate-400">
              Review receipt screenshots sent via WhatsApp, verify details, and click "Allow (Approve)" to unlock course access.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-850 text-slate-400 text-xs font-bold uppercase">
                  <th className="py-3 px-2">Date</th>
                  <th className="py-3 px-2">Student</th>
                  <th className="py-3 px-2">Course</th>
                  <th className="py-3 px-2">Method</th>
                  <th className="py-3 px-2">Reference</th>
                  <th className="py-3 px-2">Amount</th>
                  <th className="py-3 px-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-855 text-slate-650 dark:text-slate-300">
                {payments.filter(p => p.status === "pending" && (p.gateway === "easypaisa" || p.gateway === "jazzcash")).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No pending manual payment requests found.
                    </td>
                  </tr>
                ) : (
                  payments
                    .filter(p => p.status === "pending" && (p.gateway === "easypaisa" || p.gateway === "jazzcash"))
                    .map((p) => {
                      const date = new Date(p.created_at).toLocaleDateString("en-PK", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                      const isLoadingApprove = loadingAction === `approve-payment-${p.id}`;
                      const isLoadingReject = loadingAction === `reject-payment-${p.id}`;

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                          <td className="py-3 px-2 text-xs font-medium">{date}</td>
                          <td className="py-3 px-2">
                            <span className="block font-bold text-slate-900 dark:text-white">{p.students?.name || "Unknown Student"}</span>
                            <span className="block text-xs text-slate-450">{p.students?.email}</span>
                            {p.students?.phone && (
                              <span className="block text-xs text-slate-400 font-mono mt-0.5">{p.students?.phone}</span>
                            )}
                          </td>
                          <td className="py-3 px-2 font-bold text-xs">{p.courses?.title || "Unknown Course"}</td>
                          <td className="py-3 px-2">
                            <span className="inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-500">
                              {p.gateway}
                            </span>
                          </td>
                           <td className="py-3 px-2 font-mono text-xs text-slate-400">{p.gateway_ref}</td>
                          <td className="py-3 px-2 font-black text-slate-950 dark:text-white text-xs">Rs. {p.amount_pkr.toLocaleString()}</td>
                          <td className="py-3 px-2 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {p.receipt_url ? (
                                <button
                                  type="button"
                                  onClick={() => setReceiptModalUrl(p.receipt_url!)}
                                  className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2.5 py-1.5 rounded-xl border border-primary/20 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all cursor-pointer"
                                  title="View Receipt Screenshot"
                                >
                                  <ImageIcon className="w-3.5 h-3.5" />
                                  <span>Receipt</span>
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">No receipt</span>
                              )}

                              {p.students?.phone && (
                                <a
                                  href={`https://wa.me/${p.students.phone.replace(/[^0-9]/g, "")}?text=Hi%20${encodeURIComponent(p.students.name)}%2C%20this%20is%20SK.%20I%20am%20reviewing%20your%20payment%20request%20for%20${encodeURIComponent(p.courses?.title || "")}.`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-lg border border-slate-200 hover:border-emerald-500 hover:text-emerald-500 dark:border-slate-800 transition-colors"
                                  title="WhatsApp Chat"
                                >
                                  <MessageSquare className="w-4 h-4" />
                                </a>
                              )}
                              <button
                                disabled={isLoadingApprove || isLoadingReject}
                                onClick={() => handleApprovePayment(p.id)}
                                className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1.5 rounded-xl transition-all border bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500 hover:text-white cursor-pointer"
                              >
                                {isLoadingApprove ? (
                                  <Loader className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <>
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    <span>Allow</span>
                                  </>
                                )}
                              </button>
                              <button
                                disabled={isLoadingApprove || isLoadingReject}
                                onClick={() => handleRejectPayment(p.id)}
                                className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1.5 rounded-xl transition-all border bg-rose-500/10 text-rose-500 border-rose-500/20 hover:bg-rose-500 hover:text-white cursor-pointer"
                              >
                                {isLoadingReject ? (
                                  <Loader className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <>
                                    <XCircle className="w-3.5 h-3.5" />
                                    <span>Reject</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: BLOG & HANDWRITTEN NOTES */}
      {activeTab === "blog" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 text-white dark:bg-slate-900 border border-slate-800 p-6 rounded-3xl">
            <div>
              <h2 className="text-xl font-extrabold flex items-center gap-2">
                <FileText className="w-6 h-6 text-primary" />
                <span>Blog Posts & Handwritten Notes</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Manage public articles, SEO meta title/description tags, and embedded handwritten lecture notes.
              </p>
            </div>
            <button
              onClick={() => {
                resetPostForm();
                setShowPostModal(true);
              }}
              className="bg-primary hover:bg-primary/90 text-white font-bold text-xs px-5 py-3 rounded-2xl transition-all shadow-md inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Article</span>
            </button>
          </div>

          {/* BLOG POSTS LIST TABLE */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                All Articles ({posts.length})
              </h3>
              <span className="text-xs font-semibold text-slate-400">
                Drafts are visible here for admin review before publishing
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-850 text-slate-400 text-xs font-bold uppercase">
                    <th className="py-3 px-2">Status</th>
                    <th className="py-3 px-2">Article Title & Slug</th>
                    <th className="py-3 px-2">SEO Meta Details</th>
                    <th className="py-3 px-2">Notes Attachment</th>
                    <th className="py-3 px-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                  {posts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-xs text-slate-400">
                        No blog posts found. Click "Create New Article" to add one!
                      </td>
                    </tr>
                  ) : (
                    posts.map((post) => {
                      const isDraft = post.status === "draft";
                      const isLoadingStatus = loadingAction === `post-status-${post.id}`;
                      const isLoadingDelete = loadingAction === `delete-post-${post.id}`;

                      return (
                        <tr key={post.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50">
                          {/* Status Badge */}
                          <td className="py-4 px-2">
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                                isDraft
                                  ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                  : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                              }`}
                            >
                              {isDraft ? <Clock className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                              <span>{post.status}</span>
                            </span>
                          </td>

                          {/* Title & Slug */}
                          <td className="py-4 px-2">
                            <span className="block font-bold text-slate-900 dark:text-white text-sm">
                              {post.title}
                            </span>
                            <a
                              href={`/blog/${post.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-mono"
                            >
                              <span>/blog/{post.slug}</span>
                              <Eye className="w-3 h-3" />
                            </a>
                          </td>

                          {/* Meta Tags Preview */}
                          <td className="py-4 px-2 max-w-xs">
                            <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                              Title: {post.meta_title || post.title}
                            </span>
                            <span className="block text-[11px] text-slate-400 truncate">
                              Desc: {post.meta_description || "No description"}
                            </span>
                          </td>

                          {/* Handwritten Notes Image Preview */}
                          <td className="py-4 px-2">
                            {post.image_url ? (
                              <a
                                href={post.image_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-indigo-500 hover:underline font-semibold"
                              >
                                <ImageIcon className="w-3.5 h-3.5" />
                                <span>Attached Notes</span>
                              </a>
                            ) : (
                              <span className="text-xs text-slate-400">None</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-2 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* Toggle Status */}
                              <button
                                disabled={isLoadingStatus}
                                onClick={() => handlePostStatusToggle(post.id, post.status)}
                                className={`text-[10px] font-black uppercase px-2.5 py-1.5 rounded-xl border transition-colors cursor-pointer ${
                                  isDraft
                                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500 hover:text-white"
                                    : "bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500 hover:text-white"
                                }`}
                                title={isDraft ? "Publish Article" : "Unpublish to Draft"}
                              >
                                {isLoadingStatus ? (
                                  <Loader className="w-3.5 h-3.5 animate-spin" />
                                ) : isDraft ? (
                                  "Publish"
                                ) : (
                                  "Make Draft"
                                )}
                              </button>

                              {/* Edit */}
                              <button
                                onClick={() => handleEditPostClick(post)}
                                className="p-1.5 rounded-xl border border-slate-200 hover:border-primary hover:text-primary dark:border-slate-800 transition-colors cursor-pointer"
                                title="Edit Article"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete */}
                              <button
                                disabled={isLoadingDelete}
                                onClick={() => handlePostDelete(post.id)}
                                className="p-1.5 rounded-xl border border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white transition-colors cursor-pointer"
                                title="Delete Article"
                              >
                                {isLoadingDelete ? (
                                  <Loader className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* CREATE / EDIT ARTICLE MODAL */}
          {showPostModal && (
            <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                  <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">
                    {editingPostId ? "Edit Blog Article" : "Create New Blog Article"}
                  </h3>
                  <button
                    onClick={resetPostForm}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handlePostSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                      Article Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={postTitle}
                      onChange={(e) => {
                        setPostTitle(e.target.value);
                        if (!editingPostId) {
                          setPostSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
                          setPostMetaTitle(`${e.target.value} | Maths with SK`);
                        }
                      }}
                      placeholder="e.g. How to Master Completing the Square in A-Level Maths"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-primary text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                      URL Slug *
                    </label>
                    <input
                      type="text"
                      required
                      value={postSlug}
                      onChange={(e) => setPostSlug(e.target.value)}
                      placeholder="e.g. completing-the-square-guide"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-4 text-sm font-mono outline-none focus:border-primary text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                        SEO Meta Title Tag
                      </label>
                      <input
                        type="text"
                        value={postMetaTitle}
                        onChange={(e) => setPostMetaTitle(e.target.value)}
                        placeholder="Meta title tag for Google"
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-primary text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                        Publish Status
                      </label>
                      <select
                        value={postStatus}
                        onChange={(e) => setPostStatus(e.target.value as any)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-primary text-slate-900 dark:text-white"
                      >
                        <option value="draft">Draft (Admin Only)</option>
                        <option value="published">Published (Public)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                      SEO Meta Description Field
                    </label>
                    <textarea
                      rows={2}
                      value={postMetaDesc}
                      onChange={(e) => setPostMetaDesc(e.target.value)}
                      placeholder="Summarize article in 150-160 characters for search engine snippets..."
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-4 text-xs outline-none focus:border-primary text-slate-900 dark:text-white resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                      Handwritten Notes / Featured Image URL
                    </label>
                    <input
                      type="url"
                      value={postImageUrl}
                      onChange={(e) => setPostImageUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/photo-... or custom uploaded notes link"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-4 text-sm outline-none focus:border-primary text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                      Article Content (Supports Markdown & LaTeX Math) *
                    </label>
                    <textarea
                      rows={8}
                      required
                      value={postContent}
                      onChange={(e) => setPostContent(e.target.value)}
                      placeholder="Write your article content here..."
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 px-4 text-xs outline-none focus:border-primary text-slate-900 dark:text-white resize-y font-mono"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={resetPostForm}
                      className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loadingAction === "save-post"}
                      className="px-6 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-md hover:bg-primary/95 flex items-center gap-2 cursor-pointer"
                    >
                      {loadingAction === "save-post" ? (
                        <Loader className="w-4 h-4 animate-spin" />
                      ) : (
                        <span>{editingPostId ? "Save Changes" : "Publish / Save Article"}</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
      {/* RECEIPT SCREENSHOT PREVIEW MODAL */}
      {receiptModalUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="relative max-w-2xl w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-primary" />
                <span>Payment Receipt Screenshot</span>
              </h3>
              <button
                onClick={() => setReceiptModalUrl(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-auto flex justify-center p-3 bg-slate-950 rounded-2xl">
              <img
                src={receiptModalUrl}
                alt="Payment Receipt Screenshot"
                className="max-h-[60vh] object-contain rounded-xl shadow-lg"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setReceiptModalUrl(null)}
                className="px-6 py-2.5 rounded-full bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-bold uppercase cursor-pointer hover:opacity-90 transition-opacity"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default AdminClient;
