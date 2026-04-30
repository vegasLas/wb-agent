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
        <h1 class="text-3xl md:text-4xl font-bold mb-8">Политика конфиденциальности</h1>
        <p class="text-secondary mb-8">Последнее обновление: {{ new Date().getFullYear() }}</p>

        <div class="space-y-8 text-secondary leading-relaxed">
          <section>
            <h2 class="text-xl font-semibold text-theme mb-3">1. Общие положения</h2>
            <p>
              Настоящая Политика конфиденциальности (далее — «Политика») определяет порядок обработки
              и защиты персональных данных пользователей сервиса WBOI (далее — «Сервис»).
              Используя Сервис, вы даете согласие на обработку ваших персональных данных в соответствии
              с настоящей Политикой и законодательством Российской Федерации, включая Федеральный закон
              № 152-ФЗ «О персональных данных».
            </p>
          </section>

          <section>
            <h2 class="text-xl font-semibold text-theme mb-3">2. Какие данные мы собираем</h2>
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
            <h2 class="text-xl font-semibold text-theme mb-3">3. Цели обработки данных</h2>
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
            <h2 class="text-xl font-semibold text-theme mb-3">4. Передача данных третьим лицам</h2>
            <p>
              Мы не передаем персональные данные третьим лицам, за исключением случаев, когда это
              необходимо для оказания услуг (например, платежные системы) или требуется по закону.
              API-ключи Wildberries используются исключительно для выполнения запрошенных вами операций
              и не передаются третьим лицам.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-semibold text-theme mb-3">5. Хранение и защита данных</h2>
            <p>
              Персональные данные хранятся на защищенных серверах. Мы применяем современные технические
              и организационные меры для защиты данных от несанкционированного доступа, утраты или
              изменения. Данные хранятся в течение срока, необходимого для достижения целей обработки,
              либо в течение срока, установленного законодательством РФ.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-semibold text-theme mb-3">6. Права пользователя</h2>
            <p class="mb-2">Вы имеете право:</p>
            <ul class="list-disc pl-6 space-y-1">
              <li>Получить информацию об обрабатываемых вами персональных данных;</li>
              <li>Требовать уточнения, блокирования или уничтожения данных;</li>
              <li>Отозвать согласие на обработку персональных данных;</li>
              <li>Обжаловать действия оператора в уполномоченном органе по защите прав субъектов персональных данных.</li>
            </ul>
          </section>

          <section>
            <h2 class="text-xl font-semibold text-theme mb-3">7. Cookies</h2>
            <p>
              Сервис использует cookies для обеспечения корректной работы, анализа посещаемости и
              персонализации. Вы можете отключить cookies в настройках браузера, однако это может
              повлиять на функциональность Сервиса.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-semibold text-theme mb-3">8. Контакты</h2>
            <p>
              По вопросам, связанным с обработкой персональных данных, вы можете связаться с нами
              через форму обратной связи в приложении.
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
