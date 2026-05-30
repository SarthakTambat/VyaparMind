import React, { useState, useEffect, useCallback } from "react";
import { api } from "lib/api";
import { useLanguage } from "lib/i18n";
import {
  HandCoins, ArrowUp, ArrowDown, Check, Trash, Plus, X, 
  MagnifyingGlass, FunnelSimple, Phone,
} from "@phosphor-icons/react";

export default function UdharBook() {
  const { t } = useLanguage();
  const [entries, setEntries] = useState([]);
  const [totalGiven, setTotalGiven] = useState(0);
  const [totalTaken, setTotalTaken] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("all"); // all, pending, settled
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [form, setForm] = useState({
    party_name: "", phone: "", type: "given", amount: "", description: "",
  });

  const fetchEntries = useCallback(async () => {
    try {
      const { data } = await api.get("/api/udhar");
      setEntries(data.entries || []);
      setTotalGiven(data.total_given || 0);
      setTotalTaken(data.total_taken || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.party_name || !form.amount) return;
    try {
      await api.post("/api/udhar", { ...form, amount: parseFloat(form.amount) });
      setForm({ party_name: "", phone: "", type: "given", amount: "", description: "" });
      setShowForm(false);
      fetchEntries();
    } catch (err) {
      alert(err?.response?.data?.detail || "Failed");
    }
  };

  const handleSettle = async (id) => {
    await api.put(`/api/udhar/${id}/settle`);
    fetchEntries();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await api.delete(`/api/udhar/${deleteTarget.id}`);
    setDeleteTarget(null);
    fetchEntries();
  };

  const filtered = entries.filter((e) => {
    if (filter === "pending" && e.status !== "pending") return false;
    if (filter === "settled" && e.status !== "settled") return false;
    if (search && !e.party_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const formatDate = (iso) => {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 flex items-center gap-2">
            <HandCoins weight="duotone" size={28} className="text-[#00A884]" />
            {t("udhar.title")}
          </h1>
          <p className="text-sm text-slate-500 mt-1">Track credit given & taken — your digital khata</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#00A884] text-white text-sm font-medium rounded-lg hover:bg-[#009974] transition-colors"
        >
          <Plus weight="bold" size={16} /> New Entry
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-xs text-red-600 font-medium mb-1 flex items-center gap-1">
            <ArrowUp size={14} /> You'll Get (Dena Hai)
          </p>
          <p className="text-2xl font-bold text-red-700">₹{totalGiven.toLocaleString("en-IN")}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-xs text-blue-600 font-medium mb-1 flex items-center gap-1">
            <ArrowDown size={14} /> You'll Pay (Lena Hai)
          </p>
          <p className="text-2xl font-bold text-blue-700">₹{totalTaken.toLocaleString("en-IN")}</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-600 font-medium mb-1">Net Balance</p>
          <p className={`text-2xl font-bold ${totalGiven - totalTaken >= 0 ? "text-green-700" : "text-red-700"}`}>
            ₹{Math.abs(totalGiven - totalTaken).toLocaleString("en-IN")}
            <span className="text-sm ml-1">{totalGiven - totalTaken >= 0 ? "receivable" : "payable"}</span>
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A884]/30"
          />
        </div>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          {[["all", "All"], ["pending", "Pending"], ["settled", "Settled"]].map(([val, lbl]) => (
            <button
              key={val}
              onClick={() => setFilter(val)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filter === val ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* Entries List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin h-8 w-8 border-4 border-[#00A884] border-t-transparent rounded-full"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <HandCoins size={48} className="mx-auto mb-3 opacity-50" />
          <p className="font-medium text-slate-500">No entries found</p>
          <p className="text-sm">Click "New Entry" to add your first udhar record</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((entry) => (
            <div
              key={entry.id}
              className={`bg-white border rounded-xl p-4 flex items-center gap-4 hover:shadow-sm transition-shadow ${
                entry.status === "settled" ? "opacity-60 border-slate-100" : "border-slate-200"
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                entry.type === "given" ? "bg-red-100" : "bg-blue-100"
              }`}>
                {entry.type === "given" ? (
                  <ArrowUp weight="bold" size={18} className="text-red-600" />
                ) : (
                  <ArrowDown weight="bold" size={18} className="text-blue-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 truncate">{entry.party_name}</p>
                <p className="text-xs text-slate-500">
                  {entry.type === "given" ? "They owe you" : "You owe them"}
                  {entry.description && ` • ${entry.description}`}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(entry.created_at)}</p>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-lg font-bold ${entry.type === "given" ? "text-red-600" : "text-blue-600"}`}>
                  ₹{entry.amount.toLocaleString("en-IN")}
                </p>
                {entry.status === "settled" && (
                  <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                    Settled
                  </span>
                )}
              </div>
              {entry.status === "pending" && (
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => handleSettle(entry.id)}
                    className="w-8 h-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center hover:bg-green-200"
                    title="Mark Settled"
                  >
                    <Check weight="bold" size={14} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(entry)}
                    className="w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center hover:bg-red-200"
                    title="Delete"
                  >
                    <Trash weight="bold" size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Entry Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-900">New Udhar Entry</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Type Toggle */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, type: "given" })}
                  className={`flex-1 py-2.5 text-sm font-medium rounded-lg border-2 transition-colors ${
                    form.type === "given"
                      ? "border-red-500 bg-red-50 text-red-700"
                      : "border-slate-200 text-slate-500"
                  }`}
                >
                  <ArrowUp size={16} className="inline mr-1" /> I Gave (Diya)
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, type: "taken" })}
                  className={`flex-1 py-2.5 text-sm font-medium rounded-lg border-2 transition-colors ${
                    form.type === "taken"
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-slate-200 text-slate-500"
                  }`}
                >
                  <ArrowDown size={16} className="inline mr-1" /> I Took (Liya)
                </button>
              </div>
              <input
                type="text"
                placeholder="Party Name *"
                value={form.party_name}
                onChange={(e) => setForm({ ...form, party_name: e.target.value })}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A884]/30"
                required
              />
              <input
                type="tel"
                placeholder="Phone (optional)"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A884]/30"
              />
              <input
                type="number"
                placeholder="Amount (₹) *"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A884]/30"
                required
                min="1"
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A884]/30"
              />
              <button
                type="submit"
                className="w-full py-2.5 bg-[#00A884] text-white text-sm font-medium rounded-lg hover:bg-[#009974] transition-colors"
              >
                Add Entry
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl text-center">
            <Trash weight="fill" size={32} className="text-red-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Entry?</h3>
            <p className="text-sm text-slate-500 mb-5">
              Delete udhar record for <strong>{deleteTarget.party_name}</strong> (₹{deleteTarget.amount})?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={handleDelete} className="flex-1 px-4 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
