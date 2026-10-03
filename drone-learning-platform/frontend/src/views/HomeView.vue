<script setup>
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useCourseStore } from '../stores/course'

const store = useCourseStore()
const stats = ref({
  totalModules: 5,
  totalLessons: 20,
  totalPages: 227
})

onMounted(() => {
  store.fetchModules()
})
</script>

<template>
  <div class="home-view">
    <!-- Banner -->
    <section class="banner">
      <div class="banner-content">
        <h1 class="banner-title">穿越机（FPV）系统课程</h1>
        <p class="banner-subtitle">从零开始学习穿越机组装、操作与维修</p>
        <div class="banner-stats">
          <div class="stat-item">
            <span class="stat-number">{{ stats.totalModules }}</span>
            <span class="stat-label">课程模块</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">{{ stats.totalLessons }}</span>
            <span class="stat-label">精品课时</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">{{ stats.totalPages }}</span>
            <span class="stat-label">教学内容</span>
          </div>
        </div>
        <RouterLink to="/courses" class="banner-btn">开始学习</RouterLink>
      </div>
    </section>

    <!-- Course Modules -->
    <section class="modules-section">
      <h2 class="section-title">课程体系</h2>
      <div v-if="store.loading" class="loading">加载中...</div>
      <div v-else-if="store.error" class="error">{{ store.error }}</div>
      <div v-else class="modules-grid">
        <div v-for="module in store.modules" :key="module.id" class="module-card">
          <div class="module-icon">📚</div>
          <h3 class="module-title">{{ module.title }}</h3>
          <p class="module-subtitle">{{ module.subtitle }}</p>
          <div class="module-info">
            <span class="lesson-count">{{ module.lesson_count }} 课时</span>
          </div>
          <RouterLink :to="`/courses/${module.id}`" class="module-btn">进入学习</RouterLink>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section class="features-section">
      <h2 class="section-title">平台特色</h2>
      <div class="features-grid">
        <div class="feature-card">
          <div class="feature-icon">🛠️</div>
          <h3>组装教学</h3>
          <p>详细的穿越机组装教程，从零件认知到整机调试</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">🎮</div>
          <h3>操作训练</h3>
          <p>模拟器训练与真机飞行指导，循序渐进</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">🔧</div>
          <h3>维修维护</h3>
          <p>常见故障诊断与维修技巧，延长飞行器寿命</p>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home-view {
  padding-bottom: 40px;
}

/* Banner */
.banner {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  padding: 60px 40px;
  margin-bottom: 50px;
  color: #fff;
  text-align: center;
}

.banner-title {
  font-size: 42px;
  font-weight: bold;
  margin-bottom: 16px;
}

.banner-subtitle {
  font-size: 20px;
  opacity: 0.9;
  margin-bottom: 30px;
}

.banner-stats {
  display: flex;
  justify-content: center;
  gap: 50px;
  margin-bottom: 30px;
}

.stat-item {
  display: flex;
  flex-direction: column;
}

.stat-number {
  font-size: 36px;
  font-weight: bold;
}

.stat-label {
  font-size: 14px;
  opacity: 0.8;
}

.banner-btn {
  display: inline-block;
  background: #fff;
  color: #667eea;
  padding: 14px 40px;
  border-radius: 30px;
  font-weight: bold;
  text-decoration: none;
  transition: transform 0.3s, box-shadow 0.3s;
}

.banner-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
}

/* Section */
.section-title {
  font-size: 28px;
  margin-bottom: 30px;
  text-align: center;
}

/* Modules */
.modules-section {
  margin-bottom: 50px;
}

.modules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
}

.module-card {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transition: transform 0.3s, box-shadow 0.3s;
}

.module-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.module-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.module-title {
  font-size: 20px;
  margin-bottom: 8px;
}

.module-subtitle {
  color: #666;
  font-size: 14px;
  margin-bottom: 16px;
}

.module-info {
  margin-bottom: 16px;
}

.lesson-count {
  background: #f0f4ff;
  color: #667eea;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 13px;
}

.module-btn {
  display: block;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  text-align: center;
  padding: 12px;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 500;
}

/* Features */
.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
}

.feature-card {
  background: #fff;
  border-radius: 12px;
  padding: 30px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.feature-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.feature-card h3 {
  font-size: 20px;
  margin-bottom: 12px;
}

.feature-card p {
  color: #666;
  line-height: 1.6;
}

.loading, .error {
  text-align: center;
  padding: 40px;
  color: #666;
}
</style>
