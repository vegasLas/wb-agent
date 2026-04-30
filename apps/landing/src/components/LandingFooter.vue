<template>
  <footer class="relative py-16 px-4 border-t border-deep-border">
    <div class="max-w-7xl mx-auto">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
        <div class="md:col-span-2">
          <div class="flex items-center gap-2 mb-4">
            <img src="/logo.png" alt="WBOI" class="h-8 w-auto block" draggable="false" />
            <span class="text-3xl font-bold text-gradient">WBOI</span>
          </div>
          <p class="text-secondary max-w-md leading-relaxed">
            Интеллектуальная платформа для селлеров Wildberries. Автоматизируйте рутину, анализируйте продажи и масштабируйте бизнес с помощью AI.
          </p>
        </div>

        <div>
          <h4 class="text-theme font-semibold mb-4">Продукт</h4>
          <ul class="space-y-3">
            <li>
              <a href="#features" class="text-secondary hover:text-purple transition-colors">Возможности</a>
            </li>
            <li>
              <a href="#pricing" class="text-secondary hover:text-purple transition-colors">Тарифы</a>
            </li>
            <li>
              <a href="https://app.wboi.ru" class="text-secondary hover:text-purple transition-colors">Войти</a>
            </li>
          </ul>
        </div>

        <div>
          <h4 class="text-theme font-semibold mb-4">Правовая информация</h4>
          <ul class="space-y-3">
            <li>
              <a href="#/privacy" class="text-secondary hover:text-purple transition-colors">Политика конфиденциальности</a>
            </li>
            <li>
              <a href="#/terms" class="text-secondary hover:text-purple transition-colors">Пользовательское соглашение</a>
            </li>
            <li>
              <a href="#/cookies" class="text-secondary hover:text-purple transition-colors">Cookies</a>
            </li>
          </ul>
        </div>

        <div>
          <h4 class="text-theme font-semibold mb-4">Контакты</h4>
          <ul class="space-y-3">
            <li>
              <a href="https://t.me/wb_booking_bot" target="_blank" rel="noopener" class="text-secondary hover:text-purple transition-colors flex items-center gap-2">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
                Telegram бот
              </a>
            </li>
            <li>
              <a href="https://app.wboi.ru" class="text-secondary hover:text-purple transition-colors">app.wboi.ru</a>
            </li>
          </ul>
        </div>
      </div>

      <div class="pt-8 border-t border-deep-border flex flex-col md:flex-row items-center justify-between gap-4">
        <p class="text-muted text-sm">
          © {{ new Date().getFullYear() }} WBOI. Все права защищены.
        </p>
        <p class="text-muted text-sm">
          Неофициальный сервис для селлеров Wildberries
        </p>
      </div>
    </div>
  </footer>
</template>
