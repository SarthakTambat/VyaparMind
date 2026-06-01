import React from "react";
import { useNavigate } from "react-router-dom";
import { Lightning, Rocket, X } from "@phosphor-icons/react";

export default function UpgradeModal({ onClose }) {
  const nav = useNavigate();

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in"
        style={{ borderRadius: 8 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-3 right-3 text-slate-400 hover:text-slate-700">
          <X size={20} />
        </button>

        <div className="flex items-center justify-center w-14 h-14 bg-emerald-50 rounded-full mx-auto mb-4">
          <Rocket weight="duotone" size={28} className="text-signal" />
        </div>

        <h2 className="font-display font-black text-xl tracking-tight text-center text-slate-900">
          Upgrade to Pro
        </h2>
        <p className="text-sm text-slate-600 text-center mt-2">
          AI Assistant is available on <span className="font-bold text-signal">Vikas</span>, <span className="font-bold text-indigo-600">Shakti</span> & <span className="font-bold text-amber-600">Samrajya</span> plans.
        </p>

        <div className="mt-5 bg-slate-50 border border-slate-200 p-4" style={{ borderRadius: 6 }}>
          <div className="text-[10px] font-bold tracking-widest uppercase text-slate-500 mb-2">Pro features include</div>
          <ul className="space-y-1.5 text-sm text-slate-700">
            <li className="flex items-center gap-2"><Lightning weight="fill" size={14} className="text-signal" /> Unlimited AI chats</li>
            <li className="flex items-center gap-2"><Lightning weight="fill" size={14} className="text-signal" /> Voice commands & automation</li>
            <li className="flex items-center gap-2"><Lightning weight="fill" size={14} className="text-signal" /> Bill photo scanning</li>
            <li className="flex items-center gap-2"><Lightning weight="fill" size={14} className="text-signal" /> AI market insights</li>
            <li className="flex items-center gap-2"><Lightning weight="fill" size={14} className="text-signal" /> Daily AI briefings</li>
          </ul>
        </div>

        <button
          onClick={() => { onClose(); nav("/app/upgrade"); }}
          className="mt-5 w-full btn-signal py-3 flex items-center justify-center gap-2 font-bold text-sm"
        >
          <Rocket weight="bold" size={16} /> View Plans & Upgrade
        </button>

        <p className="text-[11px] text-slate-400 text-center mt-3">Starting at just ₹499/month</p>
      </div>
    </div>
  );
}

/**
 * Helper: Check if user has an active pro plan.
 * Returns true if plan is vikas, shakti, or samrajya AND not expired.
 */
export function isProUser(user) {
  if (!user) return false;
  const plan = (user.plan || "shunya").toLowerCase();
  if (plan === "shunya" || !plan) return false;
  // Check expiry
  if (user.plan_expires_at) {
    const expiry = new Date(user.plan_expires_at);
    if (expiry < new Date()) return false; // expired
  }
  return true;
}
