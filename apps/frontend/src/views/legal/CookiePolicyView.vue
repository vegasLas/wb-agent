<template>
  <div class="min-h-screen bg-deep-bg text-theme">
    <!-- Header -->
    <div class="sticky top-0 z-30 bg-deep-bg/95 backdrop-blur border-b border-deep-border">
      <div class="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
        <RouterLink
          to="/"
          class="inline-flex items-center gap-2 text-sm text-secondary hover:text-theme transition-colors"
        >
          <i class="pi pi-arrow-left" />
          <span>На главную</span>
        </RouterLink>
        <h1 class="text-sm font-semibold">Политика использования cookies</h1>
      </div>
    </div>

    <!-- Content -->
    <main class="py-8 px-4">
      <div class="max-w-3xl mx-auto space-y-8 text-secondary leading-relaxed">
        <p class="text-sm">Последнее обновление: {{ new Date().getFullYear() }}</p>

        <section>
          <h2 class="text-lg font-semibold text-theme mb-3">1. Что такое cookies</h2>
          <p>
            Cookies — это небольшие текстовые файлы, которые сохраняются на вашем устройстве
            при посещении веб-сайтов. Они используются для хранения информации о ваших предпочтениях,
            настройках и действиях на сайте.
          </p>
        </section>

        <section>
          <h2 class="text-lg font-semibold text-theme mb-3">2. Какие cookies мы используем</h2>
          <div class="space-y-4">
            <div>
              <h3 class="font-semibold text-theme mb-1">Необходимые cookies</h3>
              <p>
                Обеспечивают корректную работу Сервиса, включая аутентификацию, сохранение
                сессии и защиту от CSRF-атак. Без этих cookies Сервис не может функционировать.
              </p>
            </div>
            <div>
              <h3 class="font-semibold text-theme mb-1">Функциональные cookies</h3>
              <p>
                Запоминают ваши предпочтения (например, выбранная тема оформления — светлая или
                темная) и настройки интерфейса для улучшения пользовательского опыта.
              </p>
            </div>
            <div>
              <h3 class="font-semibold text-theme mb-1">Аналитические cookies</h3>
              <p>
                Помогают нам понять, как пользователи взаимодействуют с Сервисом, какие страницы
                посещаются и какие функции используются чаще всего. Эти данные используются
                исключительно в обобщенном виде.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 class="text-lg font-semibold text-theme mb-3">3. Как управлять cookies</h2>
          <p class="mb-2">
            Вы можете управлять cookies через настройки вашего браузера:
          </p>
          <ul class="list-disc pl-6 space-y-1">
            <li>Разрешить все cookies;</li>
            <li>Блокировать все cookies;</li>
            <li>Уведомлять о каждой попытке установки cookies;</li>
            <li>Удалить ранее сохраненные cookies.</li>
          </ul>
          <p class="mt-2">
            Обратите внимание: отключение необходимых cookies может привести к некорректной работе
            Сервиса или полной невозможности его использования.
          </p>
        </section>

        <section>
          <h2 class="text-lg font-semibold text-theme mb-3">4. Срок хранения cookies</h2>
          <p>
            Срок хранения cookies зависит от их типа. Сессионные cookies удаляются при закрытии
            браузера. Постоянные cookies могут храниться от нескольких дней до нескольких месяцев
            в зависимости от их назначения.
          </p>
        </section>

        <section>
          <h2 class="text-lg font-semibold text-theme mb-3">5. Изменения политики</h2>
          <p>
            Мы можем обновлять настоящую Политику cookies. Рекомендуем периодически просматривать
            эту страницу для ознакомления с актуальной версией.
          </p>
        </section>

        <section>
          <h2 class="text-lg font-semibold text-theme mb-3">6. Контакты</h2>
          <p>
            По вопросам, связанным с использованием cookies, обращайтесь через Telegram бота
            <a href="https://t.me/wb_booking_bot" target="_blank" rel="noopener" class="text-purple hover:underline">@wb_booking_bot</a>.
          </p>
        </section>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router';
</script>
