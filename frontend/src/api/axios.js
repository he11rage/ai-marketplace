import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = axios.create({
    baseURL: API_URL,
    // НЕ устанавливаем Content-Type по умолчанию - пусть браузер сам решает
});

// Добавляем JWT токен к запросам
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    // Для FormData НЕ устанавливаем Content-Type - браузер сам установит с boundary
    if (!(config.data instanceof FormData)) {
        config.headers['Content-Type'] = 'application/json';
    }

    return config;
});

// Обработка истечения токена
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // 🔴 Если 401 и мы ещё не на странице авторизации
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Проверяем что мы не пытаемся получить токен
      if (originalRequest.url.includes('/auth/jwt/')) {
        return Promise.reject(error);
      }
      
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        
        if (!refreshToken) {
          // 🔴 Если нет refresh токена — просто удаляем access и перенаправляем
          localStorage.removeItem('access_token');
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';  // 👈 Перенаправляем на фронтенд /auth
          }
          return Promise.reject(error);
        }
        
        const response = await axios.post(`${API_URL}/auth/jwt/refresh/`, {
          refresh: refreshToken,
        });
        
        const { access } = response.data;
        localStorage.setItem('access_token', access);
        
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);
      } catch (refreshError) {
        // 🔴 Если refresh не удался — чистим токены и на главную
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
          window.location.href = '/';  // 👈 На главную, а не на /auth
        }
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// Экспортируем функции для взаимодействия с API
export const apiEndpoints = {
    // Products
    getProducts: () => api.get('/api/products/'),
    getProduct: (id) => api.get(`/api/products/${id}/`),
    createProduct: (data) => api.post('/api/products/', data),  // FormData
    updateProduct: (id, data) => api.patch(`/api/products/${id}/`, data),  // FormData
    deleteProduct: (id) => api.delete(`/api/products/${id}/`),

    // Stores
    getStores: () => api.get('/api/stores/'),
    getMyStores: () => api.get('/api/stores/my_stores/'),
    getStore: (id) => api.get(`/api/stores/${id}/`),
    createStore: (data) => api.post('/api/stores/', data),
    updateStore: (id, data) => api.patch(`/api/stores/${id}/`, data),
    deleteStore: (id) => api.delete(`/api/stores/${id}/`),

    // Categories
    getCategories: () => api.get('/api/categories/'),

    // Cart
    getCart: () => api.get('/api/cart/'),
    addToCart: (data) => api.post('/api/cart/', data),
    updateCartItem: (id, data) => api.patch(`/api/cart/${id}/`, data),
    removeFromCart: (id) => api.delete(`/api/cart/${id}/`),

    // Orders
    getOrders: () => api.get('/api/orders/'),
    createOrder: (data) => api.post('/api/orders/', data),

    // Auth (Djoser)
    register: (data) => api.post('/auth/users/', data),
    login: (data) => api.post('/auth/jwt/create/', data),
    refreshToken: (data) => api.post('/auth/jwt/refresh/', data),
    me: () => api.get('/auth/users/me/'),

    // User
    updateUser: (data) => api.patch('/auth/users/me/', data),

    // Wishlist
    getWishlist: () => api.get('/api/wishlist/'),
    addToWishlist: (data) => api.post('/api/wishlist/', data),
    removeFromWishlist: (id) => api.delete(`/api/wishlist/${id}/`),
};

export default api;