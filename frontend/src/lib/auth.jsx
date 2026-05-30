import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("vm_token");
    const stored = localStorage.getItem("vm_user");
    if (token && stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {}
      // verify
      api
        .get("/api/auth/me")
        .then((r) => {
          setUser(r.data);
          localStorage.setItem("vm_user", JSON.stringify(r.data));
        })
        .catch(() => {
          setUser(null);
          localStorage.removeItem("vm_token");
          localStorage.removeItem("vm_user");
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await api.post("/api/auth/login", { email, password });
    localStorage.setItem("vm_token", res.data.access_token);
    localStorage.setItem("vm_user", JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  };

  const register = async (data) => {
    const res = await api.post("/api/auth/register", data);
    localStorage.setItem("vm_token", res.data.access_token);
    localStorage.setItem("vm_user", JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = () => {
    localStorage.removeItem("vm_token");
    localStorage.removeItem("vm_user");
    setUser(null);
  };

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
