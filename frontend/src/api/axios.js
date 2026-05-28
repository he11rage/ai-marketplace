import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = axios.create({
    baseURL: API_URL,
    // Do not set Content-Type globally; let the browser decide.
});

// Attach JWT token to outgoing requests.
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    // Do not set Content-Type for FormData; browser adds boundary automatically.
    if (!(config.data instanceof FormData)) {
        config.headers['Content-Type'] = 'application/json';
    }

    return config;
});

// Handle access-token expiration.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Retry once on 401 responses outside auth endpoints.
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Skip retry for token endpoints.
      if (originalRequest.url.includes('/auth/jwt/')) {
        return Promise.reject(error);
      }
      
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        
        if (!refreshToken) {
          // No refresh token: clear session and redirect to login.
          localStorage.removeItem('access_token');
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
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
        // Refresh failed: clear tokens and return to home.
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
          window.location.href = '/';
        }
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// API endpoint helpers.
export const apiEndpoints = {
    // Products
    getProducts: (params = {}) => api.get('/api/products/', { params }),
    getProductBrands: () => api.get('/api/products/brands/'),
    getProduct: (id) => api.get(`/api/products/${id}/`),
    createProduct: (data) => api.post('/api/products/', data),  // FormData
    updateProduct: (id, data) => api.patch(`/api/products/${id}/`, data),  // FormData
    deleteProduct: (id) => api.delete(`/api/products/${id}/`),

    // Product questions
    getProductQuestions: (id) => api.get(`/api/products/${id}/questions/`),
    createProductQuestion: (id, data) => api.post(`/api/products/${id}/questions/`, data),
    answerProductQuestion: (id, questionId, data) => api.post(`/api/products/${id}/questions/${questionId}/answer/`, data),

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
    updateCartSelected: (data) => api.post('/api/cart/update_selected/', data),
    toggleAllCart: (data) => api.post('/api/cart/toggle_all/', data),

    // Orders
    getOrders: () => api.get('/api/orders/'),
    getOrder: (id) => api.get(`/api/orders/${id}/`),
    createOrder: (data) => api.post('/api/orders/', data),
    cancelOrder: (id) => api.post(`/api/orders/${id}/cancel/`),
    payOrder: (id) => api.post(`/api/orders/${id}/pay/`),
    updateOrderDeliveryAddress: (id, data) => api.patch(`/api/orders/${id}/update_delivery_address/`, data),

    // Reviews
    getReviews: (params = {}) => api.get('/api/reviews/', { params }),
    getStoreReviewsSummary: (storeId, params = {}) => api.get(`/api/reviews/store/${storeId}/summary/`, { params }),
    createReview: (data) => api.post('/api/reviews/', data),
    deleteReview: (id) => api.delete(`/api/reviews/${id}/`),

    // Reports
    createReport: (data) => api.post('/api/reports/', data),
    getMyReports: (params = {}) => api.get('/api/reports/', { params }),

    // Auth (Djoser)
    register: (data) => api.post('/auth/users/', data),
    login: (data) => api.post('/auth/jwt/create/', data),
    refreshToken: (data) => api.post('/auth/jwt/refresh/', data),
    me: () => api.get('/auth/users/me/'),
    listUsers: (params = {}) => api.get('/auth/users/', { params }),

    // User
    updateUser: (data) => api.patch('/auth/users/me/', data),

    // Wishlist
    getWishlist: () => api.get('/api/wishlist/'),
    addToWishlist: (data) => api.post('/api/wishlist/', data),
    removeFromWishlist: (id) => api.delete(`/api/wishlist/${id}/`),

    // Moderation (admin)
    moderationListProducts: (params = {}) => api.get('/api/moderation/products/', { params }),
    moderationSetProductStatus: (id, data) => api.post(`/api/moderation/products/${id}/set_status/`, data),

    moderationListStores: (params = {}) => api.get('/api/moderation/stores/', { params }),
    moderationPatchStore: (id, data) => api.patch(`/api/moderation/stores/${id}/`, data),
    moderationSetStoreStatus: (id, data) => api.post(`/api/moderation/stores/${id}/set_status/`, data),

    moderationListReports: (params = {}) => api.get('/api/moderation/reports/', { params }),
    moderationResolveReport: (id, data) => api.post(`/api/moderation/reports/${id}/resolve/`, data),
    moderationRejectReport: (id, data) => api.post(`/api/moderation/reports/${id}/reject/`, data),

    moderationListUsers: (params = {}) => api.get('/api/moderation/users/', { params }),
    moderationPatchUser: (id, data) => api.patch(`/api/moderation/users/${id}/`, data),

    moderationListOrders: (params = {}) => api.get('/api/moderation/orders/', { params }),
    moderationSetOrderStatus: (id, data) => api.post(`/api/moderation/orders/${id}/set_status/`, data),

    moderationListAudit: (params = {}) => api.get('/api/moderation/audit/', { params }),
    moderationListAIHistory: (params = {}) => api.get('/api/moderation/ai-history/', { params }),
};

export default api;