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
        <h1 class="text-3xl md:text-4xl font-bold mb-8">Пользовательское соглашение</h1>
        <p class="text-secondary mb-8">Последнее обновление: {{ new Date().getFullYear() }}</p>

        <div class="space-y-8 text-secondary leading-relaxed">
          <section>
            <h2 class="text-xl font-semibold text-theme mb-3">1. Общие положения</h2>
            <p>
              Настоящее Пользовательское соглашение (далее — «Соглашение») регулирует отношения
              между вами (далее — «Пользователь») и владельцем сервиса WBOI (далее — «Администрация»)
              по использованию автоматизированного инструмента для селлеров Wildberries.
              Используя Сервис, вы подтверждаете, что прочитали, поняли и согласны с условиями
              настоящего Соглашения.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-semibold text-theme mb-3">2. Описание сервиса</h2>
            <p>
              WBOI — это интеллектуальная платформа для автоматизации рутинных операций селлеров
              на маркетплейсе Wildberries. Сервис предоставляет инструменты для автобронирования
              поставок, управления акциями, анализа продаж, работы с отзывами и других операций
              с использованием API Wildberries.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-semibold text-theme mb-3">3. Регистрация и аккаунт</h2>
            <p class="mb-2">
              Для использования Сервиса необходимо создать аккаунт. Пользователь обязуется:
            </p>
            <ul class="list-disc pl-6 space-y-1">
              <li>Предоставлять достоверную и актуальную информацию при регистрации;</li>
              <li>Не передавать свои учетные данные третьим лицам;</li>
              <li>Незамедлительно уведомлять Администрацию о несанкционированном доступе к аккаунту.</li>
            </ul>
          </section>

          <section>
            <h2 class="text-xl font-semibold text-theme mb-3">4. Подписки и оплата</h2>
            <p>
              Некоторые функции Сервиса доступны на платной основе. Оплата производится через
              интегрированные платежные системы. Подписка автоматически продлевается, если иное
              не указано в настройках. Возврат средств осуществляется в соответствии с действующим
              законодательством РФ.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-semibold text-theme mb-3">5. Ответственность пользователя</h2>
            <p class="mb-2">
              Пользователь использует Сервис на свой страх и риск и несет полную ответственность за:
            </p>
            <ul class="list-disc pl-6 space-y-1">
              <li>Соблюдение правил и политик платформы Wildberries;</li>
              <li>Корректность предоставляемых API-ключей и учетных данных;</li>
              <li>Последствия автоматических действий, выполненных через Сервис;</li>
              <li>Любые финансовые или репутационные потери, связанные с использованием Сервиса.</li>
            </ul>
          </section>

          <section>
            <h2 class="text-xl font-semibold text-theme mb-3">6. Ограничение ответственности Администрации</h2>
            <p class="mb-2">Администрация не несет ответственности за:</p>
            <ul class="list-disc pl-6 space-y-1">
              <li>Санкции со стороны Wildberries, примененные к аккаунту Пользователя;</li>
              <li>Технические сбои на стороне Wildberries или платежных систем;</li>
              <li>Убытки, вызванные некорректным использованием Сервиса;</li>
              <li>Действия третьих лиц, получивших доступ к аккаунту Пользователя.</li>
            </ul>
          </section>

          <section>
            <h2 class="text-xl font-semibold text-theme mb-3">7. Интеллектуальная собственность</h2>
            <p>
              Все права на Сервис, включая программное обеспечение, дизайн, тексты и графические
              элементы, принадлежат Администрации. Пользователь не имеет права копировать,
              модифицировать или распространять элементы Сервиса без письменного согласия.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-semibold text-theme mb-3">8. Изменение условий</h2>
            <p>
              Администрация оставляет за собой право в любое время изменять условия настоящего
              Соглашения. Продолжение использования Сервиса после внесения изменений означает
              согласие с новыми условиями.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-semibold text-theme mb-3">9. Прекращение действия</h2>
            <p>
              Администрация вправе приостановить или прекратить доступ Пользователя к Сервису
              в случае нарушения условий настоящего Соглашения или по техническим причинам.
              Пользователь может удалить свой аккаунт в любое время через настройки профиля.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-semibold text-theme mb-3">10. Контакты</h2>
            <p>
              По всем вопросам, связанным с использованием Сервиса, обращайтесь через Telegram бота
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
