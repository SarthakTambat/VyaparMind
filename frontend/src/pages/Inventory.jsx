import React, { useEffect, useState } from "react";
import { api } from "lib/api";
import { toast } from "sonner";
import { Package, Warning, Plus, Trash, PencilSimple } from "@phosphor-icons/react";

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", quantity: "", unit: "kg", reorder_level: "5" });
  const [editing, setEditing] = useState(null);

  const load = () => api.get("/api/inventory").then(r => setItems(r.data.items || [])).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    try {
      await api.post("/api/inventory", {
        name: form.name,
        quantity: parseFloat(form.quantity) || 0,
        unit: form.unit,
        reorder_level: parseFloat(form.reorder_level) || 5,
      });
      toast.success("Item added");
      setForm({ name: "", quantity: "", unit: "kg", reorder_level: "5" });
      setShowAdd(false);
      load();
    } catch { toast.error("Failed to add"); }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editing) return;
    try {
      await api.patch(`/api/inventory/${editing.id}`, {
        quantity: parseFloat(form.quantity) || 0,
        unit: form.unit,
        reorder_level: parseFloat(form.reorder_level) || 5,
      });
      toast.success("Updated");
      setEditing(null);
      setForm({ name: "", quantity: "", unit: "kg", reorder_level: "5" });
      load();
    } catch { toast.error("Failed to update"); }
  };

  const handleDelete = async (id) => {
    await api.delete(`/api/inventory/${id}`);
    toast.success("Deleted");
    load();
  };

  const startEdit = (item) => {
    setEditing(item);
    setForm({ name: item.name, quantity: String(item.quantity), unit: item.unit || "kg", reorder_level: String(item.reorder_level || 5) });
    setShowAdd(false);
  };

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="label-tiny mb-1">Stock</div>
          <h1 className="font-display font-black text-3xl tracking-tighter">Inventory</h1>
          <p className="text-slate-600 text-sm mt-1">Auto-updated from AI Chat. You can also add/edit items manually below.</p>
        </div>
        <button onClick={() => { setShowAdd(!showAdd); setEditing(null); }} className="btn-signal text-sm inline-flex items-center gap-1.5">
          <Plus weight="bold" size={14} /> Add Item
        </button>
      </div>

      {/* Add / Edit Form */}
      {(showAdd || editing) && (
        <form onSubmit={editing ? handleUpdate : handleAdd} className="card-flat p-5 mb-5 grid sm:grid-cols-5 gap-3">
          <input
            placeholder="Item name" value={form.name} disabled={!!editing}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="px-3 py-2.5 border border-slate-300 bg-white text-sm disabled:bg-slate-50 disabled:text-slate-500" style={{ borderRadius: 4 }}
          />
          <input
            placeholder="Quantity" type="number" step="any" value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            className="px-3 py-2.5 border border-slate-300 bg-white text-sm" style={{ borderRadius: 4 }}
          />
          <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="px-3 py-2.5 border border-slate-300 bg-white text-sm" style={{ borderRadius: 4 }}>
            <option value="kg">kg</option>
            <option value="gm">gm</option>
            <option value="ltr">ltr</option>
            <option value="ml">ml</option>
            <option value="pcs">pcs</option>
            <option value="packets">packets</option>
            <option value="bags">bags</option>
            <option value="boxes">boxes</option>
            <option value="dozen">dozen</option>
          </select>
          <input
            placeholder="Reorder level" type="number" step="any" value={form.reorder_level}
            onChange={(e) => setForm({ ...form, reorder_level: e.target.value })}
            className="px-3 py-2.5 border border-slate-300 bg-white text-sm" style={{ borderRadius: 4 }}
          />
          <div className="flex gap-2">
            <button type="submit" className="btn-signal text-sm flex-1">{editing ? "Update" : "Add"}</button>
            {editing && <button type="button" onClick={() => { setEditing(null); setForm({ name: "", quantity: "", unit: "kg", reorder_level: "5" }); }} className="px-3 py-2 border border-slate-300 text-sm text-slate-600" style={{ borderRadius: 4 }}>Cancel</button>}
          </div>
        </form>
      )}

      {loading ? (
        <div className="card-flat p-8 text-center text-slate-500">{"Loading\u2026"}</div>
      ) : items.length === 0 ? (
        <div className="card-flat p-12 text-center">
          <Package weight="duotone" size={48} className="text-slate-300 mx-auto mb-3" />
          <div className="font-display font-bold text-lg mb-1">No items yet</div>
          <p className="text-sm text-slate-500">Add items above, or say in AI Chat: "bought 20kg rice for ₹1500"</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((i) => {
            const low = i.quantity <= (i.reorder_level || 5);
            return (
              <div key={i.id} className={`card-flat p-4 ${low ? "border-amber-300" : ""}`}>
                <div className="flex items-center justify-between">
                  <div className="font-display font-bold text-lg capitalize tracking-tight">{i.name}</div>
                  <div className="flex items-center gap-1.5">
                    {low && <Warning weight="fill" className="text-amber-500" size={18} />}
                    <button onClick={() => startEdit(i)} className="text-slate-400 hover:text-signal"><PencilSimple size={16} /></button>
                    <button onClick={() => handleDelete(i.id)} className="text-slate-400 hover:text-rose-600"><Trash size={16} /></button>
                  </div>
                </div>
                <div className="mt-2 font-display font-black text-3xl tracking-tighter text-slate-900">
                  {i.quantity} <span className="text-base text-slate-500 font-medium">{i.unit || ""}</span>
                </div>
                <div className="label-tiny text-slate-500 mt-1">Reorder at {i.reorder_level || 5} {i.unit || ""}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
