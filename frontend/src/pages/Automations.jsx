import React, { useEffect, useState } from "react";
import { api } from "lib/api";
import { toast } from "sonner";
import { Plus, Trash, Lightning } from "@phosphor-icons/react";

const TEMPLATES = [
  { name: "Daily Sales Tracker", trigger: "Every day at 9pm", action: "Send end-of-day income/expense summary" },
  { name: "Smart Reorder", trigger: "Stock drops below reorder level", action: "Alert and draft order to supplier" },
  { name: "Customer Follow-up", trigger: "No visit in 14 days from a top customer", action: "Send a friendly WhatsApp message" },
  { name: "Payment Reminder", trigger: "Due date approaching for receivable", action: "Send polite reminder" },
];

export default function Automations() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", trigger: "", action: "" });

  const load = async () => {
    setLoading(true);
    const { data } = await api.get("/api/automations");
    setItems(data.items || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async (payload) => {
    await api.post("/api/automations", { ...payload, active: true });
    toast.success("Automation added");
    load();
  };

  const toggle = async (a) => {
    await api.patch(`/api/automations/${a.id}`, { active: !a.active });
    load();
  };

  const del = async (id) => {
    await api.delete(`/api/automations/${id}`);
    load();
  };

  return (
    <div className="p-6">
      <div className="mb-5">
        <div className="label-tiny mb-1">Automations</div>
        <h1 className="font-display font-black text-3xl tracking-tighter">Set it. Forget it.</h1>
        <p className="text-slate-600 text-sm mt-1">Pre-built rules + AI-learned automations from your patterns.</p>
      </div>

      <div className="card-flat p-5 mb-5">
        <div className="label-tiny text-slate-500 mb-3">Quick-start templates</div>
        <div className="grid sm:grid-cols-2 gap-3">
          {TEMPLATES.map((t) => (
            <div key={t.name} className="border border-slate-200 p-4 flex flex-col justify-between" style={{ borderRadius: 4 }}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Lightning weight="fill" className="text-signal" size={16} />
                  <div className="font-semibold text-sm">{t.name}</div>
                </div>
                <div className="text-xs text-slate-500 mt-2">WHEN: {t.trigger}</div>
                <div className="text-xs text-slate-500">DO: {t.action}</div>
              </div>
              <button onClick={() => create(t)} className="mt-3 text-xs font-bold tracking-widest uppercase text-signal hover:underline self-start">+ Enable</button>
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); if (!form.name) return; create(form); setForm({ name: "", trigger: "", action: "" }); }} className="card-flat p-5 mb-5 grid sm:grid-cols-4 gap-3">
        <input placeholder="Automation name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="px-3 py-2.5 border border-slate-300 bg-white text-sm" style={{ borderRadius: 4 }} />
        <input placeholder="Trigger (when\u2026)" value={form.trigger} onChange={(e) => setForm({ ...form, trigger: e.target.value })} className="px-3 py-2.5 border border-slate-300 bg-white text-sm" style={{ borderRadius: 4 }} />
        <input placeholder="Action (do\u2026)" value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value })} className="px-3 py-2.5 border border-slate-300 bg-white text-sm" style={{ borderRadius: 4 }} />
        <button type="submit" className="btn-signal inline-flex items-center justify-center gap-2 text-sm"><Plus weight="bold" size={14} /> Add custom</button>
      </form>

      <div className="card-flat overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">{"Loading\u2026"}</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <div className="font-display font-bold text-lg mb-1">No automations yet</div>
            <div className="text-sm">Enable a template above to get started.</div>
          </div>
        ) : (
          <ul>
            {items.map((a) => (
              <li key={a.id} className="px-5 py-4 border-b border-slate-100 last:border-0 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{a.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">When: {a.trigger} \u00b7 Do: {a.action}</div>
                </div>
                <button onClick={() => toggle(a)} className={`px-3 py-1.5 text-[11px] font-bold tracking-widest uppercase ${a.active ? "bg-signal text-white" : "bg-slate-100 text-slate-600"}`} style={{ borderRadius: 4 }}>
                  {a.active ? "Active" : "Paused"}
                </button>
                <button onClick={() => del(a.id)} className="text-slate-400 hover:text-rose-600"><Trash size={16} /></button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
