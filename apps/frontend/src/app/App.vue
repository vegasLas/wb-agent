<script setup lang="ts">
import { useCounterStore } from '../stores/counter';

const counter = useCounterStore();
</script>

<template>
  <div class="min-h-screen bg-gray-100 flex items-center justify-center">
    <div class="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
      <h1 class="text-3xl font-bold text-gray-800 mb-4 text-center">
        Vue 3 + Pinia + Tailwind
      </h1>
      
      <div class="text-center space-y-4">
        <p class="text-gray-600">
          Count: <span class="font-mono text-2xl text-blue-600">{{ counter.count }}</span>
        </p>
        <p class="text-gray-600">
          Double: <span class="font-mono text-2xl text-green-600">{{ counter.doubleCount }}</span>
        </p>
        
        <div class="flex gap-4 justify-center">
          <button 
            class="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
            @click="counter.decrement"
          >
            -
          </button>
          <button 
            class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
            @click="counter.increment"
          >
            +
          </button>
        </div>
      </div>
      
      <div class="mt-8 pt-4 border-t border-gray-200 text-center">
        <p class="text-sm text-gray-500">
          Powered by Nx Monorepo
        </p>
      </div>
    </div>
  </div>
</template>
