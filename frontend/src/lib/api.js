import axios from "axios";

const BASE = process.env.REACT_APP_BACKEND_URL || "";

export const api = axios.create({ baseURL: BASE, withCredentials: true });

// On 401, clear cached user data and redirect to login — but only when a
// protected action fails mid-session, not on the startup auth check.
// A 401 from /api/auth/me just means "not logged in yet" (normal on public pages).
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && err.response.status === 401) {
      localStorage.removeItem("vm_user");
      localStorage.removeItem("vm_session_ts");
      const isStartupCheck = (err.config?.url || "").includes("/auth/me");
      const onPublicPage =
        window.location.pathname === "/" ||
        window.location.pathname.startsWith("/login") ||
        window.location.pathname.startsWith("/register") ||
        window.location.pathname.startsWith("/payment") ||
        window.location.pathname.startsWith("/demo") ||
        window.location.pathname.startsWith("/services");
      if (!isStartupCheck && !onPublicPage) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);
