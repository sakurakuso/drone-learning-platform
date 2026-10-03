<script setup>
import { onMounted, computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useCourseStore } from '../stores/course'

const route = useRoute()
const store = useCourseStore()

const moduleId = computed(() => route.params.moduleId)

const difficultyLabels = {
  beginner: '初级',
  intermediate: '中级',
  advanced: '高级'
}

const difficultyColors = {
  beginner: '#52c41a',
  intermediate: '#faad14',
  advanced: '#f5222d'
}

onMounted(() => {
  store.fetchModule(moduleId.value)
})
</script>

<template>
  <div class="module-detail-view">
    <div v-if="store.loading" class="loading">加载中...</div>
    <div v-else-if="store.error" class="error">{{ store.error }}</div>
    <template v-else-if="store.currentModule">
      <div class="module-header">
        <RouterLink to="/courses" class="back-link">← 返回课程中心</RouterLink>
        <h1 class="module-title">{{ store.currentModule.title }}</h1>
        <p class="module-subtitle">{{ store.currentModule.subtitle }}</p>
      </div>

      <div class="lessons-section">
        <h2 class="section-title">课时列表</h2>
        <div class="lessons-list">
          <RouterLink
            v-for="lesson in store.currentModule.lessons"
            :key="lesson.id"
            :to="`/lesson/${lesson.id}`"
            class="lesson-item"
          >
            <div class="lesson-number">{{ lesson.number }}</div>
            <div class="lesson-info">
              <h3 class="lesson-title">{{ lesson.title }}</h3>
              <p class="lesson-subtitle">{{ lesson.subtitle }}</p>
              <div class="lesson-meta">
                <span
                  class="difficulty-tag"
                  :style="{ background: difficultyColors[lesson.difficulty] }"
                >
                  {{ difficultyLabels[lesson.difficulty] }}
                </span>
                <span class="duration">{{ lesson.duration_minutes }} 分钟</span>
                <span class="pages">{{ lesson.total_pages }} 页</span>
              </div>
            </div>
            <div class="lesson-arrow">→</div>
          </RouterLink>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.module-detail-view {
  max-width: 900px;
  margin: 0 auto;
}

.back-link {
  color: #667eea;
  text-decoration: none;
  font-size: 14px;
  display: inline-block;
  margin-bottom: 16px;
}

.module-header {
  margin-bottom: 40px;
}

.module-title {
  font-size: 32px;
  margin-bottom: 10px;
}

.module-subtitle {
  color: #666;
  font-size: 16px;
}

.section-title {
  font-size: 22px;
  margin-bottom: 20px;
}

.lessons-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.lesson-item {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 10px;
  padding: 20px;
  text-decoration: none;
  color: inherit;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: transform 0.2s, box-shadow 0.2s;
}

.lesson-item:hover {
  transform: translateX(4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.lesson-number {
  width: 44px;
  height: 44px;
  background: #f0f4ff;
  color: #667eea;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: bold;
  margin-right: 16px;
  flex-shrink: 0;
}

.lesson-info {
  flex: 1;
}

.lesson-title {
  font-size: 18px;
  margin-bottom: 4px;
}

.lesson-subtitle {
  color: #888;
  font-size: 14px;
  margin-bottom: 8px;
}

.lesson-meta {
  display: flex;
  gap: 12px;
  align-items: center;
}

.difficulty-tag {
  color: #fff;
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 12px;
}

.duration, .pages {
  color: #999;
  font-size: 13px;
}

.lesson-arrow {
  font-size: 20px;
  color: #ccc;
  margin-left: 16px;
}

.loading, .error {
  text-align: center;
  padding: 60px;
  color: #666;
}
</style>
