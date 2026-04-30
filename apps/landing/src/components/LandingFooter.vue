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
