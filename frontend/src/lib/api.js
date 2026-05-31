import axios from "axios";

// In development, requests go through the React dev server proxy (package.json "proxy")
// In production, set REACT_APP_BACKEND_URL to the actual backend URL
const BASE = process.env.REACT_APP_BACKEND_URL || "";

export const api = axios.create({ baseURL: BASE });

// Inject JWT token into every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("vm_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, clear stored credentials and redirect
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && err.response.status === 401) {
      localStorage.removeItem("vm_token");
      localStorage.removeItem("vm_user");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);
