<script setup>
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useCourseStore } from '../stores/course'

const store = useCourseStore()

onMounted(() => {
  store.fetchModules()
})
</script>

<template>
  <div class="courses-view">
    <h1 class="page-title">课程中心</h1>
    <p class="page-desc">选择您想学习的模块，开始您的穿越机之旅</p>

    <div v-if="store.loading" class="loading">加载中...</div>
    <div v-else-if="store.error" class="error">{{ store.error }}</div>
    <div v-else class="courses-grid">
      <RouterLink
        v-for="(module, index) in store.modules"
        :key="module.id"
        :to="`/courses/${module.id}`"
        class="course-card"
      >
        <div class="card-index">{{ index + 1 }}</div>
        <div class="card-content">
          <h2 class="card-title">{{ module.title }}</h2>
          <p class="card-subtitle">{{ module.subtitle }}</p>
          <div class="card-meta">
            <span class="meta-item">{{ module.lesson_count }} 课时</span>
          </div>
        </div>
        <div class="card-arrow">→</div>
      </RouterLink>
    </div>
  </div>
</template>

<style scoped>
.courses-view {
  max-width: 900px;
  margin: 0 auto;
}

.page-title {
  font-size: 32px;
  text-align: center;
  margin-bottom: 10px;
}

.page-desc {
  text-align: center;
  color: #666;
  margin-bottom: 40px;
}

.courses-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.course-card {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  text-decoration: none;
  color: inherit;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: transform 0.2s, box-shadow 0.2s;
}

.course-card:hover {
  transform: translateX(4px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.card-index {
  width: 50px;
  height: 50px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: bold;
  margin-right: 20px;
  flex-shrink: 0;
}

.card-content {
  flex: 1;
}

.card-title {
  font-size: 20px;
  margin-bottom: 6px;
}

.card-subtitle {
  color: #666;
  font-size: 14px;
  margin-bottom: 8px;
}

.card-meta {
  display: flex;
  gap: 16px;
}

.meta-item {
  background: #f0f4ff;
  color: #667eea;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 13px;
}

.card-arrow {
  font-size: 24px;
  color: #ccc;
  margin-left: 20px;
}

.loading, .error {
  text-align: center;
  padding: 60px;
  color: #666;
}
</style>
