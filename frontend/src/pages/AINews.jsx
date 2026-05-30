import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "lib/auth";
import { api } from "lib/api";
import {
  Newspaper, TrendUp, Robot, PaperPlaneTilt, ArrowClockwise,
  CaretRight, Tag, Globe, Lightning
} from "@phosphor-icons/react";

const TABS = [
  { id: "news", label: "Market News", icon: Newspaper },
  { id: "rates", label: "Live Rates", icon: TrendUp },
  { id: "ask", label: "Ask AI Agent", icon: Robot },
];

export default function AINews() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("news");

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white">
        <h1 className="font-display font-black text-xl tracking-tight text-slate-900">
          AI Market News
        </h1>
        <p className="text-sm text-slate-500">
          {"Latest rates, news & AI price agent for your "}
          <span className="font-semibold text-signal capitalize">{user?.business_type || "business"}</span>
        </p>
      </div>

      {/* Tab bar */}
      <div className="px-6 pt-3 bg-white border-b border-slate-200">
        <div className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold tracking-widest uppercase transition-colors ${
                activeTab === t.id
                  ? "text-signal border-b-2 border-signal"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <t.icon size={14} weight={activeTab === t.id ? "fill" : "regular"} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === "news" && <NewsTab />}
        {activeTab === "rates" && <RatesTab />}
        {activeTab === "ask" && <AskTab />}
      </div>
    </div>
  );
}

