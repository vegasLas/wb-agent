<template>
  <div class="mpstats-token-component space-y-4">
    <Card>
      <template #title>
        <h3 class="font-medium">
          MPStats токен
        </h3>
      </template>
      <template #content>
        <!-- Loading -->
        <div
          v-if="checking"
          class="flex items-center gap-3 p-3"
        >
          <i class="pi pi-spin pi-spinner text-blue-500" />
          <span class="text-sm text-gray-500">Проверка статуса токена...</span>
        </div>

        <!-- Current Token Display -->
        <div
          v-else-if="hasToken && !showEditForm"
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
                    Токен MPStats успешно сохранен
                  </p>
                </div>
                <div class="flex items-center gap-2">
                  <Button
                    severity="danger"
                    variant="outlined"
                    size="small"
                    :loading="deleting"
                    title="Удалить токен"
                    @click="handleDelete"
                  >
                    <i class="pi pi-trash" />
                  </Button>

                  <Button
                    severity="primary"
                    variant="outlined"
                    size="small"
                    title="Изменить токен"
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
          v-if="(!hasToken && !checking) || showEditForm"
          class="space-y-2"
        >
          <label class="block text-sm font-medium">
            {{ hasToken ? 'Новый токен' : 'Токен MPStats' }}
            <span
              v-if="formError"
              class="text-red-500 dark:text-red-400 text-xs ml-2"
            >{{ formError }}</span>
          </label>
          <div class="flex gap-2">
            <InputText
              v-model="newToken"
              type="password"
              placeholder="Введите токен MPStats"
              class="flex-1"
              :disabled="saving"
            />
            <Button
              :loading="saving"
              :disabled="!newToken.trim() || saving"
              @click="saveToken"
            >
              {{ hasToken ? 'Обновить' : 'Сохранить' }}
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
            Токен можно получить в личном кабинете MPStats в разделе API
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
import { ref, onMounted } from 'vue';
import { useUserStore } from '@/stores/user';
import { mpstatsAPI } from '@/api';
import { useAppToast } from '@/utils/ui/toast';
import { confirmPromise } from '@/utils/ui';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Card from 'primevue/card';
import Message from 'primevue/message';

const userStore = useUserStore();
const toast = useAppToast();

const hasToken = ref(false);
const checking = ref(true);
const newToken = ref('');
const showEditForm = ref(false);
const formError = ref('');
const saving = ref(false);
const deleting = ref(false);
const error = ref('');

onMounted(async () => {
  try {
    const status = await mpstatsAPI.getTokenStatus();
    hasToken.value = status.hasToken;
  } catch (err) {
    console.error('Failed to check MPStats token status:', err);
  } finally {
    checking.value = false;
  }
});

async function saveToken() {
  formError.value = '';
  error.value = '';

  if (!newToken.value.trim()) {
    formError.value = 'Токен обязателен';
    return;
  }

  if (newToken.value.length < 10) {
    formError.value = 'Токен должен содержать минимум 10 символов';
    return;
  }

  try {
    saving.value = true;
    await mpstatsAPI.saveToken(newToken.value.trim());
    hasToken.value = true;
    userStore.user.hasMpstatsToken = true;
    newToken.value = '';
    showEditForm.value = false;
    toast.add({
      severity: 'success',
      summary: 'Успешно',
      detail: 'Токен MPStats сохранен',
      life: 3000,
    });
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Не удалось сохранить токен';
  } finally {
    saving.value = false;
  }
}

async function handleDelete() {
  const confirmed = await confirmPromise({
    header: 'Удаление токена MPStats',
    message: 'Вы уверены, что хотите удалить токен? Это действие нельзя отменить.\n\nНажмите "OK" для удаления.',
  });

  if (confirmed) {
    try {
      deleting.value = true;
      await mpstatsAPI.deleteToken();
      hasToken.value = false;
      userStore.user.hasMpstatsToken = false;
      toast.add({
        severity: 'success',
        summary: 'Успешно',
        detail: 'Токен MPStats удален',
        life: 3000,
      });
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Не удалось удалить токен';
    } finally {
      deleting.value = false;
    }
  }
}

function cancelEdit() {
  showEditForm.value = false;
  newToken.value = '';
  formError.value = '';
}
</script>
