import React, { useState } from "react";
import { useAuth } from "lib/auth";
import { api } from "lib/api";
import { toast } from "sonner";

export default function Settings() {
  const { user, setUser, logout } = useAuth();
  const [form, setForm] = useState({
    business_name: user?.business_name || "",
    business_type: user?.business_type || "",
    language: user?.language || "en",
  });
  const [busy, setBusy] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.patch("/api/auth/business", form);
      setUser(data);
      toast.success("Settings saved");
    } catch { toast.error("Could not save"); }
    finally { setBusy(false); }
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-5">
        <div className="label-tiny mb-1">Settings</div>
        <h1 className="font-display font-black text-3xl tracking-tighter">Your account.</h1>
      </div>

      <form onSubmit={save} className="card-flat p-6 space-y-4">
        <Field label="Name" value={user?.name || ""} disabled />
        <Field label="Email" value={user?.email || ""} disabled />
        <Field label="Business name" value={form.business_name} onChange={(v) => setForm({ ...form, business_name: v })} />
        <div>
          <label className="label-tiny block mb-1.5">Business type</label>
          <select value={form.business_type} onChange={(e) => setForm({ ...form, business_type: e.target.value })} className="w-full px-3.5 py-3 bg-white border border-slate-300 focus:ring-1 focus:ring-signal focus:border-signal outline-none text-sm" style={{ borderRadius: 4 }}>
            <option value="kirana">Kirana / Retail</option>
            <option value="clinic">Clinic / Pharmacy</option>
            <option value="transport">Transport / Logistics</option>
            <option value="farm">Farm / Agri</option>
            <option value="salon">Salon / Beauty</option>
            <option value="workshop">Workshop / Service</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="label-tiny block mb-1.5">Preferred language</label>
          <select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} className="w-full px-3.5 py-3 bg-white border border-slate-300 focus:ring-1 focus:ring-signal focus:border-signal outline-none text-sm" style={{ borderRadius: 4 }}>
            <option value="en">English</option>
            <option value="hi">{"\u0939\u093f\u0928\u094d\u0926\u0940"}</option>
            <option value="ta">{"\u0ba4\u0bae\u0bbf\u0bb4\u0bcd"}</option>
            <option value="te">{"\u0c24\u0c46\u0c32\u0c41\u0c17\u0c41"}</option>
            <option value="kn">{"\u0c95\u0ca8\u0ccd\u0ca8\u0ca1"}</option>
            <option value="bn">{"\u09ac\u09be\u0982\u09b2\u09be"}</option>
            <option value="mr">{"\u092e\u0930\u093e\u0920\u0940"}</option>
            <option value="gu">{"\u0a97\u0ac1\u0a9c\u0ab0\u0abe\u0aa4\u0ac0"}</option>
            <option value="ml">{"\u0d2e\u0d32\u0d2f\u0d3e\u0d33\u0d02"}</option>
          </select>
        </div>
        <div className="flex justify-between items-center pt-4 border-t border-slate-100">
          <button type="button" onClick={logout} className="text-sm text-rose-600 hover:underline">Sign out</button>
          <button disabled={busy} type="submit" className="btn-signal text-sm disabled:opacity-60">{busy ? "Saving\u2026" : "Save changes"}</button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, disabled }) {
  return (
    <div>
      <label className="label-tiny block mb-1.5">{label}</label>
      <input
        value={value} onChange={onChange ? (e) => onChange(e.target.value) : undefined} disabled={disabled}
        className="w-full px-3.5 py-3 bg-white border border-slate-300 focus:ring-1 focus:ring-signal focus:border-signal outline-none text-sm disabled:bg-slate-50 disabled:text-slate-500"
        style={{ borderRadius: 4 }}
      />
    </div>
  );
}
