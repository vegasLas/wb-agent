<template>
  <div class="h-full flex flex-col">
    <div class="mb-4">
      <h1 class="text-2xl font-bold">
        📜 Пользовательское соглашение
      </h1>
    </div>

    <div
      class="flex-1 overflow-y-auto pr-2 space-y-6 text-gray-700 dark:text-gray-300"
    >
      <section>
        <h2 class="text-xl font-semibold mb-3">
          1. ✅ Принятие условий
        </h2>
        <p class="leading-relaxed">
          Настоящее пользовательское соглашение (далее — «Соглашение»)
          регулирует использование бота Автобронь Wildberries (далее —
          «Сервис»). Используя Сервис, вы (далее — «Пользователь»)
          подтверждаете, что прочитали, поняли и согласны с условиями настоящего
          Соглашения. Если вы не согласны с условиями, прекратите использование
          Сервиса.
        </p>
      </section>

      <section>
        <h2 class="text-xl font-semibold mb-3">
          2. 🤖 Описание сервиса
        </h2>
        <p class="leading-relaxed">
          Сервис представляет собой автоматизированный инструмент для выполнения
          определенных действий на платформе Wildberries (например,
          автоматического бронирования товаров).
        </p>
      </section>

      <section>
        <h2 class="text-xl font-semibold mb-3">
          3. 👤 Рекомендации по использованию
        </h2>
        <p class="leading-relaxed mb-2">
          Для безопасного использования Сервиса мы настоятельно рекомендуем
          создать дополнительный аккаунт, предназначенный только для работы с
          поставщиками.
        </p>
        <p class="leading-relaxed">
          Вы можете создать дополнительный аккаунт пользователя через настройки
          поставщика Wildberries по ссылке:
          <a
            href="https://seller.wildberries.ru/supplier-settings/supplier-users"
            target="_blank"
            class="text-blue-500 dark:text-blue-400 hover:underline"
          >
            https://seller.wildberries.ru/supplier-settings/supplier-users
          </a>
        </p>
      </section>

      <section>
        <h2 class="text-xl font-semibold mb-3">
          4. ⚠️ Ответственность пользователя
        </h2>
        <p class="mb-2 leading-relaxed">
          Пользователь использует Сервис на свой страх и риск и принимает на
          себя полную ответственность за возможные последствия его
          использования, включая, но не ограничиваясь:
        </p>
        <ul class="list-disc pl-6 space-y-2">
          <li>
            🚫 Санкции со стороны Wildberries в случае нарушения его правил.
          </li>
          <li>
            💰 Любые финансовые или репутационные потери, связанные с
            использованием Сервиса.
          </li>
        </ul>
      </section>

      <section>
        <h2 class="text-xl font-semibold mb-3">
          5. ⚖️ Ограничение ответственности
        </h2>
        <p class="mb-2 leading-relaxed">
          Разработчик не несет ответственности за:
        </p>
        <ul class="list-disc pl-6 space-y-2">
          <li>
            🔒 Последствия использования Сервиса, включая санкции со стороны
            Wildberries.
          </li>
          <li>
            📊 Любые убытки пользователя, возникшие в результате работы Сервиса.
          </li>
        </ul>
      </section>
    </div>

    <div class="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
      <Message
        severity="info"
        :closable="false"
      >
        <div class="font-medium">
          ❗️ Важное уведомление
        </div>
        <div class="text-sm">
          Внимательно ознакомьтесь с условиями перед использованием сервиса.
        </div>
      </Message>

      <div class="flex justify-between items-center gap-4">
        <Button
          variant="text"
          @click="$emit('cancel')"
        >
          Отмена
        </Button>
        <Button
          :loading="loading"
          severity="primary"
          class="px-8 py-3 font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
          @click="handleAgree"
        >
          ✍️ Я согласен с условиями
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import Button from 'primevue/button';
import Message from 'primevue/message';
import { useUserStore } from '../../stores/user';
import { useAccountSupplierModalStore } from '../../stores/accountSupplierModal';

const userStore = useUserStore();
const accountSupplierModalStore = useAccountSupplierModalStore();
const loading = ref(false);

const emit = defineEmits<{
  agreed: [];
  cancel: [];
}>();

const handleAgree = async () => {
  try {
    loading.value = true;
    await userStore.agreeToTerms();

    // Reset modal and continue with auth
    accountSupplierModalStore.resetAllFields();
    accountSupplierModalStore.showAuthModal = true;
    accountSupplierModalStore.showTermsModal = false;

    emit('agreed');
  } catch (error) {
    console.error(error);
    alert('Ошибка: Не удалось принять условия использования');
  } finally {
    loading.value = false;
  }
};
</script>
