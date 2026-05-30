import React, { useState, useRef, useEffect } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "lib/auth";
import { useLanguage, LANGUAGES } from "lib/i18n";
import {
  House, ChatCircleDots, Receipt, Package, Users, ChartLineUp,
  Lightning, Gear, SignOut, Newspaper, FileImage, HandCoins,
  Invoice, UsersThree, ChartBar, Storefront, Crown, Translate,
} from "@phosphor-icons/react";

const NAV_ITEMS = [
  { to: "/app", icon: House, labelKey: "nav.dashboard", end: true },
  { to: "/app/chat", icon: ChatCircleDots, labelKey: "nav.aiChat" },
  { to: "/app/transactions", icon: Receipt, labelKey: "nav.transactions" },
  { to: "/app/inventory", icon: Package, labelKey: "nav.inventory" },
  { to: "/app/udhar", icon: HandCoins, labelKey: "nav.udharBook" },
  { to: "/app/invoices", icon: Invoice, labelKey: "nav.invoices" },
  { to: "/app/contacts", icon: Users, labelKey: "nav.contacts" },
  { to: "/app/staff", icon: UsersThree, labelKey: "nav.staff" },
  { to: "/app/store", icon: Storefront, labelKey: "nav.onlineStore" },
  { to: "/app/reports", icon: ChartBar, labelKey: "nav.reports" },
  { to: "/app/bills", icon: FileImage, labelKey: "nav.billRecords" },
  { to: "/app/market", icon: Newspaper, labelKey: "nav.aiNews" },
  { to: "/app/settings", icon: Gear, labelKey: "nav.settings" },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef(null);

  const handleLogout = () => { logout(); navigate("/"); };
  const initial = (user?.name || "?").charAt(0).toUpperCase();
  const currentLang = LANGUAGES.find((l) => l.code === language);

  // Close language dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="flex h-screen bg-[#F9FAFB]">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-[260px] bg-white border-r border-slate-200 flex-col">
        <div className="px-5 py-5 border-b border-slate-200 flex items-center gap-2.5">
          <img src="/vyaparmind-logo.png" alt="VyaparMind" className="w-10 h-10 rounded" />
          <span className="font-display font-black tracking-tighter text-xl text-slate-900">VyaparMind</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
                }`
              }
              style={{ borderRadius: 4 }}
            >
              <n.icon weight="duotone" size={18} />
              {t(n.labelKey)}
            </NavLink>
          ))}
        </nav>

        {/* Upgrade Button */}
        <div className="px-3 pb-2">
          <NavLink
            to="/app/upgrade"
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2.5 text-sm font-bold transition-all ${
                isActive
                  ? "bg-gradient-to-r from-[#00A884] to-[#00C896] text-white shadow-md"
                  : "bg-gradient-to-r from-[#00A884]/10 to-[#00C896]/10 text-[#00A884] hover:from-[#00A884] hover:to-[#00C896] hover:text-white"
              }`
            }
            style={{ borderRadius: 6 }}
          >
            <Crown weight="fill" size={18} />
            {t("nav.upgradePro")}
          </NavLink>
        </div>

        {/* Language Selector */}
        <div className="px-3 pb-2 relative" ref={langRef}>
          <button
            onClick={() => setLangOpen(!langOpen)}
            className="flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 w-full transition-colors"
            style={{ borderRadius: 4 }}
          >
            <Translate weight="duotone" size={18} />
            <span className="flex-1 text-left">{currentLang?.native || "English"}</span>
            <svg className={`w-3.5 h-3.5 transition-transform ${langOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>
          {langOpen && (
            <div className="absolute bottom-full left-3 right-3 mb-1 bg-white border border-slate-200 shadow-xl max-h-72 overflow-y-auto z-50" style={{ borderRadius: 6 }}>
              <div className="p-2 border-b border-slate-100 sticky top-0 bg-white">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t("lang.select")}</span>
              </div>
              <div className="p-1">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => { setLanguage(lang.code); setLangOpen(false); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                      language === lang.code ? "bg-[#00A884]/10 text-[#00A884] font-semibold" : "text-slate-700 hover:bg-slate-50"
                    }`}
                    style={{ borderRadius: 4 }}
                  >
                    <span className="flex-1 text-left">{lang.native}</span>
                    <span className="text-xs text-slate-400">{lang.name}</span>
                    {language === lang.code && <svg className="w-4 h-4 text-[#00A884]" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User section at bottom */}
        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-slate-900 text-white grid place-items-center font-display font-bold text-sm" style={{ borderRadius: 4 }}>
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{user?.name || "User"}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-rose-600 transition-colors"
          >
            <SignOut size={16} /> {t("nav.signOut")}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
