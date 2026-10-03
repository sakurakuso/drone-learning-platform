import { defineStore } from 'pinia'
import { ref } from 'vue'
import { coursesApi } from '../api'

export const useCourseStore = defineStore('course', () => {
  const modules = ref([])
  const currentModule = ref(null)
  const currentLesson = ref(null)
  const loading = ref(false)
  const error = ref(null)

  async function fetchModules() {
    loading.value = true
    error.value = null
    try {
      const res = await coursesApi.getModules()
      modules.value = res.data
    } catch (e) {
      error.value = '获取课程模块失败'
      console.error(e)
    } finally {
      loading.value = false
    }
  }

  async function fetchModule(id) {
    loading.value = true
    error.value = null
    try {
      const res = await coursesApi.getModule(id)
      currentModule.value = res.data
      return res.data
    } catch (e) {
      error.value = '获取模块详情失败'
      console.error(e)
    } finally {
      loading.value = false
    }
  }

  async function fetchLesson(id) {
    loading.value = true
    error.value = null
    try {
      const res = await coursesApi.getLesson(id)
      currentLesson.value = res.data
      return res.data
    } catch (e) {
      error.value = '获取课时详情失败'
      console.error(e)
    } finally {
      loading.value = false
    }
  }

  return {
    modules,
    currentModule,
    currentLesson,
    loading,
    error,
    fetchModules,
    fetchModule,
    fetchLesson
  }
})
