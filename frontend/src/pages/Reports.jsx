import React, { useState, useEffect, useCallback } from "react";
import { api } from "lib/api";
import {
  ChartBar, TrendUp, TrendDown, CurrencyInr, Package,
  Receipt, Calendar, ArrowRight,
} from "@phosphor-icons/react";

export default function Reports() {
  const [summary, setSummary] = useState(null);
  const [gst, setGst] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  const fetchReports = useCallback(async () => {
    try {
      const [sumRes, gstRes, invRes] = await Promise.all([
        api.get("/api/reports/summary"),
        api.get("/api/reports/gst"),
        api.get("/api/reports/inventory"),
      ]);
      setSummary(sumRes.data);
      setGst(gstRes.data);
      setInventory(invRes.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-32">
        <div className="animate-spin h-8 w-8 border-4 border-[#00A884] border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const months = summary?.monthly ? Object.keys(summary.monthly).sort().reverse() : [];
  const gstMonths = gst?.monthly_gst ? Object.keys(gst.monthly_gst).sort().reverse() : [];

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-slate-900 flex items-center gap-2">
          <ChartBar weight="duotone" size={28} className="text-[#00A884]" />
          Reports & GST
        </h1>
        <p className="text-sm text-slate-500 mt-1">Complete financial overview of your business</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg mb-6 w-fit">
        {[["overview", "Overview"], ["gst", "GST Report"], ["inventory", "Inventory"]].map(([val, lbl]) => (
          <button
            key={val}
            onClick={() => setActiveTab(val)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === val ? "bg-white shadow text-slate-900" : "text-slate-500"
            }`}
          >
            {lbl}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === "overview" && summary && (
        <div className="space-y-6">
          {/* Top Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendUp weight="bold" size={16} className="text-green-600" />
                <p className="text-xs text-green-600 font-medium">Total Income</p>
              </div>
              <p className="text-2xl font-bold text-green-700">₹{(summary.total_income || 0).toLocaleString("en-IN")}</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendDown weight="bold" size={16} className="text-red-600" />
                <p className="text-xs text-red-600 font-medium">Total Expense</p>
              </div>
              <p className="text-2xl font-bold text-red-700">₹{(summary.total_expense || 0).toLocaleString("en-IN")}</p>
            </div>
            <div className={`border rounded-xl p-4 ${summary.profit >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"}`}>
              <div className="flex items-center gap-2 mb-1">
                <CurrencyInr weight="bold" size={16} className={summary.profit >= 0 ? "text-emerald-600" : "text-rose-600"} />
                <p className={`text-xs font-medium ${summary.profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {summary.profit >= 0 ? "Net Profit" : "Net Loss"}
                </p>
              </div>
              <p className={`text-2xl font-bold ${summary.profit >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                ₹{Math.abs(summary.profit || 0).toLocaleString("en-IN")}
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Receipt weight="bold" size={16} className="text-slate-600" />
                <p className="text-xs text-slate-600 font-medium">Transactions</p>
              </div>
              <p className="text-2xl font-bold text-slate-700">{summary.transaction_count || 0}</p>
            </div>
          </div>

          {/* Monthly Breakdown */}
          {months.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Calendar size={16} /> Monthly Breakdown
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 text-xs">
                      <th className="text-left py-2 px-2">Month</th>
                      <th className="text-right py-2 px-2">Income</th>
                      <th className="text-right py-2 px-2">Expense</th>
                      <th className="text-right py-2 px-2">Profit/Loss</th>
                    </tr>
                  </thead>
                  <tbody>
                    {months.slice(0, 12).map((month) => {
                      const d = summary.monthly[month];
                      const pl = (d.income || 0) - (d.expense || 0);
                      return (
                        <tr key={month} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-2.5 px-2 font-medium">{month}</td>
                          <td className="py-2.5 px-2 text-right text-green-600">₹{(d.income || 0).toLocaleString("en-IN")}</td>
                          <td className="py-2.5 px-2 text-right text-red-600">₹{(d.expense || 0).toLocaleString("en-IN")}</td>
                          <td className={`py-2.5 px-2 text-right font-medium ${pl >= 0 ? "text-green-700" : "text-red-700"}`}>
                            {pl >= 0 ? "+" : "-"}₹{Math.abs(pl).toLocaleString("en-IN")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Category Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category Expense */}
            {Object.keys(summary.category_expense || {}).length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <h3 className="text-sm font-bold text-slate-800 mb-3">Expense by Category</h3>
                <div className="space-y-2">
                  {Object.entries(summary.category_expense).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
                    <div key={cat} className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 capitalize">{cat}</span>
                      <span className="text-sm font-medium text-red-600">₹{amt.toLocaleString("en-IN")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Category Income */}
            {Object.keys(summary.category_income || {}).length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <h3 className="text-sm font-bold text-slate-800 mb-3">Income by Category</h3>
                <div className="space-y-2">
                  {Object.entries(summary.category_income).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
                    <div key={cat} className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 capitalize">{cat}</span>
                      <span className="text-sm font-medium text-green-600">₹{amt.toLocaleString("en-IN")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* GST TAB */}
      {activeTab === "gst" && gst && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-xs text-blue-600 font-medium mb-1">Total Sales</p>
              <p className="text-2xl font-bold text-blue-700">₹{(gst.total_sales || 0).toLocaleString("en-IN")}</p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <p className="text-xs text-purple-600 font-medium mb-1">GST Collected</p>
              <p className="text-2xl font-bold text-purple-700">₹{(gst.total_tax_collected || 0).toLocaleString("en-IN")}</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-xs text-green-600 font-medium mb-1">Invoices (Paid)</p>
              <p className="text-2xl font-bold text-green-700">{gst.paid || 0}</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-xs text-amber-600 font-medium mb-1">Invoices (Unpaid)</p>
              <p className="text-2xl font-bold text-amber-700">{gst.unpaid || 0}</p>
            </div>
          </div>

          {/* Monthly GST */}
          {gstMonths.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="text-sm font-bold text-slate-800 mb-4">Monthly GST Summary</h3>
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-xs">
                    <th className="text-left py-2 px-2">Month</th>
                    <th className="text-right py-2 px-2">Sales</th>
                    <th className="text-right py-2 px-2">GST</th>
                    <th className="text-right py-2 px-2">Invoices</th>
                  </tr>
                </thead>
                <tbody>
                  {gstMonths.map((month) => {
                    const d = gst.monthly_gst[month];
                    return (
                      <tr key={month} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-2.5 px-2 font-medium">{month}</td>
                        <td className="py-2.5 px-2 text-right">₹{(d.sales || 0).toLocaleString("en-IN")}</td>
                        <td className="py-2.5 px-2 text-right text-purple-600 font-medium">₹{(d.tax || 0).toLocaleString("en-IN")}</td>
                        <td className="py-2.5 px-2 text-right">{d.count}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </div>
          )}

          {gstMonths.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <Receipt size={48} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm">Create invoices to see GST reports here</p>
            </div>
          )}
        </div>
      )}

      {/* INVENTORY TAB */}
      {activeTab === "inventory" && inventory && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
              <p className="text-xs text-indigo-600 font-medium mb-1">Total Products</p>
              <p className="text-2xl font-bold text-indigo-700">{inventory.total_items || 0}</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-xs text-green-600 font-medium mb-1">Total Stock Value</p>
              <p className="text-2xl font-bold text-green-700">₹{(inventory.total_value || 0).toLocaleString("en-IN")}</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-xs text-red-600 font-medium mb-1">Low Stock Items</p>
              <p className="text-2xl font-bold text-red-700">{inventory.low_stock_count || 0}</p>
            </div>
          </div>

          {/* Low Stock Alert */}
          {(inventory.low_stock || []).length > 0 && (
            <div className="bg-white border border-red-200 rounded-xl p-5">
              <h3 className="text-sm font-bold text-red-700 mb-3 flex items-center gap-2">
                <Package size={16} /> Low Stock Alert
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {inventory.low_stock.map((item, i) => (
                  <div key={i} className="flex items-center justify-between bg-red-50 rounded-lg px-3 py-2">
                    <span className="text-sm text-slate-700 capitalize">{item.name}</span>
                    <span className="text-sm font-bold text-red-600">{item.quantity} left</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
