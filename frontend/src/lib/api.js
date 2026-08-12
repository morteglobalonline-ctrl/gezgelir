import axios from "axios";

const BASE = process.env.REACT_APP_BACKEND_URL;
const TOKEN_KEY = "gg_token";

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export const api = axios.create({ baseURL: `${BASE}/api`, timeout: 15000 });

api.interceptors.request.use((config) => {
  const t = tokenStore.get();
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

export function formatApiError(detail) {
  if (detail == null) return "Bir şeyler ters gitti. Lütfen tekrar deneyin.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export const endpoints = {
  // auth
  register: (payload) => api.post("/auth/register", payload).then((r) => r.data),
  login: (email, password) => api.post("/auth/login", { email, password }).then((r) => r.data),
  authMe: () => api.get("/auth/me").then((r) => r.data),
  // data
  config: () => api.get("/config").then((r) => r.data),
  me: () => api.get("/driver/me").then((r) => r.data),
  trips: (range = "month") => api.get("/trips", { params: { range } }).then((r) => r.data),
  tripDetail: (id) => api.get(`/trips/${id}`).then((r) => r.data),
  earnings: (range = "month") => api.get("/earnings/summary", { params: { range } }).then((r) => r.data),
  series: (range = "week") => api.get("/earnings/series", { params: { range } }).then((r) => r.data),
  gamification: () => api.get("/gamification").then((r) => r.data),
  wallet: () => api.get("/wallet").then((r) => r.data),
  transactions: () => api.get("/wallet/transactions").then((r) => r.data),
  withdraw: (amount, bank_account_id) =>
    api.post("/wallet/withdraw", { amount, bank_account_id }).then((r) => r.data),
  driveStop: (payload) => api.post("/drive/stop", payload).then((r) => r.data),
  // bank accounts
  banks: () => api.get("/bank-accounts").then((r) => r.data),
  addBank: (payload) => api.post("/bank-accounts", payload).then((r) => r.data),
  editBank: (id, payload) => api.put(`/bank-accounts/${id}`, payload).then((r) => r.data),
  setDefaultBank: (id) => api.post(`/bank-accounts/${id}/default`).then((r) => r.data),
  deleteBank: (id) => api.delete(`/bank-accounts/${id}`).then((r) => r.data),
  // documents
  documents: () => api.get("/documents").then((r) => r.data),
  uploadDocument: (type, file) => {
    const fd = new FormData();
    fd.append("type", type);
    fd.append("file", file);
    return api.post("/documents/upload", fd).then((r) => r.data);
  },
  deleteDocument: (id) => api.delete(`/documents/${id}`).then((r) => r.data),
  // notifications
  notifications: () => api.get("/notifications").then((r) => r.data),
  readAllNotifications: () => api.post("/notifications/read-all").then((r) => r.data),
  readNotification: (id) => api.post(`/notifications/${id}/read`).then((r) => r.data),
  // push
  pushKey: () => api.get("/push/public-key").then((r) => r.data),
  pushSubscribe: (sub) => api.post("/push/subscribe", sub).then((r) => r.data),
  pushUnsubscribe: (endpoint) => api.post("/push/unsubscribe", { endpoint }).then((r) => r.data),
  pushTest: () => api.post("/push/test").then((r) => r.data),
};

export const fileSrc = (path) => `${BASE}/api/files/${path}?auth=${tokenStore.get()}`;
export const docFileSrc = (id) => `${BASE}/api/documents/${id}/file?auth=${tokenStore.get()}`;
