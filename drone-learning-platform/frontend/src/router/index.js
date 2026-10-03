import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/HomeView.vue')
  },
  {
    path: '/courses',
    name: 'Courses',
    component: () => import('../views/CoursesView.vue')
  },
  {
    path: '/courses/:moduleId',
    name: 'ModuleDetail',
    component: () => import('../views/ModuleDetailView.vue')
  },
  {
    path: '/lesson/:id',
    name: 'Lesson',
    component: () => import('../views/LessonView.vue')
  },
  {
    path: '/progress',
    name: 'Progress',
    component: () => import('../views/ProgressView.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
