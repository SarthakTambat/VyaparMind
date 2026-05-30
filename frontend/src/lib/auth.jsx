import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { api } from "lib/api";

const AuthContext = createContext(null);

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef(null);

  const clearSession = useCallback(() => {
    localStorage.removeItem("vm_token");
    localStorage.removeItem("vm_user");
    localStorage.removeItem("vm_session_ts");
    setUser(null);
  }, []);

  // Check if session has expired
  const isSessionExpired = useCallback(() => {
    const ts = localStorage.getItem("vm_session_ts");
    if (!ts) return true;
    return Date.now() - parseInt(ts, 10) > SESSION_TIMEOUT_MS;
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
    const token = localStorage.getItem("vm_token");
    const stored = localStorage.getItem("vm_user");

    // If session expired, clear everything
    if (token && isSessionExpired()) {
      clearSession();
      setLoading(false);
      return;
    }

    if (token && stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {}
      // verify token is still valid on server
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
    } else {
      setLoading(false);
    }
  }, [clearSession, isSessionExpired]);

  const login = async (email, password) => {
    const res = await api.post("/api/auth/login", { email, password });
    localStorage.setItem("vm_token", res.data.access_token);
    localStorage.setItem("vm_user", JSON.stringify(res.data.user));
    localStorage.setItem("vm_session_ts", Date.now().toString());
    setUser(res.data.user);
    return res.data.user;
  };

  const register = async (data) => {
    const res = await api.post("/api/auth/register", data);
    localStorage.setItem("vm_token", res.data.access_token);
    localStorage.setItem("vm_user", JSON.stringify(res.data.user));
    localStorage.setItem("vm_session_ts", Date.now().toString());
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = useCallback(() => {
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
