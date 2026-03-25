<template>
  <div class="api-key-component space-y-4">
    <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
      <h3 class="font-medium mb-2">API ключ поставщика</h3>

      <!-- Status -->
      <div v-if="apiKeyStatus" class="mb-4">
        <div
          :class="[
            'inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm',
            apiKeyStatus.valid
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          ]"
        >
          <CheckCircleIcon v-if="apiKeyStatus.valid" class="w-4 h-4" />
          <XCircleIcon v-else class="w-4 h-4" />
          {{ apiKeyStatus.valid ? 'Ключ действителен' : 'Ошибка ключа' }}
        </div>
        <p v-if="apiKeyStatus.message" class="text-sm text-gray-500 mt-1">
          {{ apiKeyStatus.message }}
        </p>
      </div>

      <!-- Current Key Display -->
      <div v-if="userStore.user.supplierApiKey && !showEditForm" class="space-y-3">
        <div
          class="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded-lg"
        >
          <div class="flex-1">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-green-600 dark:text-green-400">
                  ✓ API ключ успешно сохранен
                </p>
                <p class="text-xs text-gray-500 mt-1">
                  Обновлен: {{ formatDate(new Date()) }}
                </p>
              </div>
              <div class="flex items-center gap-2">
                <BaseButton
                  color="red"
                  variant="outline"
                  size="sm"
                  square
                  :loading="apiKeyStore.loading"
                  @click="handleDelete"
                  title="Удалить API ключ"
                >
                  <TrashIcon class="w-4 h-4" />
                </BaseButton>

                <BaseButton
                  color="primary"
                  variant="outline"
                  size="sm"
                  square
                  @click="showEditForm = true"
                  title="Изменить API ключ"
                >
                  <PencilIcon class="w-4 h-4" />
                </BaseButton>
              </div>
            </div>
          </div>
          <div class="flex items-center ml-3">
            <ShieldCheckIcon class="w-6 h-6 text-green-500" />
          </div>
        </div>
      </div>

      <!-- Input -->
      <div v-if="!userStore.user.supplierApiKey || showEditForm" class="space-y-2">
        <label class="block text-sm font-medium">
          {{ userStore.user.supplierApiKey ? 'Новый API ключ' : 'API ключ' }}
          <span v-if="formError" class="text-red-500 text-xs ml-2">{{ formError }}</span>
        </label>
        <div class="flex gap-2">
          <BaseInput
            v-model="newApiKey"
            type="password"
            placeholder="Введите API ключ"
            class="flex-1"
            :disabled="apiKeyStore.saving"
          />
          <BaseButton
            :loading="apiKeyStore.saving"
            :disabled="!newApiKey.trim() || apiKeyStore.saving"
            @click="saveApiKey"
          >
            {{ userStore.user.supplierApiKey ? 'Обновить' : 'Сохранить' }}
          </BaseButton>
          <BaseButton
            v-if="showEditForm"
            color="gray"
            variant="ghost"
            size="sm"
            square
            @click="cancelEdit"
            title="Отмена"
          >
            <XMarkIcon class="w-4 h-4" />
          </BaseButton>
        </div>
        <p class="text-xs text-gray-500">
          API ключ можно получить в личном кабинете WB Партнеры
        </p>
      </div>
    </div>

    <!-- Instructions -->
    <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
      <h4 class="font-medium text-blue-900 dark:text-blue-200 mb-2">
        <InformationCircleIcon class="w-4 h-4 inline mr-1" />
        Как получить API ключ
      </h4>
      <ol class="text-sm text-blue-800 dark:text-blue-300 list-decimal list-inside space-y-1">
        <li>Войдите в <a href="https://seller.wildberries.ru" target="_blank" class="underline">WB Партнеры</a></li>
        <li>Перейдите в раздел "Настройки" → "Доступ к API"</li>
        <li>Скопируйте ключ и вставьте в поле выше</li>
      </ol>
    </div>

    <!-- Error Alert -->
    <BaseAlert
      v-if="apiKeyStore.error"
      color="red"
      icon="error"
      title="Ошибка"
      class="mt-4"
    >
      {{ apiKeyStore.error }}
    </BaseAlert>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
  TrashIcon,
  PencilIcon,
  ShieldCheckIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline';
import { useSupplierApiKeyStore } from '../../stores/supplierApiKey';
import { useUserStore } from '../../stores/user';
import { BaseInput, BaseButton, BaseAlert } from '../ui';

const apiKeyStore = useSupplierApiKeyStore();
const userStore = useUserStore();

const newApiKey = ref('');
const showEditForm = ref(false);
const formError = ref('');

const apiKeyStatus = computed(() => apiKeyStore.status);

async function saveApiKey() {
  formError.value = '';

  if (!newApiKey.value.trim()) {
    formError.value = 'API ключ обязателен';
    return;
  }

  if (newApiKey.value.length < 10) {
    formError.value = 'API ключ должен содержать минимум 10 символов';
    return;
  }

  try {
    await apiKeyStore.updateApiKey(newApiKey.value.trim());
    userStore.user.supplierApiKey = newApiKey.value.trim();
    newApiKey.value = '';
    showEditForm.value = false;
    alert('API ключ успешно сохранен. Ваш API ключ прошел проверку и был сохранен в системе.');
  } catch (error: any) {
    formError.value = error.message || 'Не удалось сохранить API ключ';
  }
}

async function handleDelete() {
  const confirmed = confirm(
    'Удаление API ключа\n\nВы уверены, что хотите удалить API ключ? Это действие нельзя отменить.\n\nНажмите "OK" для удаления.'
  );

  if (confirmed) {
    try {
      await apiKeyStore.deleteApiKey();
      userStore.user.supplierApiKey = undefined;
      alert('API ключ удален. Ваш API ключ был успешно удален из системы.');
    } catch (error) {
      alert('Ошибка удаления. Не удалось удалить API ключ. Попробуйте еще раз.');
    }
  }
}

function cancelEdit() {
  showEditForm.value = false;
  newApiKey.value = '';
  formError.value = '';
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

onMounted(() => {
  apiKeyStore.checkStatus();
});
</script>
