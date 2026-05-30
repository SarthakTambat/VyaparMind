import React, { useEffect, useState } from "react";
import { api } from "lib/api";
import { Sparkle, ChartLineUp } from "@phosphor-icons/react";
import { toast } from "sonner";

export default function Insights() {
  const [items, setItems] = useState([]);
  const [report, setReport] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await api.get("/api/insights");
    setItems(data.items || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const generate = async () => {
    setGenerating(true);
    try {
      const { data } = await api.post("/api/insights/generate");
      setReport(data.report);
      toast.success("Weekly report generated");
      load();
    } catch { toast.error("Could not generate report"); }
    finally { setGenerating(false); }
  };

  return (
    <div className="p-6">
      <div className="flex items-end justify-between mb-5">
        <div>
          <div className="label-tiny mb-1">AI Insights</div>
          <h1 className="font-display font-black text-3xl tracking-tighter">Your business, explained.</h1>
        </div>
        <button onClick={generate} disabled={generating} className="btn-signal inline-flex items-center gap-2 disabled:opacity-60">
          <Sparkle weight="fill" size={16} /> {generating ? "Generating\u2026" : "Generate weekly report"}
        </button>
      </div>

      {report && (
        <div className="card-flat p-6 mb-5 bg-emerald-50 border-emerald-200">
          <div className="label-tiny text-emerald-700 mb-2">{"AI weekly report \u00B7 just now"}</div>
          <div className="prose prose-sm max-w-none whitespace-pre-wrap text-slate-800 leading-relaxed">{report}</div>
        </div>
      )}

      {loading ? (
        <div className="card-flat p-8 text-center text-slate-500">{"Loading\u2026"}</div>
      ) : items.length === 0 ? (
        <div className="card-flat p-12 text-center">
          <ChartLineUp weight="duotone" size={48} className="text-slate-300 mx-auto mb-3" />
          <div className="font-display font-bold text-lg mb-1">No insights yet</div>
          <p className="text-sm text-slate-500">{"Generate a report \u2014 AI will analyze your transactions and give actionable suggestions."}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((i) => (
            <li key={i.id} className="card-flat p-4">
              <div className="flex items-start gap-3">
                <Sparkle weight="fill" className="text-signal mt-1" size={18} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{i.title}</div>
                  <div className="text-sm text-slate-600 leading-relaxed mt-1 whitespace-pre-wrap">{i.description}</div>
                  <div className="label-tiny text-slate-400 mt-2">{new Date(i.created_at).toLocaleString("en-IN")}</div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
