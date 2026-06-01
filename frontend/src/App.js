import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "lib/auth";
import { LanguageProvider } from "lib/i18n";
import { SonnerToaster } from "components/ui/sonner";
import LoadingSplash from "components/LoadingSplash";
import "./App.css";

import Landing from "pages/Landing";
import Login from "pages/Login";
import Register from "pages/Register";
import DashboardLayout from "pages/DashboardLayout";
import Dashboard from "pages/Dashboard";
import ChatPage from "pages/ChatPage";
import Transactions from "pages/Transactions";
import Inventory from "pages/Inventory";
import Contacts from "pages/Contacts";
import Insights from "pages/Insights";
import Automations from "pages/Automations";
import AINews from "pages/AINews";
import BillRecords from "pages/BillRecords";
import UdharBook from "pages/UdharBook";
import Invoices from "pages/Invoices";
import StaffManagement from "pages/StaffManagement";
import Reports from "pages/Reports";
import OnlineStore from "pages/OnlineStore";
import Payment from "pages/Payment";
import Upgrade from "pages/Upgrade";
import Settings from "pages/Settings";
import Demo from "pages/Demo";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSplash message="Loading your business..." />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSplash message="Loading..." />;
  if (user) return <Navigate to="/app" replace />;
  return children;
}

function App() {
  return (
    <LanguageProvider>
    <AuthProvider>
      <BrowserRouter>
        <SonnerToaster />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <Login />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicOnlyRoute>
                <Register />
              </PublicOnlyRoute>
            }
          />
          <Route path="/payment" element={<Payment />} />
          <Route path="/demo" element={<Demo />} />
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="chat" element={<ChatPage />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="contacts" element={<Contacts />} />
            <Route path="insights" element={<Insights />} />
            <Route path="automations" element={<Automations />} />
            <Route path="market" element={<AINews />} />
            <Route path="bills" element={<BillRecords />} />
            <Route path="udhar" element={<UdharBook />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="staff" element={<StaffManagement />} />
            <Route path="reports" element={<Reports />} />
            <Route path="store" element={<OnlineStore />} />
            <Route path="upgrade" element={<Upgrade />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
