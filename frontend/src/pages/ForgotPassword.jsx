import React, { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ArrowLeft, CheckCircle, EnvelopeSimple, LockKey } from "@phosphor-icons/react";
import { api } from "lib/api";
import { toast } from "sonner";

// Step constants
const STEP_EMAIL = "email";
const STEP_OTP   = "otp";
const STEP_PASS  = "pass";
const STEP_DONE  = "done";

export default function ForgotPassword() {
  const nav = useNavigate();

  const [step, setStep]         = useState(STEP_EMAIL);
  const [busy, setBusy]         = useState(false);
  const [email, setEmail]       = useState("");
  const [otp, setOtp]           = useState(["", "", "", "", "", ""]);
  const [token, setToken]       = useState("");
  const [newPass, setNewPass]   = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showPass, setShowPass] = useState(false);

  const otpRefs = useRef([]);

  // ---- Step 1: Request OTP ----
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api.post("/api/auth/forgot-password", { email });
      setToken(res.data?.token || "");
      toast.success("OTP sent! Check your email inbox (and spam folder).");
      setStep(STEP_OTP);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  // ---- OTP input handling ----
  const handleOtpChange = (i, val) => {
    const cleaned = val.replace(/\D/g, "").slice(0, 1);
    const next = [...otp];
    next[i] = cleaned;
    setOtp(next);
    if (cleaned && i < 5) otpRefs.current[i + 1]?.focus();
    if (!cleaned && i > 0) otpRefs.current[i - 1]?.focus();
  };

  const handleOtpKeyDown = (i, e) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) {
      otpRefs.current[i - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
      otpRefs.current[5]?.focus();
      e.preventDefault();
    }
  };

  // ---- Step 2: Verify OTP ----
  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    const otpStr = otp.join("");
    if (otpStr.length < 6) { toast.error("Please enter the full 6-digit OTP"); return; }
    setBusy(true);
    try {
      // We need a token from Step 1 — we'll get it from the forgot-password call.
      // Re-request to get the token if not already stored (first call stores it).
      // Actually token was returned — but we stored it during step 1. Let's verify.
      await api.post("/api/auth/verify-otp", { token, otp: otpStr });
      toast.success("OTP verified! Set your new password.");
      setStep(STEP_PASS);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Incorrect OTP. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  // ---- Step 3: Set new password ----
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (newPass !== confirmPass) { toast.error("Passwords do not match"); return; }
    if (newPass.length < 8)      { toast.error("Password must be at least 8 characters"); return; }
    setBusy(true);
    try {
      await api.post("/api/auth/reset-password", {
        token,
        otp: otp.join(""),
        new_password: newPass,
      });
      setStep(STEP_DONE);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Reset failed. Please start over.");
    } finally {
      setBusy(false);
    }
  };

  // ---- Resend OTP ----
  const handleResend = async () => {
    setBusy(true);
    try {
      const res = await api.post("/api/auth/forgot-password", { email });
      setToken(res.data?.token || token);
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
      toast.success("New OTP sent to your email!");
    } catch {
      toast.error("Could not resend. Please wait a moment and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[#F9FAFB]">
      {/* Left panel */}
      <div className="hidden lg:flex relative bg-[#090E17] text-white p-12 flex-col justify-between overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-50" />
        <Link to="/" className="relative flex items-center gap-2.5">
          <img src="/vyaparmind-logo.png" alt="VyaparMind" className="w-10 h-10" />
          <span className="font-display font-black tracking-tighter text-xl">VyaparMind</span>
        </Link>
        <div className="relative">
          <h2 className="font-display font-black text-5xl tracking-tighter leading-[1.02]">
            Forgot your<br /><span className="text-signal">password?</span><br />No problem.
          </h2>
          <p className="mt-4 text-white/65 max-w-md">
            We'll send a one-time code to your email. Enter it here and create a new password in seconds.
          </p>
        </div>
        <div className="relative text-xs text-white/40 tracking-widest uppercase">&copy; 2026 VyaparMind</div>
      </div>

      {/* Right panel */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">

          {/* Step 1: Email */}
          {step === STEP_EMAIL && (
            <form onSubmit={handleEmailSubmit}>
              <div className="label-tiny mb-3">Reset password — Step 1 of 3</div>
              <h1 className="font-display font-black text-4xl tracking-tighter mb-2">Enter your email</h1>
              <p className="text-slate-500 text-sm mb-8">We'll send a 6-digit OTP to your registered email address.</p>

              <label className="label-tiny block mb-1.5">Email address</label>
              <div className="relative">
                <EnvelopeSimple className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="email" required value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-3 bg-white border border-slate-300 focus:ring-1 focus:ring-signal focus:border-signal outline-none text-sm"
                  style={{ borderRadius: 4 }}
                  placeholder="you@dukaan.com"
                  autoFocus
                />
              </div>

              <button
                type="submit" disabled={busy}
                className="mt-6 w-full btn-signal flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {busy ? "Sending OTP…" : (<>Send OTP <ArrowRight weight="bold" size={16} /></>)}
              </button>

              <p className="mt-6 text-sm text-slate-600 text-center">
                Remembered it? <Link to="/login" className="text-signal font-semibold hover:underline">Sign in</Link>
              </p>
            </form>
          )}

          {/* Step 2: OTP */}
          {step === STEP_OTP && (
            <form onSubmit={handleOtpSubmit}>
              <button type="button" onClick={() => setStep(STEP_EMAIL)} className="flex items-center gap-1 text-slate-500 text-sm mb-6 hover:text-slate-800">
                <ArrowLeft size={15} /> Back
              </button>
              <div className="label-tiny mb-3">Reset password — Step 2 of 3</div>
              <h1 className="font-display font-black text-4xl tracking-tighter mb-2">Check your inbox</h1>
              <p className="text-slate-500 text-sm mb-1">
                We sent a 6-digit OTP to <span className="font-semibold text-slate-700">{email}</span>
              </p>
              <p className="text-slate-400 text-xs mb-8">Valid for 15 minutes. Check your spam folder if you don't see it.</p>

              {/* OTP boxes */}
              <div className="flex gap-3 justify-center mb-8" onPaste={handleOtpPaste}>
                {otp.map((val, i) => (
                  <input
                    key={i}
                    ref={(el) => (otpRefs.current[i] = el)}
                    type="text" inputMode="numeric" maxLength={1}
                    value={val}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className="w-12 h-14 text-center text-2xl font-black bg-white border-2 border-slate-200 focus:border-signal focus:ring-2 focus:ring-signal/20 outline-none transition-all"
                    style={{ borderRadius: 6 }}
                    autoFocus={i === 0}
                  />
                ))}
              </div>

              <button
                type="submit" disabled={busy || otp.join("").length < 6}
                className="w-full btn-signal flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {busy ? "Verifying…" : (<>Verify OTP <ArrowRight weight="bold" size={16} /></>)}
              </button>

              <p className="mt-5 text-sm text-slate-500 text-center">
                Didn't receive it?{" "}
                <button type="button" onClick={handleResend} disabled={busy}
                  className="text-signal font-semibold hover:underline disabled:opacity-50">
                  Resend OTP
                </button>
              </p>
            </form>
          )}

          {/* Step 3: New password */}
          {step === STEP_PASS && (
            <form onSubmit={handlePasswordSubmit}>
              <div className="label-tiny mb-3">Reset password — Step 3 of 3</div>
              <h1 className="font-display font-black text-4xl tracking-tighter mb-2">New password</h1>
              <p className="text-slate-500 text-sm mb-8">Choose a strong password. You'll use it to sign in from now on.</p>

              <label className="label-tiny block mb-1.5">New password</label>
              <div className="relative">
                <LockKey className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type={showPass ? "text" : "password"} required
                  value={newPass} onChange={(e) => setNewPass(e.target.value)}
                  className="w-full pl-10 pr-16 py-3 bg-white border border-slate-300 focus:ring-1 focus:ring-signal focus:border-signal outline-none text-sm"
                  style={{ borderRadius: 4 }}
                  placeholder="Min 8 chars, upper, lower, number, symbol"
                  autoFocus
                />
                <button type="button" tabIndex={-1}
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700 font-semibold">
                  {showPass ? "Hide" : "Show"}
                </button>
              </div>

              <label className="label-tiny block mt-4 mb-1.5">Confirm password</label>
              <div className="relative">
                <LockKey className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type={showPass ? "text" : "password"} required
                  value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-3 bg-white border border-slate-300 focus:ring-1 focus:ring-signal focus:border-signal outline-none text-sm"
                  style={{ borderRadius: 4 }}
                  placeholder="Repeat password"
                />
              </div>

              {/* Password strength hint */}
              <ul className="mt-3 text-xs text-slate-400 space-y-0.5">
                {[
                  [newPass.length >= 8,               "At least 8 characters"],
                  [/[A-Z]/.test(newPass),              "One uppercase letter"],
                  [/[a-z]/.test(newPass),              "One lowercase letter"],
                  [/[0-9]/.test(newPass),              "One number"],
                  [/[^a-zA-Z0-9]/.test(newPass),       "One special character"],
                ].map(([ok, label]) => (
                  <li key={label} className={`flex items-center gap-1.5 ${ok ? "text-signal" : ""}`}>
                    <span>{ok ? "✓" : "○"}</span> {label}
                  </li>
                ))}
              </ul>

              <button
                type="submit" disabled={busy}
                className="mt-6 w-full btn-signal flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {busy ? "Saving…" : (<>Set new password <ArrowRight weight="bold" size={16} /></>)}
              </button>
            </form>
          )}

          {/* Step 4: Done */}
          {step === STEP_DONE && (
            <div className="text-center">
              <CheckCircle weight="fill" size={64} className="text-signal mx-auto mb-5" />
              <div className="label-tiny mb-2">All done!</div>
              <h1 className="font-display font-black text-4xl tracking-tighter mb-3">Password updated</h1>
              <p className="text-slate-500 text-sm mb-8">
                Your password has been reset successfully. Sign in with your new password.
              </p>
              <button
                onClick={() => nav("/login")}
                className="w-full btn-signal flex items-center justify-center gap-2"
              >
                Go to Sign In <ArrowRight weight="bold" size={16} />
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
