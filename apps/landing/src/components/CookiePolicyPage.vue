<template>
  <div class="min-h-screen bg-theme text-theme transition-colors duration-200">
    <!-- Navigation -->
    <nav
      class="fixed top-0 left-0 right-0 z-50 bg-theme/80 backdrop-blur-xl border-b border-theme transition-colors duration-200"
    >
      <div class="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <a href="/" class="flex items-center gap-2">
          <img src="/logo.png" alt="WBOI" class="h-8 w-auto block" draggable="false" />
          <span class="text-2xl font-bold text-gradient">WBOI</span>
        </a>
        <a
          href="/"
          class="px-4 py-2 rounded-xl text-sm font-medium text-secondary hover:text-theme hover:bg-elevated transition-all"
        >
          ← На главную
        </a>
      </div>
    </nav>

    <!-- Content -->
    <main class="pt-24 pb-16 px-4">
      <div class="max-w-3xl mx-auto">
        <h1 class="text-3xl md:text-4xl font-bold mb-8">Политика использования cookies</h1>
        <p class="text-secondary mb-8">Последнее обновление: {{ new Date().getFullYear() }}</p>

        <div class="space-y-8 text-secondary leading-relaxed">
          <section>
            <h2 class="text-xl font-semibold text-theme mb-3">1. Что такое cookies</h2>
            <p>
              Cookies — это небольшие текстовые файлы, которые сохраняются на вашем устройстве
              при посещении веб-сайтов. Они используются для хранения информации о ваших предпочтениях,
              настройках и действиях на сайте.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-semibold text-theme mb-3">2. Какие cookies мы используем</h2>
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
            <h2 class="text-xl font-semibold text-theme mb-3">3. Как управлять cookies</h2>
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
            <h2 class="text-xl font-semibold text-theme mb-3">4. Срок хранения cookies</h2>
            <p>
              Срок хранения cookies зависит от их типа. Сессионные cookies удаляются при закрытии
              браузера. Постоянные cookies могут храниться от нескольких дней до нескольких месяцев
              в зависимости от их назначения.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-semibold text-theme mb-3">5. Изменения политики</h2>
            <p>
              Мы можем обновлять настоящую Политику cookies. Рекомендуем периодически просматривать
              эту страницу для ознакомления с актуальной версией.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-semibold text-theme mb-3">6. Контакты</h2>
            <p>
              По вопросам, связанным с использованием cookies, обращайтесь через Telegram бота
              <a href="https://t.me/wb_booking_bot" target="_blank" rel="noopener" class="text-purple hover:underline">@wb_booking_bot</a>.
            </p>
          </section>
        </div>
      </div>
    </main>

    <LandingFooter />
  </div>
</template>

<script setup lang="ts">
import LandingFooter from './LandingFooter.vue';
</script>
