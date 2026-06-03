import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Add selected session ID to params if available
  const selectedSessionId = localStorage.getItem('selectedSessionId');
  if (selectedSessionId) {
    config.params = config.params || {};
    config.params.academicSession = selectedSessionId;
  }

  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    console.log('[API Interceptor] Error received');
    console.log('[API Interceptor] Status:', error.response?.status);
    console.log('[API Interceptor] URL:', error.config?.url);
    console.log('[API Interceptor] Method:', error.config?.method);
    console.log('[API Interceptor] Current path:', window.location.pathname);
    
    if (error.response?.status === 401) {
      console.log('[API Interceptor] 401 detected, clearing storage and redirecting');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('selectedSessionId');
      
      // Only redirect if not on public routes
      const publicRoutes = ['/', '/login', '/parent-login', '/signup'];
      const isPublicRoute = publicRoutes.includes(window.location.pathname);
      
      if (!isPublicRoute && !window.location.pathname.includes('/login')) {
        console.log('[API Interceptor] Redirecting to /login');
        window.location.href = '/login';
      } else {
        console.log('[API Interceptor] On public route, not redirecting');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
