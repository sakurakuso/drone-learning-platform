<script setup>
import { ref, onMounted } from 'vue'

// Placeholder - progress API requires authentication
const progressData = ref({
  totalLessons: 20,
  completedLessons: 0,
  percentage: 0
})

const completedLessons = ref([])
</script>

<template>
  <div class="progress-view">
    <h1 class="page-title">我的学习进度</h1>

    <!-- Progress Overview -->
    <div class="progress-overview">
      <div class="progress-circle">
        <svg viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" class="bg-circle" />
          <circle
            cx="50"
            cy="50"
            r="45"
            class="progress-ring"
            :style="{ strokeDasharray: `${progressData.percentage * 2.83} 283` }"
          />
        </svg>
        <div class="progress-text">
          <span class="percentage">{{ progressData.percentage }}%</span>
          <span class="label">完成度</span>
        </div>
      </div>
      <div class="progress-stats">
        <div class="stat-item">
          <span class="stat-value">{{ progressData.completedLessons }}</span>
          <span class="stat-label">已完成课时</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ progressData.totalLessons - progressData.completedLessons }}</span>
          <span class="stat-label">待学习课时</span>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div class="empty-state">
      <div class="empty-icon">📚</div>
      <h3>暂无学习记录</h3>
      <p>开始学习后可在此查看您的进度</p>
      <router-link to="/courses" class="start-btn">前往学习</router-link>
    </div>
  </div>
</template>

<style scoped>
.progress-view {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px 0;
}

.page-title {
  font-size: 28px;
  text-align: center;
  margin-bottom: 40px;
}

.progress-overview {
  display: flex;
  align-items: center;
  gap: 50px;
  background: #fff;
  border-radius: 16px;
  padding: 40px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  margin-bottom: 30px;
}

.progress-circle {
  position: relative;
  width: 160px;
  height: 160px;
  flex-shrink: 0;
}

.progress-circle svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.bg-circle {
  fill: none;
  stroke: #f0f4ff;
  stroke-width: 10;
}

.progress-ring {
  fill: none;
  stroke: #667eea;
  stroke-width: 10;
  stroke-linecap: round;
  transition: stroke-dasharray 0.5s ease;
}

.progress-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.percentage {
  display: block;
  font-size: 32px;
  font-weight: bold;
  color: #667eea;
}

.label {
  font-size: 14px;
  color: #999;
}

.progress-stats {
  display: flex;
  gap: 40px;
}

.stat-item {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 36px;
  font-weight: bold;
  color: #333;
}

.stat-label {
  font-size: 14px;
  color: #999;
}

.empty-state {
  text-align: center;
  padding: 60px 40px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.empty-state h3 {
  font-size: 22px;
  margin-bottom: 10px;
}

.empty-state p {
  color: #666;
  margin-bottom: 24px;
}

.start-btn {
  display: inline-block;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  padding: 14px 36px;
  border-radius: 25px;
  text-decoration: none;
  font-weight: 500;
}
</style>
