<template>
  <div v-if="ownedSeeds.length > 0" class="seed-grid">
    <button
      v-for="crop in ownedSeeds"
      :key="crop.type"
      class="seed-card seed-card--plant"
      type="button"
      :disabled="panelBusy"
      @click="$emit('plant', crop.type)"
    >
      <span class="seed-card__emoji">{{ crop.stages[3] }}</span>
      <strong :title="crop.name">{{ crop.name }}</strong>
      <div class="seed-card__chips seed-card__chips--compact">
        <span class="owned-chip">x{{ crop.quantity }}</span>
        <span class="owned-chip owned-chip--warm">{{ crop.growthDurationSeconds }}s</span>
      </div>
    </button>
  </div>

  <div v-else class="panel-empty">
    <strong>仓库里还没有种子</strong>
    <button class="panel-ghost-button" type="button" :disabled="panelBusy" @click="$emit('open-shop')">
      去商店购买
    </button>
  </div>
</template>

<script setup lang="ts">
import type { CropCatalogInventoryItem, CropType } from "../types";

defineProps<{
  ownedSeeds: CropCatalogInventoryItem[];
  panelBusy: boolean;
}>();

defineEmits<{
  (event: "plant", cropType: CropType): void;
  (event: "open-shop"): void;
}>();
</script>
