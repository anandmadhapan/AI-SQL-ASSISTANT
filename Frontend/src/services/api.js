/**
 * Axios API Client — Task 2: AI SQL Assistant
 * Proxied via Vite: /api → http://localhost:8001
 */
import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
})

// ─── Datasets ────────────────────────────────────────────────────────────────
export const datasetsAPI = {
  upload:  (formData) => api.post('/datasets/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  list:    (params)   => api.get('/datasets', { params }),
  get:     (id)       => api.get(`/datasets/${id}`),
  preview: (id, params) => api.get(`/datasets/${id}/preview`, { params }),
  delete:  (id)       => api.delete(`/datasets/${id}`),
}

// ─── Query ────────────────────────────────────────────────────────────────────
export const queryAPI = {
  ask:          (datasetId, data) => api.post(`/query/${datasetId}/query`, data),
  history:      (params)          => api.get('/query/history', { params }),
  clearHistory: (datasetId)       => api.delete('/query/history',
    datasetId ? { params: { dataset_id: datasetId } } : {}),
}

export default api
