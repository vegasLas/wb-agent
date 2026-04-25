<script setup lang="ts">
import { ref, computed } from 'vue';
import Popover from 'primevue/popover';
import InputText from 'primevue/inputtext';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import Button from 'primevue/button';
import { useCommandFavorites, type AICommand } from '@/utils/ai-commands';

const props = defineProps<{
  disabled?: boolean;
}>();

const emit = defineEmits<{
  select: [command: AICommand];
}>();

const popoverRef = ref<InstanceType<typeof Popover> | null>(null);
const searchQuery = ref('');

const { toggleFavorite, isFavorite, sortedCommands } = useCommandFavorites();

const filteredCommands = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  if (!query) return sortedCommands.value;
  return sortedCommands.value.filter((cmd) =>
    cmd.label.toLowerCase().includes(query),
  );
});

const favoriteCommands = computed(() =>
  filteredCommands.value.filter((cmd) => isFavorite(cmd.id)),
);

const nonFavoriteCommands = computed(() =>
  filteredCommands.value.filter((cmd) => !isFavorite(cmd.id)),
);

function togglePopover(event: MouseEvent) {
  popoverRef.value?.toggle(event);
}

function handleSelect(cmd: AICommand) {
  emit('select', cmd);
  searchQuery.value = '';
  popoverRef.value?.hide();
}

function handleToggleFavorite(event: MouseEvent, commandId: string) {
  event.stopPropagation();
  toggleFavorite(commandId);
}
</script>

<template>
  <div>
    <Button
      severity="secondary"
      text
      rounded
      :disabled="props.disabled"
      class="w-7 h-7 md:w-auto md:h-8 md:px-2.5"
      @click="togglePopover"
    >
      <i class="pi pi-sliders-h text-sm" />
      <span class="inline ml-1.5 text-sm">команды</span>
    </Button>

    <Popover ref="popoverRef" class="command-selector-popover">
      <div class="flex flex-col w-72 max-h-[420px] bg-card rounded-xl">
        <!-- Search -->
        <div class="px-3 pt-3 pb-2">
          <IconField>
            <InputIcon class="pi pi-search text-xs text-secondary" />
            <InputText
              v-model="searchQuery"
              type="text"
              placeholder="Поиск команд..."
              class="w-full"
              @keydown.stop
            />
          </IconField>
        </div>

        <!-- Favorites -->
        <template v-if="favoriteCommands.length > 0">
          <div
            class="px-3 py-1.5 text-xs font-semibold text-purple uppercase tracking-wider"
          >
            Избранное
          </div>
          <div class="flex flex-col max-h-[180px] overflow-y-auto">
            <div
              v-for="cmd in favoriteCommands"
              :key="cmd.id"
              class="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-elevated transition-colors group"
              @click="handleSelect(cmd)"
            >
              <i
                :class="[
                  cmd.icon,
                  'text-sm text-secondary group-hover:text-purple',
                ]"
              />
              <span class="text-sm text-theme flex-1 truncate">{{
                cmd.label
              }}</span>
              <Button
                icon="pi pi-star-fill"
                severity="secondary"
                text
                rounded
                class="w-6 h-6 text-purple hover:text-yellow-400"
                @click="handleToggleFavorite($event, cmd.id)"
              />
            </div>
          </div>
          <div
            v-if="nonFavoriteCommands.length > 0"
            class="border-t border-deep-border my-1"
          />
        </template>

        <!-- All commands -->
        <div class="flex-1 overflow-y-auto">
          <div class="flex flex-col">
            <div
              v-for="cmd in nonFavoriteCommands"
              :key="cmd.id"
              class="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-elevated transition-colors group"
              @click="handleSelect(cmd)"
            >
              <i
                :class="[
                  cmd.icon,
                  'text-sm text-secondary group-hover:text-purple',
                ]"
              />
              <span class="text-sm text-theme flex-1 truncate">{{
                cmd.label
              }}</span>
              <Button
                icon="pi pi-star"
                severity="secondary"
                text
                rounded
                class="w-6 h-6 opacity-0 group-hover:opacity-100 text-secondary hover:text-yellow-400 transition-opacity"
                @click="handleToggleFavorite($event, cmd.id)"
              />
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div
          v-if="filteredCommands.length === 0"
          class="px-3 py-6 text-center text-sm text-secondary"
        >
          Ничего не найдено
        </div>
      </div>
    </Popover>
  </div>
</template>
