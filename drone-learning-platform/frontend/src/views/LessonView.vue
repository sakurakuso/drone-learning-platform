<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useCourseStore } from '../stores/course'

const route = useRoute()
const store = useCourseStore()

const lessonId = computed(() => route.params.id)
const currentPage = ref(1)
const totalPages = computed(() => store.currentLesson?.pages?.length || 0)
const imageUrl = computed(() => {
  if (!store.currentLesson?.pages) return ''
  const page = store.currentLesson.pages.find(p => p.page_number === currentPage.value)
  return page?.image || ''
})

const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

const nextPage = () => goToPage(currentPage.value + 1)
const prevPage = () => goToPage(currentPage.value - 1)

const handleKeydown = (e) => {
  if (e.key === 'ArrowRight') nextPage()
  if (e.key === 'ArrowLeft') prevPage()
}

onMounted(async () => {
  await store.fetchLesson(lessonId.value)
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="lesson-view">
    <div v-if="store.loading" class="loading">加载中...</div>
    <div v-else-if="store.error" class="error">{{ store.error }}</div>
    <template v-else-if="store.currentLesson">
      <!-- Header -->
      <div class="lesson-header">
        <RouterLink :to="`/courses/${store.currentLesson.module}`" class="back-link">
          ← 返回模块
        </RouterLink>
        <div class="lesson-info">
          <h1 class="lesson-title">{{ store.currentLesson.title }}</h1>
          <p class="lesson-subtitle">{{ store.currentLesson.subtitle }}</p>
        </div>
      </div>

      <!-- Page Viewer -->
      <div class="page-viewer-container">
        <div class="page-viewer">
          <img v-if="imageUrl" :src="imageUrl" :alt="`第${currentPage}页`" class="page-image" />
          <div v-else class="no-page">暂无页面内容</div>
        </div>

        <!-- Controls -->
        <div class="page-controls">
          <button class="control-btn" @click="prevPage" :disabled="currentPage <= 1">
            ← 上一页
          </button>
          <div class="page-indicator">
            <input
              type="number"
              :value="currentPage"
              @change="e => goToPage(parseInt(e.target.value))"
              min="1"
              :max="totalPages"
              class="page-input"
            />
            <span>/ {{ totalPages }}</span>
          </div>
          <button class="control-btn" @click="nextPage" :disabled="currentPage >= totalPages">
            下一页 →
          </button>
        </div>
      </div>

      <!-- Thumbnail Strip (optional) -->
      <div class="thumbnail-strip" v-if="totalPages > 1">
        <div
          v-for="page in store.currentLesson.pages"
          :key="page.id"
          class="thumbnail"
          :class="{ active: page.page_number === currentPage }"
          @click="goToPage(page.page_number)"
        >
          <img :src="page.thumbnail || page.image" :alt="`第${page.page_number}页`" />
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.lesson-view {
  max-width: 1200px;
  margin: 0 auto;
}

.back-link {
  color: #667eea;
  text-decoration: none;
  font-size: 14px;
  display: inline-block;
  margin-bottom: 16px;
}

.lesson-header {
  margin-bottom: 24px;
}

.lesson-title {
  font-size: 28px;
  margin-bottom: 8px;
}

.lesson-subtitle {
  color: #666;
  font-size: 16px;
}

.page-viewer-container {
  background: #1a1a2e;
  border-radius: 12px;
  padding: 20px;
}

.page-viewer {
  min-height: 600px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.page-image {
  max-width: 100%;
  max-height: 80vh;
  object-fit: contain;
  border-radius: 8px;
}

.no-page {
  color: #666;
  font-size: 18px;
}

.page-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
}

.control-btn {
  background: #667eea;
  color: #fff;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  transition: background 0.2s;
}

.control-btn:hover:not(:disabled) {
  background: #5a71d4;
}

.control-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.page-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #fff;
  font-size: 16px;
}

.page-input {
  width: 60px;
  padding: 8px;
  border-radius: 6px;
  border: none;
  text-align: center;
  font-size: 16px;
}

.thumbnail-strip {
  display: flex;
  gap: 8px;
  margin-top: 20px;
  overflow-x: auto;
  padding: 10px 0;
}

.thumbnail {
  width: 80px;
  height: 60px;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.2s, transform 0.2s;
  flex-shrink: 0;
}

.thumbnail:hover {
  opacity: 0.9;
}

.thumbnail.active {
  opacity: 1;
  transform: scale(1.1);
  box-shadow: 0 0 0 3px #667eea;
}

.thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.loading, .error {
  text-align: center;
  padding: 60px;
  color: #666;
}
</style>
