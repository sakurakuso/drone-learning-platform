<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <header class="app-header">
    <div class="header-content">
      <div class="logo">
        <RouterLink to="/">
          <span class="logo-icon">🚁</span>
          <span class="logo-text">穿越机教育平台</span>
        </RouterLink>
      </div>
      <nav class="nav-menu">
        <RouterLink to="/" class="nav-link">首页</RouterLink>
        <RouterLink to="/courses" class="nav-link">课程中心</RouterLink>
        <RouterLink to="/progress" class="nav-link">学习进度</RouterLink>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
}

.logo a {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
}

.logo-icon {
  font-size: 28px;
}

.logo-text {
  font-size: 20px;
  font-weight: bold;
  color: #fff;
}

.nav-menu {
  display: flex;
  gap: 30px;
}

.nav-link {
  color: #a0a0a0;
  text-decoration: none;
  font-size: 16px;
  transition: color 0.3s;
}

.nav-link:hover,
.nav-link.router-link-active {
  color: #00d4ff;
}
</style>
