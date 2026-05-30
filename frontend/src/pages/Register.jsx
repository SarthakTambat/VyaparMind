import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Lightning, ArrowRight, Storefront, Stethoscope, Truck, Plant, Scissors, Wrench } from "@phosphor-icons/react";
import { useAuth } from "lib/auth";
import { toast } from "sonner";

const TYPES = [
  { id: "kirana", label: "Kirana / Retail", Icon: Storefront },
  { id: "clinic", label: "Clinic / Pharmacy", Icon: Stethoscope },
  { id: "transport", label: "Transport / Logistics", Icon: Truck },
  { id: "farm", label: "Farm / Agri", Icon: Plant },
  { id: "salon", label: "Salon / Beauty", Icon: Scissors },
  { id: "workshop", label: "Workshop / Service", Icon: Wrench },
];

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: "", email: "", password: "", business_name: "", business_type: "kirana", language: "en" });
  const [busy, setBusy] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const finish = async () => {
    setBusy(true);
    try {
      await register(form);
      toast.success("Welcome to VyaparMind!");
      nav("/app");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not create account");
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
          <div className="label-tiny text-white/50 mb-3">Step {step} of 3</div>
          <h2 className="font-display font-black text-5xl tracking-tighter leading-[1.02]">
            In 90 seconds,<br />you're <span className="text-signal">automated</span>.
          </h2>
          <p className="mt-4 text-white/65 max-w-md">No spreadsheets. No setup forms. Just three quick questions.</p>
        </div>
        <div className="relative text-xs text-white/40 tracking-widest uppercase">&copy; 2026 VyaparMind</div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          {step === 1 && (
            <form onSubmit={(e)=>{e.preventDefault(); setStep(2);}}>
              <div className="label-tiny mb-3">Create account</div>
              <h1 className="font-display font-black text-4xl tracking-tighter mb-8">Let's begin.</h1>
              <Field label="Your name" value={form.name} onChange={(v)=>set("name",v)} placeholder="Anita Sharma" required />
              <Field label="Email" type="email" value={form.email} onChange={(v)=>set("email",v)} placeholder="you@dukaan.com" required />
              <Field label="Password" type="password" value={form.password} onChange={(v)=>set("password",v)} placeholder="At least 6 characters" required minLength={6} />
              <button type="submit" className="mt-6 w-full btn-signal flex items-center justify-center gap-2">
                Next <ArrowRight weight="bold" size={16} />
              </button>
              <p className="mt-6 text-sm text-slate-600 text-center">
                Have an account? <Link to="/login" className="text-signal font-semibold hover:underline">Sign in</Link>
              </p>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={(e)=>{e.preventDefault(); setStep(3);}}>
              <div className="label-tiny mb-3">Step 2 · Your business</div>
              <h1 className="font-display font-black text-3xl tracking-tighter mb-8">What do you run?</h1>
              <Field label="Business name" value={form.business_name} onChange={(v)=>set("business_name",v)} placeholder="Sharma Kirana Store" required />
              <label className="label-tiny block mt-4 mb-2">Business type</label>
              <div className="grid grid-cols-2 gap-2">
                {TYPES.map((t) => (
                  <button
                    type="button" key={t.id}
                    onClick={()=>set("business_type", t.id)}
                    className={`flex items-center gap-2 px-3 py-3 border text-sm text-left transition-colors ${form.business_type === t.id ? "border-signal bg-emerald-50 text-emerald-900" : "border-slate-300 bg-white hover:border-slate-500"}`}
                    style={{borderRadius:4}}
                  >
                    <t.Icon weight="duotone" size={20} className="text-signal" />
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mt-6">
                <button type="button" onClick={()=>setStep(1)} className="flex-1 py-3 border border-slate-300 text-sm font-semibold bg-white hover:bg-slate-50" style={{borderRadius:4}}>Back</button>
                <button type="submit" className="flex-1 btn-signal flex items-center justify-center gap-2">
                  Next <ArrowRight weight="bold" size={16} />
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={(e)=>{e.preventDefault(); finish();}}>
              <div className="label-tiny mb-3">Step 3 · Language</div>
              <h1 className="font-display font-black text-3xl tracking-tighter mb-2">Which language do you prefer?</h1>
              <p className="text-slate-600 text-sm mb-6">You can talk to VyaparMind in any Indian language — we'll set the dashboard accordingly.</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  {c:"en", l:"English"}, {c:"hi", l:"\u0939\u093F\u0928\u094D\u0926\u0940"}, {c:"ta", l:"\u0BA4\u0BAE\u0BBF\u0BB4\u0BCD"},
                  {c:"te", l:"\u0C24\u0C46\u0C32\u0C41\u0C17\u0C41"}, {c:"kn", l:"\u0C95\u0CA8\u0CCD\u0CA8\u0CA1"}, {c:"bn", l:"\u09AC\u09BE\u0982\u09B2\u09BE"},
                  {c:"mr", l:"\u092E\u0930\u09BE\u0920\u0940"}, {c:"gu", l:"\u0A97\u0AC1\u0A9C\u0AB0\u0ABE\u0AA4\u0AC0"}, {c:"ml", l:"\u0D2E\u0D32\u0D2F\u0D3E\u0D33\u0D02"},
                ].map((o)=>(
                  <button
                    type="button" key={o.c}
                    onClick={()=>set("language", o.c)}
                    className={`px-3 py-3 border text-sm transition-colors ${form.language===o.c ? "border-signal bg-emerald-50 text-emerald-900" : "border-slate-300 bg-white hover:border-slate-500"}`}
                    style={{borderRadius:4}}
                  >{o.l}</button>
                ))}
              </div>
              <div className="flex gap-2 mt-6">
                <button type="button" onClick={()=>setStep(2)} className="flex-1 py-3 border border-slate-300 text-sm font-semibold bg-white hover:bg-slate-50" style={{borderRadius:4}}>Back</button>
                <button disabled={busy} type="submit" className="flex-1 btn-signal flex items-center justify-center gap-2 disabled:opacity-60">
                  {busy ? "Creating\u2026" : (<>Finish <ArrowRight weight="bold" size={16} /></>)}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", required = false, minLength }) {
  return (
    <div className="mt-4 first:mt-0">
      <label className="label-tiny block mb-1.5">{label}</label>
      <input
        type={type} value={value} onChange={(e)=>onChange(e.target.value)}
        placeholder={placeholder} required={required} minLength={minLength}
        className="w-full px-3.5 py-3 bg-white border border-slate-300 focus:ring-1 focus:ring-signal focus:border-signal outline-none text-sm"
        style={{borderRadius:4}}
      />
    </div>
  );
}
