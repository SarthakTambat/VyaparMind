import React, { useState, useEffect, useCallback } from "react";
import { api } from "lib/api";
import { useAuth } from "lib/auth";
import {
  Storefront, Plus, X, Trash, PencilSimple, ShareNetwork,
  Eye, EyeSlash, WhatsappLogo, Link as LinkIcon, Copy, Check,
  Tag, Package,
} from "@phosphor-icons/react";

export default function OnlineStore() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [copied, setCopied] = useState(false);

  const emptyForm = { name: "", description: "", price: "", mrp: "", category: "general", unit: "piece", in_stock: true, visible: true };
  const [form, setForm] = useState(emptyForm);
  const [settingsForm, setSettingsForm] = useState({ store_name: "", description: "", phone: "", address: "", upi_id: "", delivery_available: false, min_order: 0 });

  const fetchData = useCallback(async () => {
    try {
      const [prodRes, setRes] = await Promise.all([
        api.get("/api/store/products"),
        api.get("/api/store/settings"),
      ]);
      setProducts(prodRes.data.products || []);
      setSettings(setRes.data.settings || {});
      setSettingsForm(setRes.data.settings || {});
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) return;
    try {
      if (editProduct) {
        await api.put(`/api/store/products/${editProduct.id}`, { ...form, price: parseFloat(form.price || 0), mrp: parseFloat(form.mrp || 0) });
      } else {
        await api.post("/api/store/products", { ...form, price: parseFloat(form.price || 0), mrp: parseFloat(form.mrp || 0) });
      }
      setForm(emptyForm);
      setShowForm(false);
      setEditProduct(null);
      fetchData();
    } catch (err) { alert(err?.response?.data?.detail || "Failed"); }
  };

  const handleEdit = (product) => {
    setForm({ name: product.name, description: product.description, price: product.price, mrp: product.mrp, category: product.category, unit: product.unit, in_stock: product.in_stock, visible: product.visible });
    setEditProduct(product);
    setShowForm(true);
  };

  const toggleVisibility = async (product) => {
    await api.put(`/api/store/products/${product.id}`, { visible: !product.visible });
    fetchData();
  };

  const toggleStock = async (product) => {
    await api.put(`/api/store/products/${product.id}`, { in_stock: !product.in_stock });
    fetchData();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await api.delete(`/api/store/products/${deleteTarget.id}`);
    setDeleteTarget(null);
    fetchData();
  };

  const saveSettings = async (e) => {
    e.preventDefault();
    await api.put("/api/store/settings", settingsForm);
    setShowSettings(false);
    fetchData();
  };

  const storeUrl = `${window.location.origin}/store/${user?.id}`;
  const whatsappText = `Check out my store: ${settings.store_name || "My Store"}\n${storeUrl}`;

  const copyLink = () => {
    navigator.clipboard.writeText(storeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const categories = [...new Set(products.map(p => p.category))];

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 flex items-center gap-2">
            <Storefront weight="duotone" size={28} className="text-[#00A884]" />
            Online Store
          </h1>
          <p className="text-sm text-slate-500 mt-1">Your digital catalog — share via WhatsApp</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowSettings(true)} className="px-3 py-2.5 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50">
            Store Settings
          </button>
          <button onClick={() => { setForm(emptyForm); setEditProduct(null); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-[#00A884] text-white text-sm font-medium rounded-lg hover:bg-[#009974]">
            <Plus weight="bold" size={16} /> Add Product
          </button>
        </div>
      </div>

      {/* Share Banner */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <ShareNetwork weight="duotone" size={24} className="text-green-600" />
          <div className="flex-1 min-w-[200px]">
            <p className="text-sm font-medium text-green-800">Share your store with customers</p>
            <p className="text-xs text-green-600 truncate">{storeUrl}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={copyLink} className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              copied ? "bg-green-600 text-white" : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
            }`}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Copied!" : "Copy"}
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(whatsappText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 bg-[#25D366] text-white text-sm font-medium rounded-lg hover:bg-[#20BD5A]"
            >
              <WhatsappLogo weight="fill" size={16} /> Share
            </a>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white border border-slate-200 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-slate-800">{products.length}</p>
          <p className="text-xs text-slate-500">Total Products</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{products.filter(p => p.visible && p.in_stock).length}</p>
          <p className="text-xs text-slate-500">Live</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-red-600">{products.filter(p => !p.in_stock).length}</p>
          <p className="text-xs text-slate-500">Out of Stock</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-slate-600">{categories.length}</p>
          <p className="text-xs text-slate-500">Categories</p>
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin h-8 w-8 border-4 border-[#00A884] border-t-transparent rounded-full"></div>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Storefront size={48} className="mx-auto mb-3 opacity-50" />
          <p className="font-medium text-slate-500">No products in your store yet</p>
          <p className="text-sm">Add products to create your digital catalog</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => (
            <div key={product.id} className={`bg-white border border-slate-200 rounded-xl p-4 relative ${!product.visible ? "opacity-50" : ""}`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-slate-800">{product.name}</p>
                  <p className="text-xs text-slate-500 capitalize">{product.category} • {product.unit}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => toggleVisibility(product)} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-slate-100" title={product.visible ? "Hide" : "Show"}>
                    {product.visible ? <Eye size={14} className="text-green-600" /> : <EyeSlash size={14} className="text-slate-400" />}
                  </button>
                  <button onClick={() => handleEdit(product)} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-slate-100"><PencilSimple size={14} className="text-slate-500" /></button>
                  <button onClick={() => setDeleteTarget(product)} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-red-50"><Trash size={14} className="text-red-400" /></button>
                </div>
              </div>
              {product.description && <p className="text-xs text-slate-500 mb-2">{product.description}</p>}
              <div className="flex items-center justify-between mt-2">
                <div>
                  <span className="text-lg font-bold text-slate-900">₹{product.price}</span>
                  {product.mrp > product.price && (
                    <span className="text-xs text-slate-400 line-through ml-2">₹{product.mrp}</span>
                  )}
                </div>
                <button
                  onClick={() => toggleStock(product)}
                  className={`text-[10px] px-2 py-1 rounded-full font-medium ${
                    product.in_stock ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                  }`}
                >
                  {product.in_stock ? "In Stock" : "Out of Stock"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Product Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-900">{editProduct ? "Edit Product" : "Add Product"}</h3>
              <button onClick={() => { setShowForm(false); setEditProduct(null); }} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input type="text" placeholder="Product Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A884]/30" required />
              <textarea placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg h-16 resize-none focus:outline-none focus:ring-2 focus:ring-[#00A884]/30" />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" placeholder="Selling Price (₹)" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A884]/30" required min="0" />
                <input type="number" placeholder="MRP (₹)" value={form.mrp} onChange={(e) => setForm({ ...form, mrp: e.target.value })} className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A884]/30" min="0" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg">
                  <option value="general">General</option>
                  <option value="grocery">Grocery</option>
                  <option value="dairy">Dairy</option>
                  <option value="beverages">Beverages</option>
                  <option value="snacks">Snacks</option>
                  <option value="personal_care">Personal Care</option>
                  <option value="household">Household</option>
                  <option value="fruits_vegetables">Fruits & Vegetables</option>
                </select>
                <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg">
                  <option value="piece">Piece</option>
                  <option value="kg">Kg</option>
                  <option value="gram">Gram</option>
                  <option value="liter">Liter</option>
                  <option value="pack">Pack</option>
                  <option value="dozen">Dozen</option>
                  <option value="bottle">Bottle</option>
                </select>
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.in_stock} onChange={(e) => setForm({ ...form, in_stock: e.target.checked })} className="rounded" />
                  In Stock
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.visible} onChange={(e) => setForm({ ...form, visible: e.target.checked })} className="rounded" />
                  Visible
                </label>
              </div>
              <button type="submit" className="w-full py-2.5 bg-[#00A884] text-white text-sm font-medium rounded-lg hover:bg-[#009974]">
                {editProduct ? "Update Product" : "Add Product"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Store Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-900">Store Settings</h3>
              <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form onSubmit={saveSettings} className="space-y-4">
              <input type="text" placeholder="Store Name" value={settingsForm.store_name || ""} onChange={(e) => setSettingsForm({ ...settingsForm, store_name: e.target.value })} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A884]/30" />
              <textarea placeholder="Store Description" value={settingsForm.description || ""} onChange={(e) => setSettingsForm({ ...settingsForm, description: e.target.value })} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg h-16 resize-none" />
              <input type="tel" placeholder="Phone Number" value={settingsForm.phone || ""} onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg" />
              <input type="text" placeholder="Address" value={settingsForm.address || ""} onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg" />
              <input type="text" placeholder="UPI ID (for payments)" value={settingsForm.upi_id || ""} onChange={(e) => setSettingsForm({ ...settingsForm, upi_id: e.target.value })} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg" />
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={settingsForm.delivery_available || false} onChange={(e) => setSettingsForm({ ...settingsForm, delivery_available: e.target.checked })} className="rounded" />
                  Delivery Available
                </label>
              </div>
              <button type="submit" className="w-full py-2.5 bg-[#00A884] text-white text-sm font-medium rounded-lg hover:bg-[#009974]">Save Settings</button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl text-center">
            <Trash weight="fill" size={32} className="text-red-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Product?</h3>
            <p className="text-sm text-slate-500 mb-5">Remove <strong>{deleteTarget.name}</strong> from your store?</p>
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
