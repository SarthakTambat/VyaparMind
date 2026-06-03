import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { api } from "lib/api";

const AuthContext = createContext(null);

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes for activity-based session expiry

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef(null);

  const clearSession = useCallback(() => {
    localStorage.removeItem("vm_user");
    localStorage.removeItem("vm_session_ts");
    setUser(null);
  }, []);

  // Reset activity timer on user interaction
  const resetTimer = useCallback(() => {
    localStorage.setItem("vm_session_ts", Date.now().toString());
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      clearSession();
    }, SESSION_TIMEOUT_MS);
  }, [clearSession]);

  // Listen for user activity to reset session timer
  useEffect(() => {
    if (!user) return;
    const events = ["mousedown", "keydown", "touchstart", "scroll"];
    const handler = () => resetTimer();
    events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
    resetTimer(); // start timer
    return () => {
      events.forEach((e) => window.removeEventListener(e, handler));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [user, resetTimer]);

  useEffect(() => {
    // Restore cached user object for instant render (non-sensitive)
    const stored = localStorage.getItem("vm_user");
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch {}
    }
    // Auth is via HttpOnly cookie — verify with server (no token in localStorage)
    api
      .get("/api/auth/me")
      .then((r) => {
        setUser(r.data);
        localStorage.setItem("vm_user", JSON.stringify(r.data));
        localStorage.setItem("vm_session_ts", Date.now().toString());
      })
      .catch(() => {
        clearSession();
      })
      .finally(() => setLoading(false));
  }, [clearSession]);

  const login = async (email, password) => {
    const res = await api.post("/api/auth/login", { email, password });
    // Token stored as HttpOnly cookie by server — never in localStorage
    localStorage.setItem("vm_user", JSON.stringify(res.data.user));
    localStorage.setItem("vm_session_ts", Date.now().toString());
    setUser(res.data.user);
    return res.data.user;
  };

  const register = async (data) => {
    const res = await api.post("/api/auth/register", data);
    // Token stored as HttpOnly cookie by server — never in localStorage
    localStorage.setItem("vm_user", JSON.stringify(res.data.user));
    localStorage.setItem("vm_session_ts", Date.now().toString());
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = useCallback(async () => {
    try { await api.post("/api/auth/logout"); } catch {}
    clearSession();
  }, [clearSession]);

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
