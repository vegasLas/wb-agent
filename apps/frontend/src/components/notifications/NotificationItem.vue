<template>
  <div
    :class="[
      'flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors',
      notification.readAt
        ? 'bg-transparent hover:bg-elevated/50'
        : 'bg-elevated/30 hover:bg-elevated',
    ]"
    @click="handleClick"
  >
    <Avatar
      :icon="iconClass"
      shape="circle"
      :pt="{ root: { class: ['w-8 h-8 shrink-0 mt-0.5', iconBgClass] }, icon: { class: 'text-sm' } }"
    />
    <div class="flex-1 min-w-0">
      <div class="flex items-start justify-between gap-2">
        <p class="text-sm font-medium text-theme leading-tight">
          {{ notification.title }}
        </p>
        <span class="text-[11px] text-muted shrink-0 whitespace-nowrap">
          {{ timeAgo }}
        </span>
      </div>
      <p class="text-xs text-secondary mt-1 line-clamp-2 leading-relaxed">
        {{ notification.message }}
      </p>
    </div>
    <Button
      v-if="!notification.readAt"
      icon="pi pi-check"
      severity="primary"
      text
      rounded
      size="small"
      title="Отметить прочитанным"
      class="shrink-0 mt-1 w-5 h-5"
      :pt="{ icon: { class: 'text-[10px]' } }"
      @click.stop="emit('mark-read', notification.id)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Avatar from 'primevue/avatar';
import Button from 'primevue/button';
import { formatTimeAgo } from '@/utils/formatters/date';
import type { InAppNotification } from '@/api/notifications';

const props = defineProps<{
  notification: InAppNotification;
}>();

const emit = defineEmits<{
  'mark-read': [id: string];
  navigate: [link: string | null | undefined];
}>();

const iconClass = computed(() => {
  switch (props.notification.type) {
    case 'AUTOBOOKING':
    case 'RESCHEDULE':
      return 'pi pi-calendar';
    case 'TRIGGER':
      return 'pi pi-bolt';
    case 'SUBSCRIPTION':
      return 'pi pi-crown';
    case 'PAYMENT':
      return 'pi pi-credit-card';
    case 'FEEDBACK':
      return 'pi pi-comment';
    case 'SYSTEM':
    default:
      return 'pi pi-bell';
  }
});

const iconBgClass = computed(() => {
  switch (props.notification.type) {
    case 'AUTOBOOKING':
    case 'RESCHEDULE':
      return 'bg-blue-500/10 text-blue-400';
    case 'TRIGGER':
      return 'bg-amber-500/10 text-amber-400';
    case 'SUBSCRIPTION':
      return 'bg-purple-500/10 text-purple-400';
    case 'PAYMENT':
      return 'bg-emerald-500/10 text-emerald-400';
    case 'FEEDBACK':
      return 'bg-pink-500/10 text-pink-400';
    case 'SYSTEM':
    default:
      return 'bg-slate-500/10 text-slate-400';
  }
});

const timeAgo = computed(() => formatTimeAgo(props.notification.createdAt));

function handleClick() {
  if (!props.notification.readAt) {
    emit('mark-read', props.notification.id);
  }
  if (props.notification.link) {
    emit('navigate', props.notification.link);
  }
}
</script>
