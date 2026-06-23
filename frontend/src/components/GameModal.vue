<template>
  <div
    :class="[
      'seed-panel-backdrop',
      { 'seed-panel-backdrop--centered': centered },
    ]"
    @click.self="$emit('close')"
  >
    <section :class="['seed-panel', { 'seed-panel--compact': compact }]">
      <div class="seed-panel__header">
        <div class="seed-panel__title">
          <p class="seed-kicker">{{ kicker }}</p>
          <h2>{{ title }}</h2>
        </div>

        <button class="close-button" type="button" aria-label="关闭弹窗" @click="$emit('close')">
          ×
        </button>
      </div>

      <slot />
    </section>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  centered: boolean;
  compact: boolean;
  kicker: string;
  title: string;
}>();

defineEmits<{
  (event: "close"): void;
}>();
</script>
