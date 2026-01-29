import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  addBalance: (amount) => api.post('/auth/add-balance', { amount }),
};

// Documents API
export const documentsAPI = {
  getAll: () => api.get('/documents'),
  getMy: () => api.get('/documents/my'),
  getById: (id) => api.get(`/documents/${id}`),
  create: (data) => api.post('/documents', data),
  update: (id, data) => api.put(`/documents/${id}`, data),
  delete: (id) => api.delete(`/documents/${id}`),
  purchase: (id) => api.post(`/documents/${id}/purchase`),
};

// Bookshelf API
export const bookshelfAPI = {
  getAll: () => api.get('/bookshelf'),
  add: (documentId) => api.post('/bookshelf', { documentId }),
  remove: (documentId) => api.delete(`/bookshelf/${documentId}`),
  // 阅读进度 API
  getProgress: (documentId) => api.get(`/bookshelf/progress/${documentId}`),
  updateProgress: (documentId, data) => api.put(`/bookshelf/progress/${documentId}`, data),
};

// AI API
export const aiAPI = {
  ask: (question, documentContent) =>
    api.post('/ai/ask', { question, documentContent }),
};

// Notes API
export const notesAPI = {
  getByDocument: (documentId) => api.get(`/notes/document/${documentId}`),
  create: (data) => api.post('/notes', data),
  update: (id, content) => api.put(`/notes/${id}`, { content }),
  delete: (id) => api.delete(`/notes/${id}`),
};

// Upload API
export const uploadAPI = {
  parseFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload/parse', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 120000, // 2分钟超时，大文件解析可能需要较长时间
    });
  },
};

// Public API (no auth required)
export const publicAPI = {
  getPopular: () => api.get('/public/popular'),
  getTrending: () => api.get('/public/trending'),
  getNew: () => api.get('/public/new'),
  search: (query) => api.get('/public/search', { params: { q: query } }),
};

// Twitter API
export const twitterAPI = {
  fetch: (url) => api.get('/twitter/fetch', { params: { url } }),
};

// Translation API
export const translateAPI = {
  translate: (text, targetLang = 'zh') => api.post('/translate', { text, targetLang }),
  charge: (documentId) => api.post('/translate/charge', { documentId }),
  checkPurchase: (documentId) => api.get(`/translate/check/${documentId}`),
  getContent: (documentId) => api.get(`/translate/content/${documentId}`),
};

// Voice API
export const voiceAPI = {
  clone: (audioFile) => {
    const formData = new FormData();
    formData.append('audio', audioFile);
    return api.post('/voice/clone', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  synthesize: (text, voiceId) => api.post('/voice/synthesize', { text, voiceId }),
  getMy: () => api.get('/voice/my'),
  delete: () => api.delete('/voice/my'),
};

export default api;
