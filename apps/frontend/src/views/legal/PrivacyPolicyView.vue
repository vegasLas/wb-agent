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
        <h1 class="text-sm font-semibold">Политика конфиденциальности</h1>
      </div>
    </div>

    <!-- Content -->
    <main class="py-8 px-4">
      <div class="max-w-3xl mx-auto space-y-8 text-secondary leading-relaxed">
        <p class="text-sm">Последнее обновление: {{ new Date().getFullYear() }}</p>

        <section>
          <h2 class="text-lg font-semibold text-theme mb-3">1. Общие положения</h2>
          <p>
            Настоящая Политика конфиденциальности (далее — «Политика») определяет порядок обработки
            и защиты персональных данных пользователей сервиса WBOI (далее — «Сервис»).
            Используя Сервис, вы даете согласие на обработку ваших персональных данных в соответствии
            с настоящей Политикой и законодательством Российской Федерации, включая Федеральный закон
            № 152-ФЗ «О персональных данных».
          </p>
        </section>

        <section>
          <h2 class="text-lg font-semibold text-theme mb-3">2. Какие данные мы собираем</h2>
          <p class="mb-2">Мы можем собирать следующие категории персональных данных:</p>
          <ul class="list-disc pl-6 space-y-1">
            <li>Имя, адрес электронной почты, номер телефона;</li>
            <li>Данные аккаунтов Wildberries (идентификаторы поставщиков, API-ключи);</li>

            <li>Технические данные (IP-адрес, User-Agent, cookies);</li>
            <li>Информация о подписках и платежах;</li>
            <li>Данные об использовании сервиса (логи, настройки автоматизаций).</li>
          </ul>
        </section>

        <section>
          <h2 class="text-lg font-semibold text-theme mb-3">3. Цели обработки данных</h2>
          <p class="mb-2">Персональные данные обрабатываются в следующих целях:</p>
          <ul class="list-disc pl-6 space-y-1">
            <li>Предоставление доступа к функциям Сервиса;</li>
            <li>Автоматизация операций на платформе Wildberries;</li>
            <li>Обработка платежей и управление подписками;</li>
            <li>Техническая поддержка пользователей;</li>
            <li>Уведомления об обновлениях, акциях и важных изменениях;</li>
            <li>Улучшение качества работы Сервиса и персонализация.</li>
          </ul>
        </section>

        <section>
          <h2 class="text-lg font-semibold text-theme mb-3">4. Передача данных третьим лицам</h2>
          <p>
            Мы не передаем персональные данные третьим лицам, за исключением случаев, когда это
            необходимо для оказания услуг (например, платежные системы) или требуется по закону.
            API-ключи Wildberries используются исключительно для выполнения запрошенных вами операций
            и не передаются третьим лицам.
          </p>
        </section>

        <section>
          <h2 class="text-lg font-semibold text-theme mb-3">5. Хранение и защита данных</h2>
          <p>
            Персональные данные хранятся на защищенных серверах. Мы применяем современные технические
            и организационные меры для защиты данных от несанкционированного доступа, утраты или
            изменения. Данные хранятся в течение срока, необходимого для достижения целей обработки,
            либо в течение срока, установленного законодательством РФ.
          </p>
        </section>

        <section>
          <h2 class="text-lg font-semibold text-theme mb-3">6. Права пользователя</h2>
          <p class="mb-2">Вы имеете право:</p>
          <ul class="list-disc pl-6 space-y-1">
            <li>Получить информацию об обрабатываемых вами персональных данных;</li>
            <li>Требовать уточнения, блокирования или уничтожения данных;</li>
            <li>Отозвать согласие на обработку персональных данных;</li>
            <li>Обжаловать действия оператора в уполномоченном органе по защите прав субъектов персональных данных.</li>
          </ul>
        </section>

        <section>
          <h2 class="text-lg font-semibold text-theme mb-3">7. Cookies</h2>
          <p>
            Сервис использует cookies для обеспечения корректной работы, анализа посещаемости и
            персонализации. Вы можете отключить cookies в настройках браузера, однако это может
            повлиять на функциональность Сервиса.
          </p>
        </section>

        <section>
          <h2 class="text-lg font-semibold text-theme mb-3">8. Контакты</h2>
          <p>
            По вопросам, связанным с обработкой персональных данных, вы можете связаться с нами
            через форму обратной связи в приложении.
          </p>
        </section>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router';
</script>
