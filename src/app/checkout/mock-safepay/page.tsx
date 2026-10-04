"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { simulateWebhookPayment } from "./actions";
import { ShieldCheck, CreditCard, Lock, ArrowLeft, Loader, HelpCircle, AlertCircle, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

function MockSafepayContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const reference = searchParams.get("reference") || "";
  const amountStr = searchParams.get("amount") || "0";
  const courseSlug = searchParams.get("courseSlug") || "";
  
  const amount = parseInt(amountStr, 10);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cardNumber, setCardNumber] = useState("4242 •••• •••• 4242");
  const [expiry, setExpiry] = useState("12/28");
  const [cvv, setCvv] = useState("123");

  const handlePaySuccess = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await simulateWebhookPayment(reference, amount);
      if (res.success) {
        // Redirect back to student portal on successful payment simulation
        router.push(`/portal?payment_status=success&ref=${reference}`);
      } else {
        setError(res.error || "Simulation failed. Webhook returned an error.");
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || "Failed to contact local webhook.");
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push(`/checkout/${courseSlug}?payment_status=cancelled`);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-between font-sans transition-colors duration-300">
      {/* Sleek Premium Brand Header */}
      <header className="bg-slate-900/90 dark:bg-slate-950/90 backdrop-blur-md text-white py-4 px-6 border-b border-slate-800 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
            <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
          </div>
          <span className="font-black text-lg tracking-tight text-white flex items-center gap-1.5">
            safepay
            <span className="bg-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md">
              Sandbox
            </span>
          </span>
        </div>
        <div className="text-right">
          <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Order Total</span>
          <span className="font-extrabold text-base text-primary">PKR {amount.toLocaleString()}</span>
        </div>
      </header>

      {/* Main Checkout Box */}
      <main className="flex-grow flex items-center justify-center p-4 md:p-8">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none w-full max-w-md overflow-hidden border border-slate-200/50 dark:border-slate-800/80"
        >
          {/* Simulation Notice Banner */}
          <div className="bg-amber-500/5 border-b border-amber-500/10 p-4 text-xs text-amber-600 dark:text-amber-450 flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-black uppercase tracking-wider block mb-0.5">Developer Environment</span>
              This is a sandbox simulator posting payloads to your local webhook. No actual funds will be transferred.
            </div>
          </div>

          <div className="p-6 md:p-8 space-y-6">
            {/* Reference Details */}
            <div className="space-y-1.5">
              <span className="block text-xs font-bold text-slate-450 uppercase tracking-wider">Transaction Reference</span>
              <span className="block font-mono text-xs text-slate-600 dark:text-slate-350 bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200/50 dark:border-slate-850">
                {reference || "sk_ref_example"}
              </span>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 rounded-xl text-xs font-bold bg-rose-500/15 border border-rose-500/20 text-rose-500 flex items-start gap-2.5"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}

            {/* Mock Credit Card Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Card Number
                </label>
                <div className="relative">
                  <CreditCard className="absolute left-4 top-3.5 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <input
                    type="text"
                    disabled={loading}
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-11 pr-4 text-sm outline-none focus:border-primary dark:focus:border-primary transition-colors text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Expiry Date
                  </label>
                  <input
                    type="text"
                    disabled={loading}
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    placeholder="MM/YY"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 px-4 text-sm outline-none focus:border-primary dark:focus:border-primary transition-colors text-slate-900 dark:text-white font-mono text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    CVV / CVC
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-3.5 w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <input
                      type="password"
                      disabled={loading}
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value)}
                      placeholder="•••"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-11 pr-4 text-sm outline-none focus:border-primary dark:focus:border-primary transition-colors text-slate-900 dark:text-white font-mono text-center"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Sim action buttons */}
            <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800/80">
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={handlePaySuccess}
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/95 text-white py-4 rounded-xl font-bold shadow-lg shadow-primary/10 transition-colors disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span>Simulate Successful Payment</span>
                    <Sparkles className="w-4 h-4" />
                  </>
                )}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={handleCancel}
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/85 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300 py-3.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-75 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Cancel Payment</span>
              </motion.button>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Footer Branding */}
      <footer className="py-6 text-center text-xs text-slate-400 dark:text-slate-500 max-w-md mx-auto px-4 leading-relaxed">
        Securely routed via Safepay integration pipeline. Real-time webhook callbacks are automatically dispatched in sandboxed environments.
      </footer>
    </div>
  );
}

export default function MockSafepayPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-500 font-bold transition-colors duration-300">
        <div className="flex flex-col items-center gap-3">
          <Loader className="w-8 h-8 text-primary animate-spin" />
          <span className="text-xs uppercase tracking-wider font-extrabold text-slate-400">Loading Sandbox Gateway...</span>
        </div>
      </div>
    }>
      <MockSafepayContent />
    </Suspense>
  );
}
