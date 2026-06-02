import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChatCircleDots, CurrencyInr, Package, ChartLineUp, Receipt,
  ArrowsLeftRight, House, Play, Pause, ArrowRight, ArrowLeft,
  X, Microphone, Camera, Lightning, Bell, Users, Brain,
} from "@phosphor-icons/react";

const SLIDES = [
  {
    id: "dashboard",
    title: "Smart Dashboard",
    subtitle: "Your business health at a glance",
    icon: House,
    color: "#00A884",
    description: "See revenue, expenses, profit trends, and AI-powered business health score — all in real time.",
    mockup: (
      <div className="bg-white rounded-xl p-5 shadow-lg border border-slate-100 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-slate-400">Good morning</p>
            <p className="font-bold text-slate-800 text-lg">Sharma Electronics</p>
          </div>
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <span className="text-green-700 font-black text-sm">92</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <p className="text-[10px] text-slate-500">Revenue</p>
            <p className="font-bold text-green-700 text-sm">₹2.4L</p>
          </div>
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <p className="text-[10px] text-slate-500">Expenses</p>
            <p className="font-bold text-red-600 text-sm">₹1.1L</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <p className="text-[10px] text-slate-500">Profit</p>
            <p className="font-bold text-blue-700 text-sm">₹1.3L</p>
          </div>
        </div>
        <div className="h-16 bg-gradient-to-r from-green-100 via-green-200 to-green-100 rounded-lg flex items-end px-2 pb-1 gap-1">
          {[40,55,45,60,70,65,80,75,90,85,95,88].map((h,i) => (
            <div key={i} className="flex-1 bg-green-500 rounded-t" style={{height: `${h}%`}} />
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "ai-chat",
    title: "AI Chat Assistant",
    subtitle: "Talk in Hindi, English, or Hinglish",
    icon: ChatCircleDots,
    color: "#00A884",
    description: "Just tell the AI what happened — \"Ramesh se 5000 ka maal becha\" — and it auto-records everything.",
    mockup: (
      <div className="bg-white rounded-xl p-4 shadow-lg border border-slate-100 w-full max-w-md">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-3">
          <div className="w-8 h-8 rounded-full bg-[#00A884] flex items-center justify-center">
            <Brain weight="fill" size={16} className="text-white" />
          </div>
          <span className="font-bold text-sm text-slate-800">VyaparMind AI</span>
        </div>
        <div className="space-y-3">
          <div className="flex justify-end">
            <div className="bg-[#00A884] text-white px-3 py-2 rounded-xl rounded-br-sm text-sm max-w-[80%]">
              Ramesh se 5000 ka maal becha credit pe
            </div>
          </div>
          <div className="flex justify-start">
            <div className="bg-slate-100 px-3 py-2 rounded-xl rounded-bl-sm text-sm max-w-[80%] text-slate-700">
              ✅ Recorded: <b>₹5,000 SALE</b> to Ramesh (credit)<br/>
              <span className="text-xs text-slate-500">Updated: Transactions + Udhar Book</span>
            </div>
          </div>
          <div className="flex justify-end">
            <div className="bg-[#00A884] text-white px-3 py-2 rounded-xl rounded-br-sm text-sm max-w-[80%]">
              🎤 <i className="opacity-75">voice: "aaj ki total bikri batao"</i>
            </div>
          </div>
          <div className="flex justify-start">
            <div className="bg-slate-100 px-3 py-2 rounded-xl rounded-bl-sm text-sm max-w-[80%] text-slate-700">
              📊 Today's sales: <b>₹18,500</b> (7 transactions)<br/>
              <span className="text-xs text-slate-500">↑ 23% vs yesterday</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
          <div className="flex-1 bg-slate-50 rounded-full px-3 py-2 text-xs text-slate-400">Type or speak in any language...</div>
          <Microphone size={18} className="text-[#00A884]" weight="fill" />
          <Camera size={18} className="text-slate-400" weight="fill" />
        </div>
      </div>
    ),
  },
  {
    id: "udhar",
    title: "Udhar Book",
    subtitle: "Track credit/debit like a pro",
    icon: CurrencyInr,
    color: "#EF4444",
    description: "Never forget who owes you. AI automatically updates khata from your conversations. Send payment reminders.",
    mockup: (
      <div className="bg-white rounded-xl p-4 shadow-lg border border-slate-100 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-800 text-sm">Udhar Book</h3>
          <div className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">₹47,500 due</div>
        </div>
        <div className="space-y-2">
          {[
            { name: "Ramesh Kumar", amount: "₹15,000", days: "12 days" },
            { name: "Suresh Traders", amount: "₹22,500", days: "8 days" },
            { name: "Priya Store", amount: "₹10,000", days: "3 days" },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <p className="font-semibold text-sm text-slate-800">{item.name}</p>
                <p className="text-[10px] text-slate-500">{item.days} overdue</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-red-600 text-sm">{item.amount}</p>
                <button className="text-[10px] text-[#00A884] font-bold">Remind →</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "inventory",
    title: "Inventory Management",
    subtitle: "Stock tracking with AI alerts",
    icon: Package,
    color: "#6366F1",
    description: "Auto-track stock from sales. Get low-stock alerts. AI predicts what to reorder and when.",
    mockup: (
      <div className="bg-white rounded-xl p-4 shadow-lg border border-slate-100 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-800 text-sm">Inventory</h3>
          <div className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">3 low stock</div>
        </div>
        <div className="space-y-2">
          {[
            { name: "Samsung Galaxy A15", qty: 2, max: 20, price: "₹12,999" },
            { name: "iPhone Cable Lightning", qty: 45, max: 100, price: "₹299" },
            { name: "JBL Earbuds T230", qty: 1, max: 15, price: "₹2,499" },
            { name: "Realme Charger 33W", qty: 30, max: 50, price: "₹799" },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
              <div className="flex-1">
                <p className="font-semibold text-xs text-slate-800">{item.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${item.qty / item.max < 0.2 ? 'bg-red-500' : 'bg-green-500'}`}
                      style={{ width: `${(item.qty / item.max) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500">{item.qty}/{item.max}</span>
                </div>
              </div>
              <span className="font-bold text-xs text-slate-700 ml-3">{item.price}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "transactions",
    title: "Transactions",
    subtitle: "Every rupee tracked automatically",
    icon: ArrowsLeftRight,
    color: "#0EA5E9",
    description: "All your sales and purchases auto-recorded from AI chat. Filter by party, date, type. Export anytime.",
    mockup: (
      <div className="bg-white rounded-xl p-4 shadow-lg border border-slate-100 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-800 text-sm">Recent Transactions</h3>
          <span className="text-[10px] text-slate-400">Today</span>
        </div>
        <div className="space-y-2">
          {[
            { party: "Ramesh Kumar", type: "SELL", amount: "+₹5,000", mode: "Credit" },
            { party: "Wholesale Mart", type: "BUY", amount: "-₹12,800", mode: "UPI" },
            { party: "Walk-in Customer", type: "SELL", amount: "+₹2,999", mode: "Cash" },
            { party: "Suresh Traders", type: "SELL", amount: "+₹8,500", mode: "Credit" },
            { party: "ABC Electronics", type: "BUY", amount: "-₹45,000", mode: "NEFT" },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
              <div>
                <p className="font-semibold text-xs text-slate-800">{item.party}</p>
                <p className="text-[10px] text-slate-500">{item.type} · {item.mode}</p>
              </div>
              <span className={`font-bold text-sm ${item.type === "SELL" ? "text-green-600" : "text-red-600"}`}>
                {item.amount}
              </span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "billing",
    title: "Smart Billing",
    subtitle: "Scan bills with your camera",
    icon: Receipt,
    color: "#F59E0B",
    description: "Snap a photo of any bill or invoice. AI extracts party name, amount, items. Zero manual entry.",
    mockup: (
      <div className="bg-white rounded-xl p-4 shadow-lg border border-slate-100 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-800 text-sm">Bill Scanner</h3>
          <Camera size={18} className="text-amber-600" weight="fill" />
        </div>
        <div className="bg-slate-800 rounded-lg p-4 mb-3 relative overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-48 h-32 border-2 border-dashed border-white/40 rounded-lg flex items-center justify-center">
              <span className="text-white/60 text-xs">📷 Bill photo</span>
            </div>
          </div>
          <div className="h-24" />
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-xs font-bold text-green-800 mb-2">✅ AI Extracted:</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><span className="text-slate-500">Party:</span> <span className="font-semibold">ABC Wholesale</span></div>
            <div><span className="text-slate-500">Amount:</span> <span className="font-semibold">₹23,450</span></div>
            <div><span className="text-slate-500">Items:</span> <span className="font-semibold">12 items</span></div>
            <div><span className="text-slate-500">Date:</span> <span className="font-semibold">01 Jun 2026</span></div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "reports",
    title: "AI Reports & Insights",
    subtitle: "Business intelligence for everyone",
    icon: ChartLineUp,
    color: "#8B5CF6",
    description: "Daily briefings, weekly summaries, profit analysis. AI tells you exactly what's going well and what needs attention.",
    mockup: (
      <div className="bg-white rounded-xl p-4 shadow-lg border border-slate-100 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-800 text-sm">Weekly Report</h3>
          <div className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">AI Generated</div>
        </div>
        <div className="space-y-3">
          <div className="p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
            <p className="text-xs font-bold text-green-800">📈 Revenue up 18%</p>
            <p className="text-[10px] text-green-700 mt-1">This week: ₹1,24,500 vs last week: ₹1,05,200</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-lg border-l-4 border-amber-500">
            <p className="text-xs font-bold text-amber-800">⚠️ 3 items need restock</p>
            <p className="text-[10px] text-amber-700 mt-1">Samsung A15, JBL Earbuds, Boat charger running low</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
            <p className="text-xs font-bold text-blue-800">💡 Recommendation</p>
            <p className="text-[10px] text-blue-700 mt-1">Offer 5% discount to clear old iPhone 13 stock (₹45K value)</p>
          </div>
          <div className="p-3 bg-red-50 rounded-lg border-l-4 border-red-500">
            <p className="text-xs font-bold text-red-800">🔴 ₹47,500 overdue</p>
            <p className="text-[10px] text-red-700 mt-1">Send reminders to Ramesh (₹15K, 12 days) & Suresh (₹22.5K)</p>
          </div>
        </div>
      </div>
    ),
  },
];

export default function Demo() {
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [touchStart, setTouchStart] = useState(null);

  const DURATION = 6000; // 6 seconds per slide

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % SLIDES.length);
    setProgress(0);
  }, []);

  const prev = useCallback(() => {
    setCurrent((c) => (c - 1 + SLIDES.length) % SLIDES.length);
    setProgress(0);
  }, []);

  // Swipe gestures for mobile
  const handleTouchStart = (e) => {
    setTouchStart(e.touches[0].clientX);
  };
  const handleTouchEnd = (e) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) next();
      else prev();
    }
    setTouchStart(null);
  };

  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          next();
          return 0;
        }
        return p + (100 / (DURATION / 50));
      });
    }, 50);
    return () => clearInterval(interval);
  }, [playing, next]);

  const slide = SLIDES[current];
  const Icon = slide.icon;

  return (
    <div className="fixed inset-0 z-[9999] bg-[#090E17] flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 sm:px-8 py-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <img src="/vyaparmind-logo.png" alt="VyaparMind" className="w-7 h-7 sm:w-8 sm:h-8" />
          <span className="font-display font-black text-white text-base sm:text-lg tracking-tighter">VyaparMind Demo</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/register"
            className="hidden sm:inline-flex items-center gap-2 bg-[#00A884] text-white font-bold text-sm px-4 py-2 rounded-lg hover:bg-[#008f6f] transition-colors"
          >
            Start Free <ArrowRight weight="bold" size={14} />
          </Link>
          <Link to="/" className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
            <X size={16} className="text-white" weight="bold" />
          </Link>
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex items-center gap-1 px-4 sm:px-8 pt-3 shrink-0">
        {SLIDES.map((s, i) => (
          <button
            key={s.id}
            onClick={() => { setCurrent(i); setProgress(0); }}
            className="flex-1 h-[3px] rounded-full overflow-hidden bg-white/10 transition-all"
          >
            <div
              className="h-full rounded-full transition-all duration-100"
              style={{
                width: i < current ? "100%" : i === current ? `${progress}%` : "0%",
                background: i <= current ? slide.color : "transparent",
              }}
            />
          </button>
        ))}
      </div>

      {/* Main content - scrollable on mobile */}
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-8 py-4 sm:py-6"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-5xl mx-auto flex flex-col lg:grid lg:grid-cols-2 gap-5 sm:gap-8 lg:items-center min-h-full"
          >
            {/* Mockup - shows first on mobile */}
            <div className="flex items-center justify-center lg:order-2">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1, duration: 0.35 }}
                className="w-full max-w-[320px] sm:max-w-sm lg:max-w-md transform scale-[0.85] sm:scale-100 origin-top"
              >
                {slide.mockup}
              </motion.div>
            </div>

            {/* Text content */}
            <div className="lg:order-1">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: slide.color + "20" }}
                >
                  <Icon size={20} weight="fill" style={{ color: slide.color }} />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight leading-tight">{slide.title}</h2>
                  <p className="text-xs sm:text-sm text-white/50">{slide.subtitle}</p>
                </div>
              </div>
              <p className="text-sm sm:text-base lg:text-lg text-white/70 leading-relaxed">{slide.description}</p>

              {/* Controls */}
              <div className="mt-5 sm:mt-8 flex items-center gap-4 sm:gap-6">
                <div className="flex items-center gap-1 text-white/40 text-sm">
                  <span className="font-bold text-white">{current + 1}</span>
                  <span>/</span>
                  <span>{SLIDES.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={prev}
                    className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 flex items-center justify-center transition-colors"
                  >
                    <ArrowLeft size={16} className="text-white" weight="bold" />
                  </button>
                  <button
                    onClick={() => setPlaying(!playing)}
                    className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 flex items-center justify-center transition-colors"
                  >
                    {playing ? <Pause size={16} className="text-white" weight="fill" /> : <Play size={16} className="text-white" weight="fill" />}
                  </button>
                  <button
                    onClick={next}
                    className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 flex items-center justify-center transition-colors"
                  >
                    <ArrowRight size={16} className="text-white" weight="bold" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom CTA */}
      <div className="px-4 sm:px-8 py-3 sm:py-4 border-t border-white/10 flex items-center justify-between shrink-0 safe-area-bottom">
        <p className="text-sm text-white/40 hidden sm:block">See how VyaparMind transforms Indian businesses</p>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Link
            to="/register"
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-[#00A884] text-white font-bold text-sm px-6 py-3 rounded-lg hover:bg-[#008f6f] active:scale-[0.97] transition-all"
          >
            Start Free Now <ArrowRight weight="bold" size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
