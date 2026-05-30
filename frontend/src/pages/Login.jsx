import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Lightning, ArrowRight } from "@phosphor-icons/react";
import { useAuth } from "lib/auth";
import { toast } from "sonner";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(email, password);
      toast.success("Welcome back!");
      const redirect = searchParams.get("redirect");
      nav(redirect || "/app");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Login failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[#F9FAFB]">
      <div className="hidden lg:flex relative bg-[#090E17] text-white p-12 flex-col justify-between overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-50" />
        <Link to="/" className="relative flex items-center gap-2.5">
          <div className="w-7 h-7 bg-signal grid place-items-center" style={{borderRadius:4}}>
            <Lightning weight="fill" size={16} color="#090E17" />
          </div>
          <span className="font-display font-black tracking-tighter text-lg">VyaparMind</span>
        </Link>
        <div className="relative">
          <h2 className="font-display font-black text-5xl tracking-tighter leading-[1.02]">
            Back to <span className="text-signal">business</span>.<br />Literally.
          </h2>
          <p className="mt-4 text-white/65 max-w-md">Your AI ops manager has been quietly tracking everything. Sign in to see the picture.</p>
        </div>
        <div className="relative text-xs text-white/40 tracking-widest uppercase">&copy; 2026 VyaparMind</div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <form onSubmit={submit} className="w-full max-w-md">
          <div className="label-tiny mb-3">Sign in</div>
          <h1 className="font-display font-black text-4xl tracking-tighter mb-8">Welcome back.</h1>

          <label className="label-tiny block mb-1.5">Email</label>
          <input
            type="email" required value={email} onChange={(e)=>setEmail(e.target.value)}
            className="w-full px-3.5 py-3 bg-white border border-slate-300 focus:ring-1 focus:ring-signal focus:border-signal outline-none text-sm"
            style={{borderRadius:4}}
            placeholder="you@dukaan.com"
          />
          <label className="label-tiny block mt-4 mb-1.5">Password</label>
          <input
            type="password" required value={password} onChange={(e)=>setPassword(e.target.value)}
            className="w-full px-3.5 py-3 bg-white border border-slate-300 focus:ring-1 focus:ring-signal focus:border-signal outline-none text-sm"
            style={{borderRadius:4}}
            placeholder="••••••••"
          />

          <button
            disabled={busy} type="submit"
            className="mt-6 w-full btn-signal flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {busy ? "Signing in\u2026" : (<>Sign in <ArrowRight weight="bold" size={16} /></>)}
          </button>

          <p className="mt-6 text-sm text-slate-600 text-center">
            No account? <Link to="/register" className="text-signal font-semibold hover:underline">Create one</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
