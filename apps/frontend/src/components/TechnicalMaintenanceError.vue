<template>
  <div class="technical-maintenance-container">
    <div class="maintenance-modal">
      <div class="maintenance-content">
        <!-- Icon -->
        <div class="maintenance-icon">🔧</div>

        <!-- Title -->
        <h2 class="maintenance-title">Ведутся технические работы</h2>

        <!-- Description -->
        <p class="maintenance-description">
          Сервис временно недоступен из-за технических работ. Пожалуйста,
          попробуйте позже.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Component displays technical maintenance error when backend returns 503
</script>

<style scoped>
.technical-maintenance-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}

.maintenance-modal {
  background: white;
  border-radius: 16px;
  padding: 40px;
  max-width: 480px;
  width: 100%;
  text-align: center;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.maintenance-icon {
  font-size: 64px;
  margin-bottom: 24px;
}

.maintenance-title {
  font-size: 24px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 16px;
}

.maintenance-description {
  font-size: 16px;
  color: #6b7280;
  line-height: 1.6;
  margin-bottom: 32px;
}

.retry-info {
  margin-bottom: 32px;
}

.retry-text {
  font-size: 14px;
  color: #9ca3af;
  margin-bottom: 16px;
}

.retry-button {
  min-width: 160px;
}

.support-info {
  border-top: 1px solid #e5e7eb;
  padding-top: 24px;
}

.support-text {
  font-size: 14px;
  color: #6b7280;
}

.support-link {
  color: #3b82f6;
  text-decoration: none;
  font-weight: 500;
}

.support-link:hover {
  text-decoration: underline;
}

@media (max-width: 640px) {
  .maintenance-modal {
    padding: 24px;
    margin: 20px;
  }

  .maintenance-icon {
    font-size: 48px;
    margin-bottom: 20px;
  }

  .maintenance-title {
    font-size: 20px;
    margin-bottom: 12px;
  }

  .maintenance-description {
    font-size: 14px;
    margin-bottom: 24px;
  }

  .retry-info {
    margin-bottom: 24px;
  }
}
</style>
