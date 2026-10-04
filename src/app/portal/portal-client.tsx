"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "src/lib/supabase";
import { signUpAction, signInAction, adminSignInAction } from "src/app/auth/actions";
import { BookOpen, BookOpenCheck, User, Phone, Mail, Lock, LogOut, ArrowRight, GraduationCap, ShieldAlert, Sparkles, Loader, Shield } from "lucide-react";

interface PortalClientProps {
  initialEnrollments: Array<{
    course: {
      id: string;
      title: string;
      slug: string;
      description: string | null;
    };
    progressPercent: number;
  }>;
  userProfile: {
    name: string;
    email: string;
    role: "student" | "admin";
  } | null;
}

export function PortalClient({ initialEnrollments, userProfile }: PortalClientProps) {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<any>(userProfile);
  const [authView, setAuthView] = useState<"login" | "register" | "admin-login">("login");
  
  // Auth Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [favoriteFood, setFavoriteFood] = useState("");
  const [adminCode, setAdminCode] = useState("");
  
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  // Sync user state on auth changes
  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data }) => {
        if (!data?.session) {
          setUser(null);
        }
      })
      .catch((err) => {
        // Silently ignore session fetch errors when offline/paused
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setUser(null);
      } else {
        // Refresh page to load server data on login
        router.refresh();
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, router]);

  // Sync state with server-side userProfile prop when it changes
  useEffect(() => {
    setUser(userProfile);
  }, [userProfile]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");

    let res;
    if (authView === "admin-login") {
      const formData = new FormData();
      formData.append("favoriteFood", favoriteFood);
      formData.append("adminCode", adminCode);
      
      res = await adminSignInAction(formData);
      
      setAuthLoading(false);
      if (!res.success) {
        setAuthError(res.error || "Admin authentication failed.");
      } else {
        window.location.href = "/portal";
      }
      return;
    }

    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);

    if (authView === "register") {
      formData.append("name", name);
      formData.append("phone", phone);
      formData.append("isAdmin", isAdmin ? "true" : "false");
      formData.append("favoriteFood", favoriteFood);
      formData.append("adminCode", adminCode);
      res = await signUpAction(formData);
    } else {
      res = await signInAction(formData);
    }

    setAuthLoading(false);
    if (!res.success) {
      setAuthError(res.error || "Authentication failed.");
    } else if (authView === "register") {
      setAuthError("Registration successful! Please log in below.");
      setAuthView("login");
      setPassword("");
    } else {
      router.refresh();
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.refresh();
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      {!user ? (
        /* PORTAL AUTHENTICATION CARD */
        <div className="max-w-md mx-auto bg-slate-50/70 dark:bg-slate-900 border border-slate-200/40 dark:border-slate-800/80 rounded-3xl p-6 md:p-8 shadow-xl space-y-6">
          <div className="text-center space-y-2">
            <Link href="/" className="inline-flex items-center gap-2.5 font-black text-2xl text-slate-900 justify-center dark:text-white">
              <span className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-extrabold text-sm shadow-sm shadow-primary/45">SK</span>
              <span>Maths with SK</span>
            </Link>
            <h2 className="text-lg font-black text-black dark:text-white pt-2">
              {authView === "admin-login"
                ? "Admin Authentication"
                : authView === "register"
                ? "Create your account"
                : "Sign in to your account"}
            </h2>
            <p className="text-xs text-slate-400">
              {authView === "admin-login"
                ? "Access instructor dashboard using security credentials."
                : authView === "register"
                ? "Join the online learning portal to master your A-Levels."
                : "Watch course lectures and track your progress."}
            </p>
          </div>

          <div className="flex gap-4 border-b border-slate-200/50 dark:border-slate-800 pb-3">
            <button
              onClick={() => {
                setAuthView("login");
                setAuthError("");
              }}
              className={`text-sm font-bold pb-1.5 border-b-2 transition-all ${
                authView === "login" ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setAuthView("register");
                setAuthError("");
              }}
              className={`text-sm font-bold pb-1.5 border-b-2 transition-all ${
                authView === "register" ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              Register Account
            </button>
          </div>

          {authError && (
            <div
              className={`p-4 rounded-xl text-xs font-semibold border ${
                authError.includes("successful")
                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-500 border-rose-500/20"
              }`}
            >
              {authError}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {/* Account Type Card Selection */}
            {authView === "register" && (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Account type
                </label>
                <div className="grid grid-cols-2 gap-4">
                  {/* Student Card */}
                  <div
                    onClick={() => setIsAdmin(false)}
                    className={`cursor-pointer p-4 rounded-2xl border transition-all flex flex-col justify-between min-h-[90px] ${
                      !isAdmin
                        ? "border-primary bg-primary/5 dark:bg-primary/10 shadow-xs"
                        : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">Student</span>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        !isAdmin ? "border-primary bg-primary" : "border-slate-300 dark:border-slate-700"
                      }`}>
                        {!isAdmin && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-white/80 leading-tight">
                      Access course portal and watch lectures.
                    </span>
                  </div>

                  {/* Admin/Staff Card */}
                  <div
                    onClick={() => setIsAdmin(true)}
                    className={`cursor-pointer p-4 rounded-2xl border transition-all flex flex-col justify-between min-h-[90px] ${
                      isAdmin
                        ? "border-primary bg-primary/5 dark:bg-primary/10 shadow-xs"
                        : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">Instructor</span>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        isAdmin ? "border-primary bg-primary" : "border-slate-300 dark:border-slate-700"
                      }`}>
                        {isAdmin && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-white/80 leading-tight">
                      Manage courses, coupons, and view analytics.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {authView === "register" && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ibrahim Malik"
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 px-4 text-sm outline-none focus:border-primary transition-colors text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                    WhatsApp / Phone
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 03001234567"
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 px-4 text-sm outline-none focus:border-primary transition-colors text-slate-900 dark:text-white"
                  />
                </div>
              </>
            )}

            {authView !== "admin-login" && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@domain.com"
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 px-4 text-sm outline-none focus:border-primary transition-colors text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 px-4 text-sm outline-none focus:border-primary transition-colors text-slate-900 dark:text-white"
                  />
                  {authView === "register" && (
                    <p className="mt-2 text-[10px] text-slate-500 dark:text-white/80 flex items-center gap-1.5">
                      <span className="shrink-0 text-slate-500">ℹ️</span>
                      <span>Must contain 1 uppercase letter, 1 number, min. 8 characters.</span>
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Custom Admin Registration parameters */}
            {authView === "register" && isAdmin && (
              <div className="mt-4 p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 space-y-4">
                <span className="block text-xs font-bold text-primary flex items-center gap-1.5 uppercase">
                  <Sparkles className="w-4 h-4" />
                  <span>Admin Verification</span>
                </span>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Favorite Food Security Question
                  </label>
                  <input
                    type="text"
                    required={isAdmin}
                    value={favoriteFood}
                    onChange={(e) => setFavoriteFood(e.target.value)}
                    placeholder="Biryani"
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs outline-none focus:border-primary transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Secret Admin Code
                  </label>
                  <input
                    type="password"
                    required={isAdmin}
                    value={adminCode}
                    onChange={(e) => setAdminCode(e.target.value)}
                    placeholder="SK_ADMIN_2026"
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>
            )}

            {/* Dedicated Admin Login fields */}
            {authView === "admin-login" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                    Favorite Dish / Food
                  </label>
                  <input
                    type="text"
                    required
                    value={favoriteFood}
                    onChange={(e) => setFavoriteFood(e.target.value)}
                    placeholder="e.g. Biryani"
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 px-4 text-sm outline-none focus:border-primary transition-colors text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                    Secret Admin Code
                  </label>
                  <input
                    type="password"
                    required
                    value={adminCode}
                    onChange={(e) => setAdminCode(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 px-4 text-sm outline-none focus:border-primary transition-colors text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full inline-flex items-center justify-center bg-gradient-to-r from-rose-500 via-primary to-indigo-600 text-white py-3.5 rounded-xl font-bold hover:opacity-95 transition-all disabled:opacity-75 shadow-lg shadow-primary/25 cursor-pointer text-sm"
            >
              {authLoading ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : authView === "admin-login" ? (
                "Authenticate Admin"
              ) : authView === "register" ? (
                "Sign up"
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <div className="text-center pt-2 flex flex-col gap-2.5">
            {authView !== "admin-login" && (
              <span className="text-xs text-slate-400">
                {authView === "register" ? "Already have an account? " : "Don't have an account? "}
                <button
                  type="button"
                  onClick={() => {
                    setAuthView(authView === "register" ? "login" : "register");
                    setAuthError("");
                  }}
                  className="text-primary hover:underline font-bold text-xs cursor-pointer"
                >
                  {authView === "register" ? "Sign in" : "Sign up"}
                </button>
              </span>
            )}
            
            {authView !== "admin-login" ? (
              <button
                type="button"
                onClick={() => {
                  setAuthView("admin-login");
                  setAuthError("");
                }}
                className="text-xs text-slate-500 hover:text-primary transition-colors flex items-center justify-center gap-1 font-bold cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Admin Login with Security Credentials</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAuthView("login");
                  setAuthError("");
                }}
                className="text-xs text-slate-500 hover:text-primary transition-colors flex items-center justify-center gap-1 font-bold cursor-pointer"
              >
                <span>Back to Student Login</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        /* PORTAL LOGGED IN DASHBOARD */
        <div className="space-y-8">
          {/* Admin Redirect banner if active role is admin */}
          {userProfile?.role === "admin" && (
            <div className="bg-rose-500/10 text-rose-500 border border-rose-500/20 p-4 rounded-2xl flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-5 h-5 shrink-0" />
                <div>
                  <span className="block text-xs font-black uppercase">Admin Account Detected</span>
                  <span className="block text-xs text-slate-500">You have access to the dashboard manager.</span>
                </div>
              </div>
              <Link
                href="/admin"
                className="bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors"
              >
                Go to Admin Panel
              </Link>
            </div>
          )}

          {/* Student Profile Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-4 text-center sm:text-left flex-col sm:flex-row">
              <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-lg">
                <GraduationCap className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-xl font-black text-black dark:text-white">
                  Welcome back, {userProfile?.name}!
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Logged in as {userProfile?.email} ({userProfile?.role})
                </p>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 text-xs font-bold uppercase text-slate-500 hover:text-rose-500 transition-colors border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 hover:bg-rose-50/50"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>

          {/* Enrolled Courses list */}
          <div className="space-y-6">
            <h2 className="text-xl font-extrabold text-black dark:text-white">
              Your Enrolled Courses
            </h2>

            {initialEnrollments.length === 0 ? (
              <div className="bg-slate-50 dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-850 space-y-4">
                <BookOpen className="w-12 h-12 text-slate-500 dark:text-slate-350 mx-auto stroke-[1.5]" />
                <div className="space-y-1">
                  <h3 className="font-bold text-black dark:text-white text-base">No active enrollments</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-350 max-w-sm mx-auto">
                    You haven't enrolled in any courses yet. Explore available courses and enroll to get instant access.
                  </p>
                </div>
                <Link
                  href="/#courses"
                  className="inline-flex items-center gap-1.5 bg-primary text-white text-xs font-bold px-5 py-3 rounded-xl shadow-md"
                >
                  <span>Explore Courses</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {initialEnrollments.map(({ course, progressPercent }) => (
                  <div
                    key={course.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                  >
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                          <BookOpen className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 font-bold px-2 py-0.5 rounded text-slate-600 dark:text-slate-400">
                          Active Access
                        </span>
                      </div>

                      <div>
                        <h3 className="font-extrabold text-black dark:text-white text-base leading-snug">
                          {course.title}
                        </h3>
                        <p className="text-xs text-slate-400 mt-2 line-clamp-2">
                          {course.description}
                        </p>
                      </div>
                    </div>

                    {/* Progress tracking display */}
                    <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-medium">Course Completed</span>
                        <span className="font-bold text-primary">{progressPercent}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <Link
                        href={`/portal/courses/${course.slug}`}
                        className="w-full inline-flex items-center justify-center gap-1.5 bg-primary/90 hover:bg-primary text-white py-3 rounded-xl text-xs font-bold transition-all mt-2"
                      >
                        <span>Start Learning</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
export default PortalClient;
