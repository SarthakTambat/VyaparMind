import axios from "axios";

const BASE = process.env.REACT_APP_BACKEND_URL || "";

export const api = axios.create({ baseURL: BASE, withCredentials: true });

// On 401, clear cached user data and redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && err.response.status === 401) {
      localStorage.removeItem("vm_user");
      localStorage.removeItem("vm_session_ts");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);
