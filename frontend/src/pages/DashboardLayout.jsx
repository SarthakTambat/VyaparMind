import React from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "lib/auth";
import {
  House, ChatCircleDots, Receipt, Package, Users, ChartLineUp,
  Lightning, Gear, SignOut, Newspaper, FileImage, HandCoins,
  Invoice, UsersThree, ChartBar, Storefront, Crown,
} from "@phosphor-icons/react";

const NAV = [
  { to: "/app", icon: House, label: "Dashboard", end: true },
  { to: "/app/chat", icon: ChatCircleDots, label: "AI Chat" },
  { to: "/app/transactions", icon: Receipt, label: "Transactions" },
  { to: "/app/inventory", icon: Package, label: "Inventory" },
  { to: "/app/udhar", icon: HandCoins, label: "Udhar Book" },
  { to: "/app/invoices", icon: Invoice, label: "Invoices" },
  { to: "/app/contacts", icon: Users, label: "Contacts" },
  { to: "/app/staff", icon: UsersThree, label: "Staff" },
  { to: "/app/store", icon: Storefront, label: "Online Store" },
  { to: "/app/reports", icon: ChartBar, label: "Reports" },
  { to: "/app/bills", icon: FileImage, label: "Bill Records" },
  { to: "/app/market", icon: Newspaper, label: "AI News" },
  { to: "/app/settings", icon: Gear, label: "Settings" },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate("/"); };
  const initial = (user?.name || "?").charAt(0).toUpperCase();

  return (
    <div className="flex h-screen bg-[#F9FAFB]">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-[260px] bg-white border-r border-slate-200 flex-col">
        <div className="px-5 py-5 border-b border-slate-200 flex items-center gap-2.5">
          <img src="/vyaparmind-logo.png" alt="VyaparMind" className="w-10 h-10 rounded" />
          <span className="font-display font-black tracking-tighter text-xl text-slate-900">VyaparMind</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map((n) => (
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
              {n.label}
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
            Upgrade to Pro
          </NavLink>
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
            <SignOut size={16} /> Sign out
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
