import axios from "axios";

const BASE = process.env.REACT_APP_BACKEND_URL;

export const api = axios.create({
  baseURL: `${BASE}/api`,
  timeout: 15000,
});

export const endpoints = {
  config: () => api.get("/config").then((r) => r.data),
  me: () => api.get("/driver/me").then((r) => r.data),
  trips: (range = "month") => api.get("/trips", { params: { range } }).then((r) => r.data),
  tripDetail: (id) => api.get(`/trips/${id}`).then((r) => r.data),
  earnings: (range = "month") =>
    api.get("/earnings/summary", { params: { range } }).then((r) => r.data),
  series: (range = "week") =>
    api.get("/earnings/series", { params: { range } }).then((r) => r.data),
  wallet: () => api.get("/wallet").then((r) => r.data),
  transactions: () => api.get("/wallet/transactions").then((r) => r.data),
  withdraw: (amount, iban) =>
    api.post("/wallet/withdraw", { amount, iban }).then((r) => r.data),
  driveStop: (payload) => api.post("/drive/stop", payload).then((r) => r.data),
};
