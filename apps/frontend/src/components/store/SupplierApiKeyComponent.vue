<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold">API ключ поставщика</h3>
      <span
        v-if="userStore.user.supplierApiKey"
        class="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200"
      >
        Настроен
      </span>
    </div>

    <div class="space-y-4">
      <!-- Show current API key if exists -->
      <div v-if="userStore.user.supplierApiKey && !showEditForm" class="space-y-3">
        <div
          class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
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
                  :loading="loading"
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

      <!-- Add/Edit form -->
      <div v-if="!userStore.user.supplierApiKey || showEditForm" class="space-y-3">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            API ключ
            <span v-if="formError" class="text-red-500 text-xs ml-2">{{ formError }}</span>
          </label>
          <div class="flex gap-2">
            <BaseInput
              v-model="formData.apiKey"
              placeholder="Введите ваш API ключ поставщика"
              :disabled="loading"
              class="flex-1"
            />

            <BaseButton
              color="primary"
              size="sm"
              square
              :loading="loading"
              :disabled="!formData.apiKey.trim() || loading"
              @click="handleSave"
              :title="
                userStore.user.supplierApiKey
                  ? 'Обновить API ключ'
                  : 'Сохранить API ключ'
              "
            >
              <CheckIcon class="w-4 h-4" />
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
        </div>
      </div>

      <!-- Info Alert -->
      <BaseAlert
        v-if="!userStore.user.supplierApiKey || showEditForm"
        color="blue"
        icon="info"
        title="Информация об API ключе"
      >
        <div class="space-y-2 text-sm">
          <p>
            API ключ ускорит успех ваших автобронирований. Убедитесь, что ключ
            действителен и имеет необходимые права доступа.
          </p>
          <p>
            <a
              href="https://seller.wildberries.ru/supplier-settings/access-to-api"
              target="_blank"
              rel="noopener noreferrer"
              class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
            >
              Получить API ключ в личном кабинете Wildberries →
            </a>
          </p>
        </div>
      </BaseAlert>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import {
  TrashIcon,
  PencilIcon,
  ShieldCheckIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline';
import { BaseButton, BaseInput, BaseAlert } from '../ui';
import { useUserStore } from '../../stores/user';
import { api } from '../../api';

const userStore = useUserStore();

const showEditForm = ref(false);
const formError = ref('');
const loading = ref(false);

const formData = reactive({
  apiKey: '',
});

// Helper function to format date
function formatDate(date: Date): string {
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Methods
async function handleSave() {
  formError.value = '';

  if (!formData.apiKey.trim()) {
    formError.value = 'API ключ обязателен';
    return;
  }

  if (formData.apiKey.length < 10) {
    formError.value = 'API ключ должен содержать минимум 10 символов';
    return;
  }

  try {
    loading.value = true;
    await api.post('/supplier/api-key', {
      apiKey: formData.apiKey.trim(),
    });

    // Update local user state
    userStore.user.supplierApiKey = formData.apiKey.trim();

    // Show success alert (using native alert for now)
    alert('API ключ успешно сохранен. Ваш API ключ прошел проверку и был сохранен в системе.');

    // Reset form
    formData.apiKey = '';
    showEditForm.value = false;
  } catch (error: any) {
    formError.value =
      'Не валидный API ключ, пожалуйста проверьте ключ и попробуйте еще раз';
  } finally {
    loading.value = false;
  }
}

async function handleDelete() {
  const confirmed = confirm(
    'Удаление API ключа\n\nВы уверены, что хотите удалить API ключ? Это действие нельзя отменить.\n\nНажмите "OK" для удаления.'
  );

  if (confirmed) {
    try {
      loading.value = true;
      await api.delete('/supplier/api-key');

      // Update local user state
      userStore.user.supplierApiKey = undefined;

      // Show success alert
      alert('API ключ удален. Ваш API ключ был успешно удален из системы.');
    } catch (error) {
      alert('Ошибка удаления. Не удалось удалить API ключ. Попробуйте еще раз.');
    } finally {
      loading.value = false;
    }
  }
}

function cancelEdit() {
  showEditForm.value = false;
  formData.apiKey = '';
  formError.value = '';
}
</script>
