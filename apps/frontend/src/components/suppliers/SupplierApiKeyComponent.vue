<template>
  <div class="supplier-api-key-component space-y-4">
    <Card>
      <template #title>
        <h3 class="font-medium">
          API ключ поставщика
        </h3>
      </template>
      <template #content>
        <!-- Loading -->
        <div
          v-if="checking"
          class="flex items-center gap-3 p-3"
        >
          <i class="pi pi-spin pi-spinner text-blue-500" />
          <span class="text-sm text-gray-500">Проверка статуса ключа...</span>
        </div>

        <!-- Current Key Display -->
        <div
          v-else-if="hasKey && !showEditForm"
          class="space-y-3"
        >
          <div
            class="flex items-center justify-between p-3 bg-elevated rounded-lg"
          >
            <div class="flex-1">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-green-600 dark:text-green-400">
                    <i class="pi pi-check mr-1" />
                    API ключ поставщика сохранен
                  </p>
                </div>
                <div class="flex items-center gap-2">
                  <Button
                    severity="danger"
                    variant="outlined"
                    size="small"
                    :loading="deleting"
                    title="Удалить ключ"
                    @click="handleDelete"
                  >
                    <i class="pi pi-trash" />
                  </Button>

                  <Button
                    severity="primary"
                    variant="outlined"
                    size="small"
                    title="Изменить ключ"
                    @click="showEditForm = true"
                  >
                    <i class="pi pi-pencil" />
                  </Button>
                </div>
              </div>
            </div>
            <div class="flex items-center ml-3">
              <i
                class="pi pi-key text-green-500 dark:text-green-400 text-2xl"
              />
            </div>
          </div>
        </div>

        <!-- Input -->
        <div
          v-if="(!hasKey && !checking) || showEditForm"
          class="space-y-2"
        >
          <label class="block text-sm font-medium">
            {{ hasKey ? 'Новый ключ' : 'API ключ поставщика' }}
            <span
              v-if="formError"
              class="text-red-500 dark:text-red-400 text-xs ml-2"
            >{{ formError }}</span>
          </label>
          <div class="flex gap-2">
            <InputText
              v-model="newKey"
              type="password"
              :placeholder="hasKey ? 'Введите новый API ключ' : 'Введите API ключ поставщика'"
              class="flex-1"
              :disabled="saving"
            />
            <Button
              :loading="saving"
              :disabled="!newKey.trim() || saving"
              @click="saveKey"
            >
              {{ hasKey ? 'Обновить' : 'Сохранить' }}
            </Button>
            <Button
              v-if="showEditForm"
              severity="secondary"
              variant="text"
              size="small"
              title="Отмена"
              @click="cancelEdit"
            >
              <i class="pi pi-times" />
            </Button>
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            Ключ можно получить в личном кабинете поставщика WB в разделе API
          </p>
        </div>
      </template>
    </Card>

    <!-- Error Alert -->
    <Message
      v-if="error"
      severity="error"
      class="mt-4"
    >
      {{ error }}
    </Message>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useUserStore } from '@/stores/user';
import { useSupplierApiKeyStore } from '@/stores/suppliers';
import { useAppToast } from '@/utils/ui/toast';
import { confirmPromise } from '@/utils/ui';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Card from 'primevue/card';
import Message from 'primevue/message';

const userStore = useUserStore();
const apiKeyStore = useSupplierApiKeyStore();
const toast = useAppToast();

const hasKey = computed(() => apiKeyStore.status?.hasApiKey ?? false);
const checking = computed(() => apiKeyStore.loading && !apiKeyStore.isFetched);
const saving = computed(() => apiKeyStore.saving);
const error = computed(() => apiKeyStore.error);

const newKey = ref('');
const showEditForm = ref(false);
const formError = ref('');
const deleting = ref(false);

onMounted(async () => {
  try {
    await apiKeyStore.checkStatus();
  } catch (err) {
    console.error('Failed to check supplier API key status:', err);
  }
});

async function saveKey() {
  formError.value = '';

  if (!newKey.value.trim()) {
    formError.value = 'Ключ обязателен';
    return;
  }

  if (newKey.value.length < 10) {
    formError.value = 'Ключ должен содержать минимум 10 символов';
    return;
  }

  try {
    await apiKeyStore.updateApiKey(newKey.value.trim());
    newKey.value = '';
    showEditForm.value = false;
    toast.add({
      severity: 'success',
      summary: 'Успешно',
      detail: 'API ключ поставщика сохранен',
      life: 3000,
    });
  } catch (err: unknown) {
    formError.value = err instanceof Error ? err.message : 'Не удалось сохранить ключ';
  }
}

async function handleDelete() {
  const confirmed = await confirmPromise({
    header: 'Удаление ключа поставщика',
    message: 'Вы уверены, что хотите удалить API ключ поставщика? Это действие нельзя отменить.\n\nНажмите "OK" для удаления.',
  });

  if (confirmed) {
    try {
      deleting.value = true;
      await apiKeyStore.deleteApiKey();
      toast.add({
        severity: 'success',
        summary: 'Успешно',
        detail: 'API ключ поставщика удален',
        life: 3000,
      });
    } catch (err: unknown) {
      toast.add({
        severity: 'error',
        summary: 'Ошибка',
        detail: err instanceof Error ? err.message : 'Не удалось удалить ключ',
        life: 3000,
      });
    } finally {
      deleting.value = false;
    }
  }
}

function cancelEdit() {
  showEditForm.value = false;
  newKey.value = '';
  formError.value = '';
}
</script>
