<template>
  <div class="space-y-6 text-secondary leading-relaxed">
    <p class="text-sm">Последнее обновление: {{ new Date().getFullYear() }}</p>

    <section>
      <h2 class="text-base font-semibold text-theme mb-2">1. Что такое cookies</h2>
      <p class="text-sm">
        Cookies — это небольшие текстовые файлы, которые сохраняются на вашем устройстве
        при посещении веб-сайтов. Они используются для хранения информации о ваших предпочтениях,
        настройках и действиях на сайте.
      </p>
    </section>

    <section>
      <h2 class="text-base font-semibold text-theme mb-2">2. Какие cookies мы используем</h2>
      <div class="space-y-4">
        <div>
          <h3 class="font-semibold text-theme text-sm mb-1">Необходимые cookies</h3>
          <p class="text-sm">
            Обеспечивают корректную работу Сервиса, включая аутентификацию, сохранение
            сессии и защиту от CSRF-атак. Без этих cookies Сервис не может функционировать.
          </p>
        </div>
        <div>
          <h3 class="font-semibold text-theme text-sm mb-1">Функциональные cookies</h3>
          <p class="text-sm">
            Запоминают ваши предпочтения (например, выбранная тема оформления — светлая или
            темная) и настройки интерфейса для улучшения пользовательского опыта.
          </p>
        </div>
        <div>
          <h3 class="font-semibold text-theme text-sm mb-1">Аналитические cookies</h3>
          <p class="text-sm">
            Помогают нам понять, как пользователи взаимодействуют с Сервисом, какие страницы
            посещаются и какие функции используются чаще всего. Эти данные используются
            исключительно в обобщенном виде.
          </p>
        </div>
      </div>
    </section>

    <section>
      <h2 class="text-base font-semibold text-theme mb-2">3. Как управлять cookies</h2>
      <p class="text-sm mb-2">
        Вы можете управлять cookies через настройки вашего браузера:
      </p>
      <ul class="list-disc pl-6 space-y-1 text-sm">
        <li>Разрешить все cookies;</li>
        <li>Блокировать все cookies;</li>
        <li>Уведомлять о каждой попытке установки cookies;</li>
        <li>Удалить ранее сохраненные cookies.</li>
      </ul>
      <p class="mt-2 text-sm">
        Обратите внимание: отключение необходимых cookies может привести к некорректной работе
        Сервиса или полной невозможности его использования.
      </p>
    </section>

    <section>
      <h2 class="text-base font-semibold text-theme mb-2">4. Срок хранения cookies</h2>
      <p class="text-sm">
        Срок хранения cookies зависит от их типа. Сессионные cookies удаляются при закрытии
        браузера. Постоянные cookies могут храниться от нескольких дней до нескольких месяцев
        в зависимости от их назначения.
      </p>
    </section>

    <section>
      <h2 class="text-base font-semibold text-theme mb-2">5. Изменения политики</h2>
      <p class="text-sm">
        Мы можем обновлять настоящую Политику cookies. Рекомендуем периодически просматривать
        эту страницу для ознакомления с актуальной версией.
      </p>
    </section>

    <section>
      <h2 class="text-base font-semibold text-theme mb-2">6. Контакты</h2>
      <p class="text-sm">
        По вопросам, связанным с использованием cookies, обращайтесь через форму обратной связи в приложении.
      </p>
    </section>
  </div>
</template>
