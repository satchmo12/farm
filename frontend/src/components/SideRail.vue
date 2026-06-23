<template>
  <aside class="side-rail">
    <button class="rail-button" type="button" :disabled="panelBusy" @click="$emit('open-shop')">
      <span class="rail-button__icon">🛒</span>
      <span>商店</span>
    </button>
    <button
      class="rail-button"
      type="button"
      :disabled="panelBusy"
      @click="$emit('open-warehouse')"
    >
      <span class="rail-button__icon">📦</span>
      <span>仓库</span>
    </button>
    <button
      class="rail-button"
      type="button"
      :disabled="panelBusy"
      @click="$emit('open-crops')"
    >
      <span class="rail-button__icon">🥕</span>
      <span>作物</span>
    </button>
    <button
      class="rail-button"
      type="button"
      :disabled="panelBusy"
      @click="$emit('open-social')"
    >
      <span class="rail-button__icon">👥</span>
      <span>好友</span>
    </button>
  </aside>
</template>

<script setup lang="ts">
defineProps<{
  panelBusy: boolean;
}>();

defineEmits<{
  (event: "open-shop"): void;
  (event: "open-warehouse"): void;
  (event: "open-crops"): void;
  (event: "open-social"): void;
}>();
</script>
