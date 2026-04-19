import { ref, onMounted, onUnmounted } from 'vue';

export interface UseTypewriterOptions {
  /** Milliseconds between each character typed */
  typingSpeed?: number;
  /** Milliseconds between each character deleted */
  deleteSpeed?: number;
  /** Milliseconds to pause after fully typing a string */
  pauseAfterType?: number;
  /** Milliseconds to pause after fully deleting a string */
  pauseAfterDelete?: number;
}

export function useTypewriterPlaceholder(
  strings: string[],
  options: UseTypewriterOptions = {},
) {
  const {
    typingSpeed = 60,
    deleteSpeed = 30,
    pauseAfterType = 2000,
    pauseAfterDelete = 500,
  } = options;

  const placeholder = ref('');
  const isTyping = ref(false);

  let currentIndex = 0;
  let currentChar = 0;
  let isDeleting = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let active = false;

  function tick() {
    if (!active || strings.length === 0) return;

    const currentString = strings[currentIndex];

    if (!isDeleting) {
      // Typing phase
      if (currentChar < currentString.length) {
        currentChar++;
        placeholder.value = currentString.slice(0, currentChar);
        isTyping.value = true;
        timer = setTimeout(tick, typingSpeed);
      } else {
        // Finished typing, pause
        isTyping.value = false;
        timer = setTimeout(() => {
          isDeleting = true;
          tick();
        }, pauseAfterType);
      }
    } else {
      // Deleting phase
      if (currentChar > 0) {
        currentChar--;
        placeholder.value = currentString.slice(0, currentChar);
        isTyping.value = true;
        timer = setTimeout(tick, deleteSpeed);
      } else {
        // Finished deleting, move to next string
        isDeleting = false;
        currentIndex = (currentIndex + 1) % strings.length;
        isTyping.value = false;
        timer = setTimeout(tick, pauseAfterDelete);
      }
    }
  }

  function start() {
    if (active) return;
    active = true;
    currentIndex = 0;
    currentChar = 0;
    isDeleting = false;
    placeholder.value = '';
    tick();
  }

  function stop() {
    active = false;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  onMounted(() => {
    start();
  });

  onUnmounted(() => {
    stop();
  });

  return {
    placeholder,
    isTyping,
    start,
    stop,
  };
}
