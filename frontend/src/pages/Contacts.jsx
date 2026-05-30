import React, { useEffect, useState } from "react";
import { api } from "lib/api";
import { Users } from "@phosphor-icons/react";

export default function Contacts() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/api/contacts").then(r => setItems(r.data.items || [])).finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6">
      <div className="mb-5">
        <div className="label-tiny mb-1">CRM</div>
        <h1 className="font-display font-black text-3xl tracking-tighter">Contacts</h1>
        <p className="text-slate-600 text-sm mt-1">Names you mention in your chat become contacts automatically.</p>
      </div>

      {loading ? (
        <div className="card-flat p-8 text-center text-slate-500">{"Loading\u2026"}</div>
      ) : items.length === 0 ? (
        <div className="card-flat p-12 text-center">
          <Users weight="duotone" size={48} className="text-slate-300 mx-auto mb-3" />
          <div className="font-display font-bold text-lg mb-1">No contacts yet</div>
          <p className="text-sm text-slate-500">Tag party names in messages \u2014 "sold 100rs to Ramesh".</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((c) => (
            <div key={c.name} className="card-flat p-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-slate-900 text-white grid place-items-center font-display font-bold text-lg" style={{ borderRadius: 4 }}>
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-display font-bold text-lg tracking-tight capitalize truncate">{c.name}</div>
                  <div className="label-tiny text-slate-500">{c.count} interactions</div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 pt-3 border-t border-slate-100">
                <div>
                  <div className="label-tiny text-slate-500">Earned</div>
                  <div className="font-display font-bold text-signal">\u20b9{Math.round(c.total_income || 0).toLocaleString("en-IN")}</div>
                </div>
                <div>
                  <div className="label-tiny text-slate-500">Paid out</div>
                  <div className="font-display font-bold text-rose-600">\u20b9{Math.round(c.total_expense || 0).toLocaleString("en-IN")}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