/* ──────────────── NEWS TAB ──────────────── */
function NewsTab() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadNews = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get("/api/market/news");
      setNews(data.news || []);
    } catch (e) {
      setError("Could not load news. Check your internet connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadNews(); }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-signal border-t-transparent rounded-full mb-4" />
        <p className="text-sm text-slate-500">{"Fetching latest market news\u2026"}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-flat p-8 text-center">
        <Globe size={40} className="text-slate-300 mx-auto mb-3" />
        <p className="text-sm text-slate-500 mb-4">{error}</p>
        <button onClick={loadNews} className="btn-signal px-4 py-2 text-xs font-bold uppercase tracking-widest">
          <ArrowClockwise size={14} className="inline mr-1" /> Retry
        </button>
      </div>
    );
  }

  if (news.length === 0) {
    return (
      <div className="card-flat p-12 text-center">
        <Newspaper weight="duotone" size={48} className="text-slate-300 mx-auto mb-3" />
        <div className="font-display font-bold text-lg mb-1">No news found</div>
        <p className="text-sm text-slate-500">{"We couldn\u2019t find recent news for your business type."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <div className="label-tiny text-slate-500">{news.length} articles found</div>
        <button onClick={loadNews} className="text-xs text-signal hover:underline flex items-center gap-1">
          <ArrowClockwise size={12} /> Refresh
        </button>
      </div>
      {news.map((item, i) => (
        <a
          key={i}
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          className="card-flat p-4 block hover:border-signal transition-colors group"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 w-8 h-8 bg-emerald-50 grid place-items-center flex-shrink-0" style={{ borderRadius: 4 }}>
              <Newspaper size={16} className="text-signal" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-slate-800 group-hover:text-signal transition-colors line-clamp-2">
                {item.title}
              </h3>
              <div className="flex items-center gap-3 mt-1.5">
                {item.source && (
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{item.source}</span>
                )}
                {item.published && (
                  <span className="text-[10px] text-slate-400 tracking-wider">
                    {new Date(item.published).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </span>
                )}
              </div>
            </div>
            <CaretRight size={14} className="text-slate-300 group-hover:text-signal mt-1 flex-shrink-0" />
          </div>
        </a>
      ))}
    </div>
  );
}

/* ──────────────── RATES TAB ──────────────── */
function RatesTab() {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadRates = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/market/rates");
      setRates(data.rates || []);
    } catch (e) {
      setRates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRates(); }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-signal border-t-transparent rounded-full mb-4" />
        <p className="text-sm text-slate-500">{"Fetching market rates\u2026"}</p>
      </div>
    );
  }

  if (rates.length === 0) {
    return (
      <div className="card-flat p-12 text-center">
        <TrendUp weight="duotone" size={48} className="text-slate-300 mx-auto mb-3" />
        <div className="font-display font-bold text-lg mb-1">No rates available</div>
        <p className="text-sm text-slate-500">Rate data is not available for your business type right now.</p>
      </div>
    );
  }

  // Group by category
  const grouped = {};
  rates.forEach((r) => {
    const cat = r.category || "other";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(r);
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="label-tiny text-slate-500">{rates.length} commodities tracked</div>
        <button onClick={loadRates} className="text-xs text-signal hover:underline flex items-center gap-1">
          <ArrowClockwise size={12} /> Refresh
        </button>
      </div>

      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat}>
          <div className="label-tiny text-slate-500 uppercase mb-2 flex items-center gap-1.5">
            <Tag size={10} /> {cat}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {items.map((r, i) => (
              <div key={i} className="card-flat p-3.5 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-800">{r.name}</div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">{r.unit}</div>
                </div>
                <div className="text-right">
                  {r.price ? (
                    <>
                      <div className="text-sm font-bold text-signal">{"\u20B9"}{r.price}</div>
                      {r.market && <div className="text-[9px] text-slate-400 mt-0.5">{r.market}</div>}
                    </>
                  ) : (
                    <div className="text-xs text-slate-400 italic">{"Check mandi"}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="card-flat p-4 bg-amber-50 border-amber-200">
        <p className="text-xs text-amber-700">
          <Lightning weight="fill" size={12} className="inline mr-1" />
          {"Prices sourced from government data (agmarknet.gov.in). May vary by region and market."}
        </p>
      </div>
    </div>
  );
}

/* ──────────────── ASK AI TAB ──────────────── */
function AskTab() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleAsk = async () => {
    const q = input.trim();
    if (!q || busy) return;
    setInput("");
    setMessages((prev) => [...prev, { side: "user", text: q }]);
    setBusy(true);

    try {
      const { data } = await api.post("/api/market/ask", { question: q });
      setMessages((prev) => [...prev, { side: "ai", text: data.answer, source: data.source }]);
    } catch (e) {
      setMessages((prev) => [...prev, { side: "ai", text: "Sorry, I could not process that. Please try again.", source: "error" }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-4 min-h-[300px]">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Robot size={48} className="text-slate-300 mb-4" />
            <div className="font-display font-bold text-lg text-slate-700 mb-1">Market Price AI Agent</div>
            <p className="text-sm text-slate-500 max-w-sm">
              {"Ask me about current market prices, commodity rates, or business trends. I understand Hindi, English, and Hinglish!"}
            </p>
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {["Wheat ka rate kya hai?", "Sugar price today", "Onion market rate", "Tell me about dal prices"].map((s) => (
                <button
                  key={s}
                  onClick={() => { setInput(s); }}
                  className="px-3 py-1.5 text-xs border border-slate-200 text-slate-600 hover:border-signal hover:text-signal transition-colors"
                  style={{ borderRadius: 4 }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.side === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] px-4 py-3 text-sm whitespace-pre-wrap ${
                m.side === "user"
                  ? "bg-signal text-white"
                  : "bg-slate-100 text-slate-800 border border-slate-200"
              }`}
              style={{ borderRadius: 8 }}
            >
              {m.text}
              {m.source && m.side === "ai" && (
                <div className="mt-1.5 text-[9px] uppercase tracking-wider opacity-60">
                  {m.source === "ai" ? "via AI" : m.source === "local" ? "local knowledge" : ""}
                </div>
              )}
            </div>
          </div>
        ))}

        {busy && (
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <Lightning weight="fill" size={14} className="text-signal animate-pulse" />
            {"Checking market data\u2026"}
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-200 pt-4 mt-auto">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAsk(); } }}
            placeholder="Ask about any product price..."
            className="flex-1 px-4 py-2.5 border border-slate-200 bg-slate-50 text-sm outline-none focus:ring-1 focus:ring-signal focus:border-signal"
            style={{ borderRadius: 4 }}
            disabled={busy}
          />
          <button
            onClick={handleAsk}
            disabled={!input.trim() || busy}
            className="p-2.5 bg-signal text-white hover:bg-[#008F6F] transition-colors disabled:opacity-50"
            style={{ borderRadius: 4 }}
          >
            <PaperPlaneTilt weight="fill" size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
