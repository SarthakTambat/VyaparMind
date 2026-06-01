import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "lib/api";
import { useLanguage } from "lib/i18n";
import { ArrowUp, ArrowDown, Sparkle, Warning, Receipt, ChatCircleDots, Camera, Microphone, ArrowRight, Package, Crown } from "@phosphor-icons/react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { isProUser } from "components/UpgradeModal";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    api.get("/api/dashboard").then(r => setData(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton />;
  if (!data) return <div className="text-slate-500 p-8">{t("common.error")}</div>;

  const today = data.today || {};
  const score = data.score ?? 0;

  return (
    <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="label-tiny mb-1">{t("dash.today")}</div>
          <h1 className="font-display font-black text-2xl sm:text-3xl tracking-tighter">{t("dash.greeting", { name: data.user?.name?.split(" ")[0] || "boss" })}</h1>
          {data.user?.business_name && (
            <div className="mt-1.5 flex items-center gap-2">
              <span className="font-display font-bold text-base sm:text-lg tracking-tight text-signal">{data.user.business_name}</span>
              <span className="text-[10px] font-bold tracking-widest uppercase px-1.5 py-0.5 bg-emerald-50 text-signal border border-emerald-200" style={{ borderRadius: 3 }}>
                {data.user.business_type || "business"}
              </span>
            </div>
          )}
          <p className="text-slate-600 text-sm mt-1">{t("dash.subtitle")}</p>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-2">
          {isProUser(data.user) && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200" style={{ borderRadius: 4 }}>
              <Crown weight="fill" size={14} className="text-signal" />
              <span className="text-[10px] font-bold tracking-widest uppercase text-signal">
                {(data.user.plan || "vikas").toUpperCase()} Plan
              </span>
              {data.user.plan_expires_at && (
                <span className="text-[9px] text-slate-500">
                  {"\u00B7"} expires {new Date(data.user.plan_expires_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </span>
              )}
            </div>
          )}
          <Link to="/app/chat" className="btn-signal inline-flex items-center gap-2 self-start sm:self-auto">
            <ChatCircleDots weight="fill" size={16} /> {t("dash.tellAI")}
          </Link>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label={t("dash.incomeToday")} value={fmt(today.income)} accent="text-emerald-600" Icon={ArrowUp} />
        <Kpi label={t("dash.expenseToday")} value={fmt(today.expense)} accent="text-rose-600" Icon={ArrowDown} />
        <Kpi label={t("dash.profitToday")} value={fmt(today.profit)} accent={today.profit >= 0 ? "text-slate-900" : "text-rose-600"} Icon={Receipt} />
        <Kpi label={t("dash.healthScore")} value={`${score}/100`} accent="text-signal" Icon={Sparkle} desc={t("dash.healthDesc")} />
      </div>

      {/* Chart */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card-flat p-5">
          <div className="flex items-center justify-between mb-1">
            <div>
              <div className="label-tiny text-slate-500">{t("dash.last7days")}</div>
              <h3 className="font-display font-bold text-lg tracking-tight">{t("dash.cashFlow")}</h3>
            </div>
            <div className="flex gap-3 text-xs">
              <Legend color="#00A884" label={t("dash.income")} />
              <Legend color="#EF4444" label={t("dash.expense")} />
            </div>
          </div>
          <div className="h-64 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="day" tickFormatter={(d) => d.slice(5)} stroke="#9CA3AF" fontSize={11} />
                <YAxis stroke="#9CA3AF" fontSize={11} />
                <Tooltip contentStyle={{ borderRadius: 4, fontSize: 12, border: "1px solid #E5E7EB" }} />
                <Line type="monotone" dataKey="income" stroke="#00A884" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="expense" stroke="#EF4444" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Health gauge */}
        <div className="card-flat p-5 bg-[#090E17] text-white border-[#090E17] relative overflow-hidden">
          <div className="absolute inset-0 grid-bg opacity-30" />
          <div className="relative">
            <div className="label-tiny text-white/50">{t("dash.businessHealth")}</div>
            <h3 className="font-display font-bold text-lg tracking-tight">{t("dash.thisWeek")}</h3>
            <Gauge value={score} />
            <p className="text-xs text-white/65 leading-relaxed mt-2">
              {score >= 70 ? t("dash.healthGood") : score >= 40 ? t("dash.healthMid") : t("dash.healthLow")}
            </p>
          </div>
        </div>
      </div>

      {/* Alerts + Activity */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card-flat p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="label-tiny text-slate-500">{t("dash.smartAlerts")}</div>
              <h3 className="font-display font-bold text-lg tracking-tight">{t("dash.watchOuts")}</h3>
            </div>
            <Link to="/app/insights" className="text-xs text-signal font-semibold tracking-widest uppercase hover:underline">{t("dash.all")}</Link>
          </div>
          {(data.low_stock?.length > 0 || data.insights?.length > 0) ? (
            <ul className="space-y-2">
              {data.low_stock?.slice(0, 3).map((s) => (
                <li key={s.id || s.name} className="flex items-start gap-2.5 p-2.5 bg-amber-50 border border-amber-200" style={{ borderRadius: 4 }}>
                  <Warning weight="fill" className="text-amber-600 mt-0.5" size={16} />
                  <div className="text-sm"><b className="capitalize">{s.name}</b> {t("dash.runningLow", { name: "", qty: s.quantity, unit: s.unit || "" }).trim()}</div>
                </li>
              ))}
              {data.insights?.slice(0, 3).map((s) => (
                <li key={s.id} className="flex items-start gap-2.5 p-2.5 bg-emerald-50 border border-emerald-100" style={{ borderRadius: 4 }}>
                  <Sparkle weight="fill" className="text-signal mt-0.5" size={16} />
                  <div className="text-sm">{s.title || s.description}</div>
                </li>
              ))}
            </ul>
          ) : (
            <Empty msg={t("dash.noAlerts")} />
          )}
        </div>

        <div className="card-flat p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="label-tiny text-slate-500">{t("dash.aiActivity")}</div>
              <h3 className="font-display font-bold text-lg tracking-tight">{t("dash.recentActions")}</h3>
            </div>
            <Link to="/app/chat" className="text-xs text-signal font-semibold tracking-widest uppercase hover:underline">{t("dash.openChat")}</Link>
          </div>
          {data.recent?.length ? (
            <ul className="space-y-2">
              {data.recent.slice(0, 5).map((c) => (
                <li key={c.id} className="flex items-start gap-2.5 text-sm">
                  <div className="w-7 h-7 grid place-items-center bg-slate-100" style={{ borderRadius: 4 }}>
                    {c.channel === "chat-voice" ? <Microphone size={14} /> : c.channel === "chat-photo" ? <Camera size={14} /> : <ChatCircleDots size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-slate-700">{c.raw_input}</div>
                    <div className="text-[11px] text-slate-500 tracking-wider uppercase mt-0.5">{c.actions_count} {c.actions_count === 1 ? t("dash.action") : t("dash.actions")} {t("common.recorded")}</div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Empty msg={t("dash.noConversations")} />
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card-flat p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="label-tiny text-slate-500">{t("dash.topCustomers")}</div>
              <h3 className="font-display font-bold text-lg tracking-tight">{t("dash.whoKeeping")}</h3>
            </div>
            <Link to="/app/contacts" className="text-xs text-signal font-semibold tracking-widest uppercase hover:underline">{t("dash.viewAll")}</Link>
          </div>
          {data.top_contacts?.length ? (
            <div className="grid sm:grid-cols-2 gap-2">
              {data.top_contacts.map((c) => (
                <div key={c.name} className="flex items-center justify-between p-3 border border-slate-200" style={{ borderRadius: 4 }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 bg-slate-900 text-white grid place-items-center font-display font-bold" style={{ borderRadius: 4 }}>
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate">{c.name}</div>
                      <div className="text-[11px] text-slate-500 tracking-wider uppercase">{c.count} {t("dash.tx")}</div>
                    </div>
                  </div>
                  <div className="font-display font-bold text-sm text-signal">{fmt(c.total)}</div>
                </div>
              ))}
            </div>
          ) : (
            <Empty msg={t("dash.noCustomers")} />
          )}
        </div>

        <div className="card-flat p-5 bg-[#090E17] text-white border-[#090E17]">
          <div className="label-tiny text-white/50">{t("dash.quickActions")}</div>
          <h3 className="font-display font-bold text-lg tracking-tight mb-3">{t("dash.talkToAI")}</h3>
          <div className="space-y-2">
            <Link to="/app/chat" className="flex items-center justify-between w-full px-3 py-2.5 bg-white/5 hover:bg-white/10 transition-colors" style={{ borderRadius: 4 }}>
              <span className="flex items-center gap-2 text-sm"><ChatCircleDots size={16} /> {t("dash.textSale")}</span>
              <ArrowRight size={14} />
            </Link>
            <Link to="/app/chat" className="flex items-center justify-between w-full px-3 py-2.5 bg-white/5 hover:bg-white/10 transition-colors" style={{ borderRadius: 4 }}>
              <span className="flex items-center gap-2 text-sm"><Microphone size={16} /> {t("dash.sendVoice")}</span>
              <ArrowRight size={14} />
            </Link>
            <Link to="/app/chat" className="flex items-center justify-between w-full px-3 py-2.5 bg-white/5 hover:bg-white/10 transition-colors" style={{ borderRadius: 4 }}>
              <span className="flex items-center gap-2 text-sm"><Camera size={16} /> {t("dash.snapBill")}</span>
              <ArrowRight size={14} />
            </Link>
            <Link to="/app/inventory" className="flex items-center justify-between w-full px-3 py-2.5 bg-white/5 hover:bg-white/10 transition-colors" style={{ borderRadius: 4 }}>
              <span className="flex items-center gap-2 text-sm"><Package size={16} /> {t("dash.viewInventory")}</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function fmt(n) {
  if (n === undefined || n === null || isNaN(n)) return "\u20B90";
  const sign = n < 0 ? "-" : "";
  return `${sign}\u20B9${Math.abs(Math.round(n)).toLocaleString("en-IN")}`;
}

function Kpi({ label, value, accent, Icon, desc }) {
  return (
    <div className="card-flat p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <div className="label-tiny text-slate-500">{label}</div>
        <Icon weight="duotone" size={18} className={accent} />
      </div>
      <div className={`mt-2 font-display font-black text-2xl sm:text-3xl tracking-tighter ${accent}`}>{value}</div>
      {desc && <div className="text-[11px] text-slate-400 mt-1.5 leading-snug">{desc}</div>}
    </div>
  );
}

function Legend({ color, label }) {
  return (
    <span className="flex items-center gap-1.5 text-slate-500">
      <span className="w-2.5 h-2.5" style={{ background: color, borderRadius: 2 }} />
      {label}
    </span>
  );
}

function Empty({ msg }) {
  return <div className="text-sm text-slate-500 italic py-4 text-center">{msg}</div>;
}

function Gauge({ value }) {
  const radius = 56;
  const c = 2 * Math.PI * radius;
  const dash = (Math.max(0, Math.min(100, value)) / 100) * c;
  return (
    <div className="relative grid place-items-center my-4">
      <svg width="160" height="160" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r={radius} stroke="rgba(255,255,255,0.1)" strokeWidth="10" fill="none" />
        <circle
          cx="80" cy="80" r={radius} stroke="#00A884" strokeWidth="10" fill="none"
          strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
          transform="rotate(-90 80 80)"
        />
      </svg>
      <div className="absolute text-center">
        <div className="font-display font-black text-4xl tracking-tighter text-white">{value}</div>
        <div className="text-[10px] text-white/50 tracking-widest uppercase">/ 100</div>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="p-6 space-y-4">
      <div className="h-8 w-64 bg-slate-200 animate-pulse" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-white border border-slate-200 animate-pulse" />)}
      </div>
      <div className="h-64 bg-white border border-slate-200 animate-pulse" />
    </div>
  );
}
