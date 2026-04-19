<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue';
import { useAIChatStore } from '@/stores/ai/chat.store';
import { useTypewriterPlaceholder } from '@/composables/ai/useTypewriterPlaceholder';
import { ABILITY_PROMPTS } from '@/utils/ai-abilities';

const store = useAIChatStore();
const inputText = ref('');
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);
const attachedFiles = ref<File[]>([]);
const isDragOver = ref(false);
const isFocused = ref(false);

const {
  placeholder: dynamicPlaceholder,
  start: startTypewriter,
  stop: stopTypewriter,
} = useTypewriterPlaceholder(ABILITY_PROMPTS, {
  typingSpeed: 50,
  deleteSpeed: 25,
  pauseAfterType: 2500,
  pauseAfterDelete: 400,
});

const isLoading = computed(
  () => store.status === 'submitted' || store.status === 'streaming',
);
const hasInput = computed(
  () => !!inputText.value.trim() || attachedFiles.value.length > 0,
);
const hasMessages = computed(() => store.messages.length > 0);

watch(
  hasMessages,
  (has) => {
    if (has) {
      stopTypewriter();
      dynamicPlaceholder.value = '';
    } else {
      startTypewriter();
    }
  },
  { immediate: true },
);

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILES = 3;
const ACCEPTED_TYPES = ['.xlsx', '.xls', '.pdf'];

function isAcceptedFile(file: File): boolean {
  return ACCEPTED_TYPES.some((ext) => file.name.toLowerCase().endsWith(ext));
}

function processFiles(files: FileList | null): File[] {
  if (!files) return [];
  const fileArray = Array.from(files);
  const validFiles: File[] = [];

  for (const file of fileArray) {
    if (attachedFiles.value.length + validFiles.length >= MAX_FILES) {
      alert(`Максимум ${MAX_FILES} файла за раз`);
      break;
    }
    if (!isAcceptedFile(file)) {
      alert(`Файл "${file.name}" не поддерживается. Разрешены: Excel, PDF.`);
      continue;
    }
    if (file.size > MAX_FILE_SIZE) {
      alert(`Файл "${file.name}" слишком большой. Максимум 5MB.`);
      continue;
    }
    validFiles.push(file);
  }

  return validFiles;
}

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  const validFiles = processFiles(input.files);
  attachedFiles.value.push(...validFiles);
  if (fileInputRef.value) {
    fileInputRef.value.value = '';
  }
}

function handleDragOver(event: DragEvent) {
  event.preventDefault();
  event.stopPropagation();
  isDragOver.value = true;
}

function handleDragLeave(event: DragEvent) {
  event.preventDefault();
  event.stopPropagation();
  isDragOver.value = false;
}

function handleDrop(event: DragEvent) {
  event.preventDefault();
  event.stopPropagation();
  isDragOver.value = false;

  const files = event.dataTransfer?.files;
  const validFiles = processFiles(files ?? null);
  attachedFiles.value.push(...validFiles);
}

function removeFile(index: number) {
  attachedFiles.value.splice(index, 1);
}

async function handleSubmit() {
  if (
    (!inputText.value.trim() && attachedFiles.value.length === 0) ||
    isLoading.value
  )
    return;
  const text = inputText.value.trim();
  inputText.value = '';
  const files = attachedFiles.value.length ? attachedFiles.value : undefined;
  attachedFiles.value = [];
  adjustHeight();
  await store.sendMessage(text, files);
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSubmit();
  }
}

function adjustHeight() {
  nextTick(() => {
    const el = textareaRef.value;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  });
}

function getFileIcon(file: File): string {
  if (file.name.match(/\.(xlsx|xls)$/i))
    return 'pi pi-file-excel text-green-500';
  if (file.name.match(/\.pdf$/i)) return 'pi pi-file-pdf text-red-400';
  return 'pi pi-file text-secondary';
}
</script>

<template>
  <form
    class="relative bg-card border border-deep-border rounded-2xl p-2 md:p-4 mx-3 mb-3 transition-colors"
    :class="{ 'border-purple bg-purple/5': isDragOver }"
    @submit.prevent="handleSubmit"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
  >
    <!-- Drag overlay -->
    <div
      v-if="isDragOver"
      class="absolute inset-0 rounded-2xl flex flex-col items-center justify-center bg-card/95 z-10 pointer-events-none"
    >
      <i class="pi pi-upload text-2xl text-purple mb-2" />
      <span class="text-sm text-theme">Перетащите файлы сюда</span>
      <span class="text-xs text-secondary mt-1">Excel, PDF (до 5MB)</span>
    </div>

    <!-- Textarea -->
    <textarea
      ref="textareaRef"
      v-model="inputText"
      rows="1"
      :disabled="isLoading"
      class="w-full min-h-[28px] md:min-h-[72px] max-h-[240px] bg-transparent text-theme text-base resize-none outline-none border-none placeholder:text-secondary disabled:opacity-60"
      :placeholder="
        isFocused || hasMessages
          ? 'Напишите задачу для ИИ...'
          : dynamicPlaceholder
      "
      @keydown="handleKeydown"
      @input="adjustHeight"
      @focus="isFocused = true"
      @blur="isFocused = false"
    />

    <!-- Bottom toolbar -->
    <div class="flex items-center justify-between mt-1 md:mt-2">
      <!-- Left: file input + paperclip -->
      <div class="flex items-center gap-2">
        <input
          ref="fileInputRef"
          type="file"
          accept=".xlsx,.xls,.pdf"
          multiple
          class="hidden"
          @change="handleFileSelect"
        />
        <button
          type="button"
          class="flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-lg text-secondary hover:text-white transition-colors"
          :disabled="isLoading || attachedFiles.length >= MAX_FILES"
          @click="fileInputRef?.click()"
        >
          <i class="pi pi-paperclip text-sm" />
        </button>

        <!-- Attachment chips -->
        <div v-if="attachedFiles.length > 0" class="flex items-center gap-1.5">
          <div
            v-for="(file, idx) in attachedFiles"
            :key="file.name + idx"
            class="flex items-center gap-1 bg-elevated rounded-md px-2 py-1 text-xs text-theme"
          >
            <i :class="getFileIcon(file)" class="text-[10px]" />
            <span class="max-w-[100px] truncate">{{ file.name }}</span>
            <button
              type="button"
              class="text-secondary hover:text-red-400 ml-0.5 transition-colors"
              @click="removeFile(idx)"
            >
              <i class="pi pi-times text-[9px]" />
            </button>
          </div>
        </div>
      </div>

      <!-- Right: send/stop button -->
      <button
        v-if="isLoading"
        type="button"
        class="flex items-center justify-center w-8 h-8 md:w-9 md:h-9 rounded-xl bg-elevated text-theme hover:bg-red-500/20 hover:text-red-400 transition-colors"
        @click="store.stop"
      >
        <i class="pi pi-stop text-xs" />
      </button>
      <button
        v-else
        type="submit"
        class="flex items-center justify-center w-8 h-8 md:w-9 md:h-9 rounded-xl bg-purple text-white hover:bg-purple-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        :disabled="!hasInput"
      >
        <i class="pi pi-send text-xs" />
      </button>
    </div>
  </form>
</template>
