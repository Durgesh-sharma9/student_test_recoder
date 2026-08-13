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
  const url = String(config.url || '');
  const shouldAttachSession = selectedSessionId && !url.startsWith('/teacher-performance');
  if (shouldAttachSession) {
    config.params = config.params || {};
    config.params.academicSession = selectedSessionId;
  }

  return config;
});

api.interceptors.response.use(
  (res) => {
    
    
    
    
    return res;
  },
  (error) => {
    
    
    
    
    
    
    
    if (error.response?.status === 401) {
      
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('selectedSessionId');
      
      // Only redirect if not on public routes
      const publicRoutes = ['/', '/login', '/parent-login', '/signup'];
      const isPublicRoute = publicRoutes.includes(window.location.pathname);
      
      if (!isPublicRoute && !window.location.pathname.includes('/login')) {
        
        window.location.href = '/login';
      } else {
        
      }
    }
    return Promise.reject(error);
  }
);

export default api;
