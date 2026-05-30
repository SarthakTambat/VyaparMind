import React, { useEffect, useState } from "react";
import { api } from "lib/api";
import { useLanguage } from "lib/i18n";
import { toast } from "sonner";
import { Plus, Trash, ArrowUp, ArrowDown } from "@phosphor-icons/react";

export default function Transactions() {
  const { t } = useLanguage();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ type: "income", amount: "", category: "", party_name: "", description: "" });
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await api.get("/api/transactions");
    setItems(data.items || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    try {
      await api.post("/api/transactions", { ...form, amount: parseFloat(form.amount) });
      toast.success("Transaction added");
      setForm({ type: "income", amount: "", category: "", party_name: "", description: "" });
      setShowForm(false);
      load();
    } catch { toast.error("Failed to add"); }
  };

  const del = async (id) => {
    await api.delete(`/api/transactions/${id}`);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="p-6">
      <div className="flex items-end justify-between mb-5">
        <div>
          <div className="label-tiny mb-1">{t("txn.title")}</div>
          <h1 className="font-display font-black text-3xl tracking-tighter">{t("txn.title")}</h1>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-signal inline-flex items-center gap-2">
          <Plus weight="bold" size={16} /> Add manual
        </button>
      </div>

      {showForm && (
        <form onSubmit={add} className="card-flat p-5 mb-5 grid sm:grid-cols-5 gap-3">
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="px-3 py-2.5 border border-slate-300 bg-white text-sm" style={{ borderRadius: 4 }}>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          <input required type="number" step="0.01" placeholder="Amount \u20b9" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="px-3 py-2.5 border border-slate-300 bg-white text-sm" style={{ borderRadius: 4 }} />
          <input placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="px-3 py-2.5 border border-slate-300 bg-white text-sm" style={{ borderRadius: 4 }} />
          <input placeholder="Party (optional)" value={form.party_name} onChange={(e) => setForm({ ...form, party_name: e.target.value })} className="px-3 py-2.5 border border-slate-300 bg-white text-sm" style={{ borderRadius: 4 }} />
          <button type="submit" className="btn-signal text-sm">Save</button>
        </form>
      )}

      <div className="card-flat overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">{"Loading\u2026"}</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <div className="font-display font-bold text-lg mb-1">No transactions yet</div>
            <div className="text-sm">Use AI Chat or add one manually.</div>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left">
                <th className="px-4 py-3 label-tiny text-slate-500">Date</th>
                <th className="px-4 py-3 label-tiny text-slate-500">Type</th>
                <th className="px-4 py-3 label-tiny text-slate-500 text-right">Amount</th>
                <th className="px-4 py-3 label-tiny text-slate-500">Category</th>
                <th className="px-4 py-3 label-tiny text-slate-500">Party</th>
                <th className="px-4 py-3 label-tiny text-slate-500">Source</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => (
                <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600 text-xs">{new Date(t.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</td>
                  <td className="px-4 py-3">
                    {t.type === "income" ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-bold tracking-wider uppercase"><ArrowUp size={12} /> Income</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-rose-700 font-bold tracking-wider uppercase"><ArrowDown size={12} /> Expense</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-display font-bold">{"\u20B9"}{Math.round(t.amount).toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 capitalize">{t.category}</td>
                  <td className="px-4 py-3 capitalize">{t.party_name || "\u2014"}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 tracking-wider uppercase">{t.source}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => del(t.id)} className="text-slate-400 hover:text-rose-600"><Trash size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
