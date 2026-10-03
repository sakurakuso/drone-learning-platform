import axios from 'axios'

const API_BASE = 'http://localhost:8000/api'

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
})

// Courses API
export const coursesApi = {
  getModules: () => api.get('/courses/modules/'),
  getModule: (id) => api.get(`/courses/modules/${id}/`),
  getLessons: (moduleId) => api.get(`/courses/lessons/by_module/?module_id=${moduleId}`),
  getLesson: (id) => api.get(`/courses/lessons/${id}/`),
  getLessonPages: (id) => api.get(`/courses/lessons/${id}/pages/`),
  getLessonSections: (id) => api.get(`/courses/lessons/${id}/sections/`),
}

// Progress API
export const progressApi = {
  getProgress: () => api.get('/users/progress/'),
  getLessonProgress: (lessonId) => api.get(`/users/progress/by_lesson/?lesson_id=${lessonId}`),
  updateProgress: (data) => api.post('/users/progress/update_progress/', data),
  getSummary: () => api.get('/users/progress/summary/'),
}

export default api
