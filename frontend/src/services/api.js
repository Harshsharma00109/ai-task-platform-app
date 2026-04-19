import axios from 'axios';
import { useAuthStore } from '../store/auth.store';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: attach JWT
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login:    (data) => api.post('/auth/login', data),
  me:       ()     => api.get('/auth/me'),
};

// ── Tasks ─────────────────────────────────────────────────────────────────────
export const tasksApi = {
  getAll:   (params) => api.get('/tasks', { params }),
  getById:  (id)     => api.get(`/tasks/${id}`),
  create:   (data)   => api.post('/tasks', data),
  delete:   (id)     => api.delete(`/tasks/${id}`),
  retry:    (id)     => api.post(`/tasks/${id}/retry`),
  getStats: ()       => api.get('/tasks/stats'),
};

export default api;
