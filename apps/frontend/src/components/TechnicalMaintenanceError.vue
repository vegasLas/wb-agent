<template>
  <div class="technical-maintenance-container">
    <Card class="maintenance-card">
      <template #content>
        <div class="maintenance-content">
          <!-- Icon -->
          <div class="maintenance-icon">
            <i class="pi pi-cog text-6xl text-blue-500 dark:text-blue-400" />
          </div>

          <!-- Title -->
          <h2 class="maintenance-title">Ведутся технические работы</h2>

          <!-- Description -->
          <p class="maintenance-description">
            Сервис временно недоступен из-за технических работ. Пожалуйста,
            попробуйте позже.
          </p>
        </div>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import Card from 'primevue/card';
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

.maintenance-card {
  max-width: 480px;
  width: 100%;
  text-align: center;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.maintenance-content {
  padding: 24px;
}

.maintenance-icon {
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
}

@media (max-width: 640px) {
  .maintenance-content {
    padding: 16px;
  }

  .maintenance-icon {
    margin-bottom: 20px;
  }

  .maintenance-icon i {
    font-size: 48px;
  }

  .maintenance-title {
    font-size: 20px;
    margin-bottom: 12px;
  }

  .maintenance-description {
    font-size: 14px;
  }
}
</style>
