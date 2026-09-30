import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Wallets ─────────────────────────────────────────────────
export const getWallets       = ()       => api.get('/wallets');
export const getTotalBalance  = ()       => api.get('/wallets/total');
export const createWallet     = (data)   => api.post('/wallets', data);
export const updateWallet     = (id, d)  => api.put(`/wallets/${id}`, d);
export const deleteWallet     = (id)     => api.delete(`/wallets/${id}`);

// ── Categories ───────────────────────────────────────────────
export const getCategories    = (type)   => api.get('/categories', { params: { type } });

// ── Transactions ─────────────────────────────────────────────
export const getSummary       = (m, y)   => api.get('/transactions/summary', { params: { month: m, year: y } });
export const getTransactions  = (params) => api.get('/transactions', { params });
export const createTransaction = (data)  => api.post('/transactions', data);
export const updateTransaction = (id, d) => api.put(`/transactions/${id}`, d);
export const deleteTransaction = (id)    => api.delete(`/transactions/${id}`);

export default api;
