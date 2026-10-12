import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  try {
    const session = JSON.parse(localStorage.getItem('bloodbridge_session') || 'null');
    if (session?.token) config.headers.Authorization = `Bearer ${session.token}`;
  } catch {
    localStorage.removeItem('bloodbridge_session');
  }
  return config;
});

export function getApiError(error) {
  if (error?.code === 'ECONNABORTED') return 'The server took too long to respond. Try again.';
  if (!error?.response) return 'Cannot reach the API. Confirm the backend is running at http://localhost:5000.';
  return error.response.data?.message || 'Something went wrong. Please try again.';
}

export default api;
