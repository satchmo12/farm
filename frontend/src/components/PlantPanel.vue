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
      <strong>{{ crop.label }}</strong>
      <span>{{ crop.description }}</span>
      <div class="seed-stages">
        <span
          v-for="(stageIcon, stageIndex) in crop.stages"
          :key="stageIcon + stageIndex"
          class="seed-stage"
        >
          {{ stageIcon }}
        </span>
      </div>
      <div class="seed-card__meta">
        <span>{{ crop.totalSeconds }}s 成熟</span>
        <span>库存 {{ crop.quantity }}</span>
      </div>
    </button>
  </div>

  <div v-else class="panel-empty">
    <strong>仓库里还没有种子</strong>
    <p>现在种植面板只展示你真正拥有的种子，先去商店买几颗再回来播种。</p>
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
