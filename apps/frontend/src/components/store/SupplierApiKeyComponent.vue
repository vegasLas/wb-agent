<template>
  <div class="api-key-component space-y-4">
    <Card>
      <template #title>
        <h3 class="font-medium">API ключ поставщика</h3>
      </template>
      <template #content>
        <!-- Status -->
        <div v-if="apiKeyStatus" class="mb-4">
          <Tag
            :severity="apiKeyStatus.valid ? 'success' : 'danger'"
            :icon="
              apiKeyStatus.valid ? 'pi pi-check-circle' : 'pi pi-times-circle'
            "
            :value="apiKeyStatus.valid ? 'Ключ действителен' : 'Ошибка ключа'"
            class="mb-2"
          />
          <p v-if="apiKeyStatus.message" class="text-sm text-gray-500 mt-1">
            {{ apiKeyStatus.message }}
          </p>
        </div>

        <!-- Current Key Display -->
        <div
          v-if="userStore.user.supplierApiKey && !showEditForm"
          class="space-y-3"
        >
          <div
            class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
          >
            <div class="flex-1">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-green-600 dark:text-green-400">
                    <i class="pi pi-check mr-1"></i>
                    API ключ успешно сохранен
                  </p>
                  <p class="text-xs text-gray-500 mt-1">
                    Обновлен: {{ formatDate(new Date()) }}
                  </p>
                </div>
                <div class="flex items-center gap-2">
                  <Button
                    severity="danger"
                    variant="outlined"
                    size="small"
                    :loading="apiKeyStore.loading"
                    @click="handleDelete"
                    title="Удалить API ключ"
                  >
                    <i class="pi pi-trash"></i>
                  </Button>

                  <Button
                    severity="primary"
                    variant="outlined"
                    size="small"
                    @click="showEditForm = true"
                    title="Изменить API ключ"
                  >
                    <i class="pi pi-pencil"></i>
                  </Button>
                </div>
              </div>
            </div>
            <div class="flex items-center ml-3">
              <i class="pi pi-shield text-green-500 text-2xl"></i>
            </div>
          </div>
        </div>

        <!-- Input -->
        <div
          v-if="!userStore.user.supplierApiKey || showEditForm"
          class="space-y-2"
        >
          <label class="block text-sm font-medium">
            {{ userStore.user.supplierApiKey ? 'Новый API ключ' : 'API ключ' }}
            <span v-if="formError" class="text-red-500 text-xs ml-2">{{
              formError
            }}</span>
          </label>
          <div class="flex gap-2">
            <InputText
              v-model="newApiKey"
              type="password"
              placeholder="Введите API ключ"
              class="flex-1"
              :disabled="apiKeyStore.saving"
            />
            <Button
              :loading="apiKeyStore.saving"
              :disabled="!newApiKey.trim() || apiKeyStore.saving"
              @click="saveApiKey"
            >
              {{ userStore.user.supplierApiKey ? 'Обновить' : 'Сохранить' }}
            </Button>
            <Button
              v-if="showEditForm"
              severity="secondary"
              variant="text"
              size="small"
              @click="cancelEdit"
              title="Отмена"
            >
              <i class="pi pi-times"></i>
            </Button>
          </div>
          <p class="text-xs text-gray-500">
            API ключ можно получить в личном кабинете WB Партнеры
          </p>
        </div>
      </template>
    </Card>

    <!-- Instructions -->
    <Card>
      <template #content>
        <h4 class="font-medium text-blue-900 dark:text-blue-200 mb-2">
          <i class="pi pi-info-circle mr-1"></i>
          Как получить API ключ
        </h4>
        <ol
          class="text-sm text-blue-800 dark:text-blue-300 list-decimal list-inside space-y-1"
        >
          <li>
            Войдите в
            <a
              href="https://seller.wildberries.ru"
              target="_blank"
              class="underline"
              >WB Партнеры</a
            >
          </li>
          <li>Перейдите в раздел "Настройки" → "Доступ к API"</li>
          <li>Скопируйте ключ и вставьте в поле выше</li>
        </ol>
      </template>
    </Card>

    <!-- Error Alert -->
    <Message v-if="apiKeyStore.error" severity="error" class="mt-4">
      {{ apiKeyStore.error }}
    </Message>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useSupplierApiKeyStore } from '../../stores/supplierApiKey';
import { useUserStore } from '../../stores/user';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Card from 'primevue/card';
import Tag from 'primevue/tag';
import Message from 'primevue/message';

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
    alert(
      'API ключ успешно сохранен. Ваш API ключ прошел проверку и был сохранен в системе.',
    );
  } catch (error: any) {
    formError.value = error.message || 'Не удалось сохранить API ключ';
  }
}

async function handleDelete() {
  const confirmed = confirm(
    'Удаление API ключа\n\nВы уверены, что хотите удалить API ключ? Это действие нельзя отменить.\n\nНажмите "OK" для удаления.',
  );

  if (confirmed) {
    try {
      await apiKeyStore.deleteApiKey();
      userStore.user.supplierApiKey = undefined;
      alert('API ключ удален. Ваш API ключ был успешно удален из системы.');
    } catch (error) {
      alert(
        'Ошибка удаления. Не удалось удалить API ключ. Попробуйте еще раз.',
      );
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
  // apiKeyStore.checkStatus();
});
</script>
