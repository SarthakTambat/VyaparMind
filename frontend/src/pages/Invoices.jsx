import React, { useState, useEffect, useCallback } from "react";
import { api } from "lib/api";
import {
  Receipt, Plus, X, Trash, Eye, PencilSimple, Check, 
  CurrencyInr, Printer, MagnifyingGlass,
} from "@phosphor-icons/react";

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [viewInvoice, setViewInvoice] = useState(null);
  const [filter, setFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const emptyForm = {
    customer_name: "", customer_phone: "", customer_address: "",
    items: [{ name: "", qty: 1, rate: 0, amount: 0 }],
    tax_percent: 0, discount: 0, notes: "", due_date: "",
  };
  const [form, setForm] = useState(emptyForm);

  const fetchInvoices = useCallback(async () => {
    try {
      const { data } = await api.get("/api/invoices");
      setInvoices(data.invoices || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  // Calculate totals
  const calcTotals = (items, taxPct, discount) => {
    const subtotal = items.reduce((s, i) => s + (i.qty * i.rate), 0);
    const taxAmount = subtotal * (taxPct / 100);
    const total = subtotal + taxAmount - discount;
    return { subtotal, taxAmount, total };
  };

  const updateItem = (idx, field, value) => {
    const newItems = [...form.items];
    newItems[idx] = { ...newItems[idx], [field]: value };
    newItems[idx].amount = newItems[idx].qty * newItems[idx].rate;
    setForm({ ...form, items: newItems });
  };

  const addItem = () => {
    setForm({ ...form, items: [...form.items, { name: "", qty: 1, rate: 0, amount: 0 }] });
  };

  const removeItem = (idx) => {
    if (form.items.length <= 1) return;
    setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { subtotal, taxAmount, total } = calcTotals(form.items, form.tax_percent, form.discount);
    try {
      await api.post("/api/invoices", {
        ...form,
        subtotal, tax_amount: taxAmount, total,
      });
      setForm(emptyForm);
      setShowForm(false);
      fetchInvoices();
    } catch (err) {
      alert(err?.response?.data?.detail || "Failed");
    }
  };

  const markPaid = async (id) => {
    await api.put(`/api/invoices/${id}`, { status: "paid" });
    fetchInvoices();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await api.delete(`/api/invoices/${deleteTarget.id}`);
    setDeleteTarget(null);
    fetchInvoices();
  };

  const filtered = invoices.filter((inv) => {
    if (filter === "paid") return inv.status === "paid";
    if (filter === "unpaid") return inv.status === "unpaid";
    return true;
  });

  const formatDate = (iso) => {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  };

  const totalRevenue = invoices.reduce((s, i) => s + (i.total || 0), 0);
  const totalUnpaid = invoices.filter(i => i.status === "unpaid").reduce((s, i) => s + (i.total || 0), 0);

  const { subtotal, taxAmount, total } = calcTotals(form.items, form.tax_percent, form.discount);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 flex items-center gap-2">
            <Receipt weight="duotone" size={28} className="text-[#00A884]" />
            Invoices
          </h1>
          <p className="text-sm text-slate-500 mt-1">Create professional GST invoices in seconds</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#00A884] text-white text-sm font-medium rounded-lg hover:bg-[#009974] transition-colors"
        >
          <Plus weight="bold" size={16} /> New Invoice
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-xs text-green-600 font-medium mb-1">Total Billed</p>
          <p className="text-2xl font-bold text-green-700">₹{totalRevenue.toLocaleString("en-IN")}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs text-amber-600 font-medium mb-1">Unpaid</p>
          <p className="text-2xl font-bold text-amber-700">₹{totalUnpaid.toLocaleString("en-IN")}</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-600 font-medium mb-1">Total Invoices</p>
          <p className="text-2xl font-bold text-slate-700">{invoices.length}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg mb-4 w-fit">
        {[["all", "All"], ["unpaid", "Unpaid"], ["paid", "Paid"]].map(([val, lbl]) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filter === val ? "bg-white shadow text-slate-900" : "text-slate-500"
            }`}
          >
            {lbl}
          </button>
        ))}
      </div>

      {/* Invoice List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin h-8 w-8 border-4 border-[#00A884] border-t-transparent rounded-full"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Receipt size={48} className="mx-auto mb-3 opacity-50" />
          <p className="font-medium text-slate-500">No invoices yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((inv) => (
            <div key={inv.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                inv.status === "paid" ? "bg-green-100" : "bg-amber-100"
              }`}>
                <CurrencyInr weight="bold" size={18} className={inv.status === "paid" ? "text-green-600" : "text-amber-600"} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 truncate">{inv.customer_name || "Customer"}</p>
                <p className="text-xs text-slate-500">{inv.invoice_number} • {formatDate(inv.created_at)}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-bold text-slate-800">₹{(inv.total || 0).toLocaleString("en-IN")}</p>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  inv.status === "paid" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                }`}>
                  {inv.status === "paid" ? "Paid" : "Unpaid"}
                </span>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => setViewInvoice(inv)} className="w-8 h-8 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center hover:bg-slate-200" title="View">
                  <Eye size={14} />
                </button>
                {inv.status === "unpaid" && (
                  <button onClick={() => markPaid(inv.id)} className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center hover:bg-green-200" title="Mark Paid">
                    <Check weight="bold" size={14} />
                  </button>
                )}
                <button onClick={() => setDeleteTarget(inv)} className="w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center hover:bg-red-200" title="Delete">
                  <Trash size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Invoice Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full shadow-2xl my-8">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-900">New Invoice</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input type="text" placeholder="Customer Name *" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A884]/30" required />
              <div className="grid grid-cols-2 gap-3">
                <input type="tel" placeholder="Phone" value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A884]/30" />
                <input type="date" placeholder="Due Date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A884]/30" />
              </div>

              {/* Items */}
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Items</p>
                <div className="space-y-2">
                  {form.items.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input type="text" placeholder="Item name" value={item.name} onChange={(e) => updateItem(idx, "name", e.target.value)} className="flex-1 px-2 py-2 text-sm border border-slate-200 rounded-md" />
                      <input type="number" placeholder="Qty" value={item.qty} onChange={(e) => updateItem(idx, "qty", Number(e.target.value))} className="w-16 px-2 py-2 text-sm border border-slate-200 rounded-md" min="1" />
                      <input type="number" placeholder="Rate" value={item.rate} onChange={(e) => updateItem(idx, "rate", Number(e.target.value))} className="w-20 px-2 py-2 text-sm border border-slate-200 rounded-md" min="0" />
                      <span className="text-sm text-slate-500 w-16 text-right">₹{item.qty * item.rate}</span>
                      {form.items.length > 1 && (
                        <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600"><X size={14} /></button>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addItem} className="mt-2 text-sm text-[#00A884] font-medium hover:underline">
                  + Add Item
                </button>
              </div>

              {/* Tax & Discount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500">GST %</label>
                  <input type="number" value={form.tax_percent} onChange={(e) => setForm({ ...form, tax_percent: Number(e.target.value) })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" min="0" max="28" />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Discount (₹)</label>
                  <input type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: Number(e.target.value) })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" min="0" />
                </div>
              </div>

              {/* Totals */}
              <div className="bg-slate-50 rounded-lg p-3 space-y-1 text-sm">
                <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>₹{subtotal.toLocaleString("en-IN")}</span></div>
                {form.tax_percent > 0 && <div className="flex justify-between text-slate-600"><span>GST ({form.tax_percent}%)</span><span>₹{taxAmount.toFixed(2)}</span></div>}
                {form.discount > 0 && <div className="flex justify-between text-slate-600"><span>Discount</span><span>-₹{form.discount}</span></div>}
                <div className="flex justify-between font-bold text-slate-900 pt-1 border-t"><span>Total</span><span>₹{total.toLocaleString("en-IN")}</span></div>
              </div>

              <textarea placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none h-16 focus:outline-none focus:ring-2 focus:ring-[#00A884]/30" />

              <button type="submit" className="w-full py-2.5 bg-[#00A884] text-white text-sm font-medium rounded-lg hover:bg-[#009974] transition-colors">
                Create Invoice
              </button>
            </form>
          </div>
        </div>
      )}

      {/* View Invoice Modal */}
      {viewInvoice && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 overflow-y-auto" onClick={() => setViewInvoice(null)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl my-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900">Invoice #{viewInvoice.invoice_number}</h3>
              <button onClick={() => setViewInvoice(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="space-y-3 text-sm">
              <div><span className="text-slate-500">Customer:</span> <strong>{viewInvoice.customer_name}</strong></div>
              {viewInvoice.customer_phone && <div><span className="text-slate-500">Phone:</span> {viewInvoice.customer_phone}</div>}
              <div><span className="text-slate-500">Date:</span> {formatDate(viewInvoice.created_at)}</div>
              <div><span className="text-slate-500">Status:</span> <span className={viewInvoice.status === "paid" ? "text-green-600 font-medium" : "text-amber-600 font-medium"}>{viewInvoice.status}</span></div>

              <table className="w-full text-xs mt-3">
                <thead><tr className="border-b text-slate-500"><th className="text-left py-1">Item</th><th className="text-center">Qty</th><th className="text-right">Rate</th><th className="text-right">Amt</th></tr></thead>
                <tbody>
                  {(viewInvoice.items || []).map((item, i) => (
                    <tr key={i} className="border-b border-slate-100"><td className="py-1">{item.name}</td><td className="text-center">{item.qty}</td><td className="text-right">₹{item.rate}</td><td className="text-right">₹{item.qty * item.rate}</td></tr>
                  ))}
                </tbody>
              </table>

              <div className="bg-slate-50 rounded-lg p-3 space-y-1 mt-2">
                <div className="flex justify-between"><span>Subtotal</span><span>₹{(viewInvoice.subtotal || 0).toLocaleString("en-IN")}</span></div>
                {viewInvoice.tax_amount > 0 && <div className="flex justify-between"><span>Tax</span><span>₹{viewInvoice.tax_amount}</span></div>}
                {viewInvoice.discount > 0 && <div className="flex justify-between"><span>Discount</span><span>-₹{viewInvoice.discount}</span></div>}
                <div className="flex justify-between font-bold text-lg pt-1 border-t"><span>Total</span><span>₹{(viewInvoice.total || 0).toLocaleString("en-IN")}</span></div>
              </div>
              {viewInvoice.notes && <p className="text-xs text-slate-500 italic">Note: {viewInvoice.notes}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl text-center">
            <Trash weight="fill" size={32} className="text-red-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Invoice?</h3>
            <p className="text-sm text-slate-500 mb-5">This will permanently delete invoice #{deleteTarget.invoice_number}</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50">Cancel</button>
              <button onClick={handleDelete} className="flex-1 px-4 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
