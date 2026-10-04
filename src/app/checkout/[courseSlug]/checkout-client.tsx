"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "src/lib/supabase";
import { signUpAction, signInAction, adminSignInAction } from "src/app/auth/actions";
import { validateCouponAction, createPaymentSessionAction, createManualPaymentRequestAction } from "src/app/checkout/actions";
import { ShieldCheck, Shield, Award, Lock, BookOpen, User, Phone, Mail, Sparkles, Loader } from "lucide-react";

interface CheckoutClientProps {
  course: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    price_pkr: number;
  };
}

export function CheckoutClient({ course }: CheckoutClientProps) {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<any>(null);
  const [authView, setAuthView] = useState<"login" | "register" | "admin-login">("register");
  
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

  // Checkout State
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  
  const [finalPrice, setFinalPrice] = useState(course.price_pkr);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"safepay" | "easypaisa" | "jazzcash">("safepay");
  const [manualSuccessRef, setManualSuccessRef] = useState<string | null>(null);
  
  // Receipt screenshot state
  const [receiptUrl, setReceiptUrl] = useState<string>("");
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setCheckoutError("Image size must be smaller than 5MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setReceiptPreview(result);
        setReceiptUrl(result);
        setCheckoutError("");
      };
      reader.readAsDataURL(file);
    }
  };

  // Check current session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  // Auth Handlers
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
        window.location.reload();
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
      // For registration, tell them to log in or auto login if config allows
      setAuthError("Registration successful! Please log in below.");
      setAuthView("login");
      setPassword(""); // Clear password
    } else {
      router.refresh();
    }
  };

  // Coupon Handler
  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;

    setCouponLoading(true);
    setCouponError("");

    const res = await validateCouponAction(couponCode, course.price_pkr);
    setCouponLoading(false);

    if (!res.valid) {
      setCouponError(res.error || "Invalid coupon code.");
      setAppliedCoupon(null);
      setFinalPrice(course.price_pkr);
    } else {
      setAppliedCoupon({
        code: couponCode.trim().toUpperCase(),
        discount: res.discountAmount,
        id: res.couponId,
      });
      setFinalPrice(res.finalPrice!);
    }
  };

  // Checkout Handler
  const handleCheckout = async () => {
    setCheckoutLoading(true);
    setCheckoutError("");

    const res = await createPaymentSessionAction(
      course.id,
      appliedCoupon ? appliedCoupon.code : undefined
    );

    setCheckoutLoading(false);

    if (!res.success) {
      setCheckoutError(res.error || "Failed to create checkout session.");
    } else if (res.redirectUrl) {
      // Redirect to Safepay sandbox or local mock pay page
      router.push(res.redirectUrl);
    }
  };

  // Manual Checkout Handler
  const handleManualCheckout = async () => {
    setCheckoutLoading(true);
    setCheckoutError("");

    const res = await createManualPaymentRequestAction(
      course.id,
      paymentMethod as "easypaisa" | "jazzcash",
      appliedCoupon ? appliedCoupon.code : undefined,
      receiptUrl || undefined
    );

    setCheckoutLoading(false);

    if (!res.success) {
      setCheckoutError(res.error || "Failed to submit manual payment request.");
    } else if (res.gatewayRef) {
      setManualSuccessRef(res.gatewayRef);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* LEFT: Auth or Checkout Action */}
      <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 rounded-3xl p-6 md:p-8 shadow-sm">
        {!user ? (
          /* USER NOT LOGGED IN - SHOW AUTH CARD */
          <div className="space-y-6">
            <h2 className="text-xl font-black text-black dark:text-white pt-2">
              {authView === "admin-login"
                ? "Admin Authentication"
                : authView === "register"
                ? "Create your account"
                : "Sign in to your account"}
            </h2>
            
            <div className="flex gap-4 border-b border-slate-200/50 dark:border-slate-800 pb-3">
              <button
                onClick={() => {
                  setAuthView("register");
                  setAuthError("");
                }}
                className={`text-sm font-bold pb-1.5 border-b-2 transition-all ${
                  authView === "register" ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                Create Account
              </button>
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
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 px-4 text-sm outline-none focus:border-primary transition-colors text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                      WhatsApp/Phone (Optional)
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 03001234567"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 px-4 text-sm outline-none focus:border-primary transition-colors text-slate-900 dark:text-white"
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
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 px-4 text-sm outline-none focus:border-primary transition-colors text-slate-900 dark:text-white"
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
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 px-4 text-sm outline-none focus:border-primary transition-colors text-slate-900 dark:text-white"
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

              {/* ADMIN REGISTRATION TOGGLE */}
              {authView === "register" && isAdmin && (
                <div className="mt-4 p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 space-y-4 animate-fade-in">
                  <span className="block text-xs font-bold text-primary flex items-center gap-1.5 uppercase">
                    <Sparkles className="w-4 h-4" />
                    <span>Admin Verification Required</span>
                  </span>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Security Question: What is your favorite food?
                    </label>
                    <input
                      type="text"
                      required={isAdmin}
                      value={favoriteFood}
                      onChange={(e) => setFavoriteFood(e.target.value)}
                      placeholder="Biryani"
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs outline-none focus:border-primary transition-colors text-slate-900 dark:text-white"
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
                      placeholder="Enter secret code"
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs outline-none focus:border-primary transition-colors text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {/* Dedicated Admin Login fields */}
              {authView === "admin-login" && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                      Favorite Food / Dish
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
          /* USER LOGGED IN - SHOW PAYMENT TRIGGER */
          <div className="space-y-8">
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800/60 p-4 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                  {user.email.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <span className="block text-xs text-slate-400 font-semibold uppercase">Logged in as</span>
                  <span className="block text-sm font-bold text-slate-700 dark:text-slate-300">{user.email}</span>
                </div>
              </div>
              <button
                onClick={() => supabase.auth.signOut()}
                className="text-xs text-rose-500 hover:text-rose-600 font-bold uppercase transition-colors"
              >
                Sign Out
              </button>
            </div>

            {manualSuccessRef ? (
              /* MANUAL SUCCESS VIEW */
              <div className="space-y-6 text-center py-4">
                <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-[#0f172b] dark:text-white">
                  Payment Request Submitted!
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-md mx-auto">
                  Your manual payment request for **{course.title}** has been sent to the instructor. 
                  Please transfer Rs. **{finalPrice.toLocaleString()}** and send the screenshot of the receipt via WhatsApp.
                </p>
                
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800/80 p-4 rounded-2xl max-w-sm mx-auto text-left space-y-2">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Method:</span>
                    <span className="font-bold uppercase text-slate-700 dark:text-slate-300">{paymentMethod}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Reference ID:</span>
                    <span className="font-mono font-bold text-primary">{manualSuccessRef}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Account Title:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">Maths with SK</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Number:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {paymentMethod === "easypaisa" ? "0300-1234567" : "0301-7654321"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                  <a
                    href={`https://wa.me/923001234567?text=Hi%20SK%2C%20I%20have%20transferred%20the%20fee%20of%20Rs.%20${finalPrice}%20for%20the%20course%20${encodeURIComponent(course.title)}.%20My%20email%20is%20${encodeURIComponent(user.email)}.%20Here%20is%20my%20screenshot%20and%20payment%20reference%3A%20${manualSuccessRef}.`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs tracking-wider uppercase px-6 py-3.5 rounded-full transition-all text-center flex items-center justify-center gap-2"
                  >
                    <span>Send Receipt on WhatsApp</span>
                  </a>
                  <button
                    onClick={() => router.push("/portal")}
                    className="border border-[#0f172b] text-[#0f172b] dark:border-white dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 font-black text-xs tracking-wider uppercase px-6 py-3.5 rounded-full transition-all text-center cursor-pointer"
                  >
                    <span>Go to Portal</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Checkout Action Panel */
              <div className="space-y-6">
                {finalPrice > 0 && (
                  <>
                    <h2 className="text-xl font-extrabold text-black dark:text-white">
                      Payment Option
                    </h2>

                    {/* SELECT PAYMENT METHOD TABS */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Safepay Selector Card */}
                      <div
                        onClick={() => setPaymentMethod("safepay")}
                        className={`cursor-pointer p-4 rounded-2xl border transition-all flex flex-col justify-between min-h-[90px] ${
                          paymentMethod === "safepay"
                            ? "border-primary bg-primary/5 dark:bg-primary/10 shadow-xs"
                            : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">Safepay</span>
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            paymentMethod === "safepay" ? "border-primary bg-primary" : "border-slate-300 dark:border-slate-700"
                          }`}>
                            {paymentMethod === "safepay" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-450 leading-tight">
                          Instant activation. Visa / Mastercard / Wallets.
                        </span>
                      </div>

                      {/* EasyPaisa Selector Card */}
                      <div
                        onClick={() => setPaymentMethod("easypaisa")}
                        className={`cursor-pointer p-4 rounded-2xl border transition-all flex flex-col justify-between min-h-[90px] ${
                          paymentMethod === "easypaisa"
                            ? "border-primary bg-primary/5 dark:bg-primary/10 shadow-xs"
                            : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">EasyPaisa</span>
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            paymentMethod === "easypaisa" ? "border-primary bg-primary" : "border-slate-300 dark:border-slate-700"
                          }`}>
                            {paymentMethod === "easypaisa" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-450 leading-tight">
                          Manual transfer. WhatsApp screenshot.
                        </span>
                      </div>

                      {/* JazzCash Selector Card */}
                      <div
                        onClick={() => setPaymentMethod("jazzcash")}
                        className={`cursor-pointer p-4 rounded-2xl border transition-all flex flex-col justify-between min-h-[90px] ${
                          paymentMethod === "jazzcash"
                            ? "border-primary bg-primary/5 dark:bg-primary/10 shadow-xs"
                            : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">JazzCash</span>
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            paymentMethod === "jazzcash" ? "border-primary bg-primary" : "border-slate-300 dark:border-slate-700"
                          }`}>
                            {paymentMethod === "jazzcash" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-450 leading-tight">
                          Manual transfer. WhatsApp screenshot.
                        </span>
                      </div>
                    </div>
                  </>
                )}

                {/* Manual details instructions box if paymentMethod is 'easypaisa' or 'jazzcash' */}
                {finalPrice > 0 && paymentMethod !== "safepay" && (
                  <div className="p-5 rounded-2xl bg-[#0f172b]/5 dark:bg-slate-900/60 border border-[#0f172b]/15 dark:border-slate-800 space-y-4 animate-fade-in text-slate-700 dark:text-slate-350 text-xs">
                    <h4 className="font-extrabold text-[#0f172b] dark:text-white uppercase tracking-wider text-[11px]">
                      Transfer Instructions ({paymentMethod === "easypaisa" ? "EasyPaisa" : "JazzCash"})
                    </h4>
                    <div className="space-y-2">
                      <p>
                        1. Transfer Rs. <strong className="text-primary font-black">{finalPrice.toLocaleString()}</strong> to the following account:
                      </p>
                      <div className="bg-white dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200/50 dark:border-slate-850 font-medium space-y-1 text-[#0f172b] dark:text-white font-mono text-xs">
                        <div>Account Title: <strong>Sadiq Khan (SK)</strong></div>
                        <div>Account Number: <strong>{paymentMethod === "easypaisa" ? "0300-1234567" : "0301-7654321"}</strong></div>
                      </div>
                      
                      <div className="pt-2">
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-2">
                          2. Upload Payment Receipt Screenshot *
                        </label>
                        <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 bg-white dark:bg-slate-950 text-center hover:border-primary transition-colors cursor-pointer group">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleReceiptChange}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                          />
                          {receiptPreview ? (
                            <div className="space-y-2">
                              <img
                                src={receiptPreview}
                                alt="Receipt Screenshot"
                                className="max-h-36 mx-auto rounded-lg border border-slate-200 dark:border-slate-800 object-contain shadow-sm"
                              />
                              <p className="text-[11px] text-emerald-500 font-bold">✓ Screenshot Attached. Click to replace.</p>
                            </div>
                          ) : (
                            <div className="space-y-1 py-2">
                              <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-1">
                                <Sparkles className="w-5 h-5" />
                              </div>
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                Click or Drag Payment Screenshot Here
                              </p>
                              <p className="text-[10px] text-slate-400">JPG, PNG or WEBP (Max 5MB)</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <p className="pt-1">
                        3. Click <strong>"Submit Payment Request"</strong> below to send your receipt directly to the instructor's dashboard for verification!
                      </p>
                    </div>
                  </div>
                )}

                {checkoutError && (
                  <div className="p-4 rounded-xl text-sm font-semibold border bg-rose-500/10 text-rose-500 border-rose-500/20">
                    {checkoutError}
                  </div>
                )}

                <div className="border border-slate-100 dark:border-slate-800 rounded-3xl p-6 bg-slate-50/20 space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Standard Tuition Fee</span>
                    <span className="font-bold text-slate-900 dark:text-white">Rs. {course.price_pkr.toLocaleString()}</span>
                  </div>

                  {appliedCoupon && (
                    <div className="flex justify-between items-center text-sm text-emerald-500">
                      <span className="font-medium flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 fill-current" />
                        <span>Coupon Discount ({appliedCoupon.code})</span>
                      </span>
                      <span className="font-bold">- Rs. {appliedCoupon.discount.toLocaleString()}</span>
                    </div>
                  )}

                  <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex justify-between items-center text-base">
                    <span className="font-black text-slate-900 dark:text-white">Payable Total</span>
                    <span className="text-2xl font-black text-primary">Rs. {finalPrice.toLocaleString()}</span>
                  </div>
                </div>

                <button
                  onClick={finalPrice === 0 ? handleCheckout : (paymentMethod === "safepay" ? handleCheckout : handleManualCheckout)}
                  disabled={checkoutLoading}
                  className="w-full inline-flex items-center justify-center gap-2 bg-primary text-white py-4 rounded-xl font-bold shadow-xl shadow-primary/20 hover:bg-primary/95 transition-all hover:scale-[1.01] disabled:opacity-70 cursor-pointer"
                >
                  {checkoutLoading ? (
                    <Loader className="w-5 h-5 animate-spin" />
                  ) : finalPrice === 0 ? (
                    <>
                      <span>Claim Free Course Access</span>
                      <ShieldCheck className="w-5 h-5" />
                    </>
                  ) : paymentMethod === "safepay" ? (
                    <>
                      <span>Proceed to Secure Payment</span>
                      <ShieldCheck className="w-5 h-5" />
                    </>
                  ) : (
                    <>
                      <span>Submit Payment Request</span>
                      <ShieldCheck className="w-5 h-5" />
                    </>
                  )}
                </button>

                <div className="text-center">
                  <p className="text-xs text-slate-400 font-medium">
                    {finalPrice === 0
                      ? "Get instant access to all course lectures in the portal for free."
                      : paymentMethod === "safepay"
                      ? "By completing payment, you get instant access to the course lectures in the portal. Secure credit/debit card and wallet services provided by Safepay."
                      : "By submitting, you register your manual payment request. Access will be unlocked manually by the admin after receipt verification."}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* RIGHT: Course Summary & Coupon Code Card */}
      <div className="lg:col-span-5 space-y-6">
        {/* Course Card */}
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 rounded-3xl p-6 space-y-6 shadow-sm">
          <h3 className="text-xs font-bold text-black dark:text-white uppercase tracking-wider">
            Selected Course
          </h3>

          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary shrink-0 flex items-center justify-center">
              <BookOpen className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <h4 className="font-bold text-black dark:text-white text-base">
                {course.title}
              </h4>
              <span className="inline-block mt-1 text-[10px] bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-bold px-2 py-0.5 rounded">
                CIE A-Level Maths
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            {course.description}
          </p>
        </div>

        {/* Coupon Form Card (Enabled only when user is logged in) */}
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 rounded-3xl p-6 space-y-4 shadow-sm">
          <h3 className="text-xs font-bold text-black dark:text-white uppercase tracking-wider">
            Apply Promo Code
          </h3>

          {couponError && (
            <div className="p-3 rounded-xl text-xs font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20">
              {couponError}
            </div>
          )}

          {appliedCoupon && (
            <div className="p-3 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex justify-between items-center">
              <span>Coupon <strong>{appliedCoupon.code}</strong> applied!</span>
              <button
                onClick={() => {
                  setAppliedCoupon(null);
                  setFinalPrice(course.price_pkr);
                  setCouponCode("");
                }}
                className="text-rose-500 font-bold uppercase hover:underline"
              >
                Remove
              </button>
            </div>
          )}

          <form onSubmit={handleApplyCoupon} className="flex gap-2">
            <input
              type="text"
              disabled={appliedCoupon !== null || couponLoading}
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              placeholder="e.g. MATHS10"
              className="flex-grow bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 px-4 text-xs outline-none focus:border-primary transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-slate-900 dark:text-white"
            />
            <button
              type="submit"
              disabled={appliedCoupon !== null || couponLoading || !couponCode.trim()}
              className="bg-slate-900 text-white hover:bg-slate-850 px-5 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0 cursor-pointer"
            >
              {couponLoading ? <Loader className="w-4 h-4 animate-spin" /> : "Apply"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
export default CheckoutClient;
