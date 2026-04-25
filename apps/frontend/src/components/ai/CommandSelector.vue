<script setup lang="ts">
import { ref, computed } from 'vue';
import Popover from 'primevue/popover';
import InputText from 'primevue/inputtext';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import Button from 'primevue/button';
import { useCommandFavorites, type AICommand } from '@/utils/ai-commands';
import { usePermissions } from '@/composables/usePermissions';

const props = defineProps<{
  disabled?: boolean;
}>();

const emit = defineEmits<{
  select: [command: AICommand];
}>();

const popoverRef = ref<InstanceType<typeof Popover> | null>(null);
const searchQuery = ref('');

const { toggleFavorite, isFavorite, sortedCommands, favorites } =
  useCommandFavorites();
const { hasAnyPermission } = usePermissions();

const visibleCommands = computed(() =>
  sortedCommands.value.filter(
    (cmd) => !cmd.permissions || hasAnyPermission(cmd.permissions),
  ),
);

const filteredCommands = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  if (!query) return visibleCommands.value;
  return visibleCommands.value.filter((cmd) =>
    cmd.label.toLowerCase().includes(query),
  );
});

const sortedFilteredCommands = computed(() => {
  const favSet = new Set(favorites.value);
  return [...filteredCommands.value].sort((a, b) => {
    const aFav = favSet.has(a.id) ? 1 : 0;
    const bFav = favSet.has(b.id) ? 1 : 0;
    return bFav - aFav;
  });
});

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
      class="h-7 w-auto md:h-8 md:px-2.5"
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

        <!-- Commands -->
        <div class="flex-1 overflow-y-auto">
          <div class="flex flex-col">
            <div
              v-for="cmd in sortedFilteredCommands"
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
                :icon="isFavorite(cmd.id) ? 'pi pi-star-fill' : 'pi pi-star'"
                severity="secondary"
                text
                rounded
                class="w-6 h-6"
                :class="[
                  isFavorite(cmd.id)
                    ? 'text-purple hover:text-yellow-400'
                    : 'opacity-0 group-hover:opacity-100 text-secondary hover:text-yellow-400 transition-opacity',
                ]"
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
