<template>
  <div class="warehouse-shell">
    <div class="warehouse-tabs">
      <button
        :class="['warehouse-tab', { 'warehouse-tab--active': warehouseTab === 'seed' }]"
        type="button"
        :disabled="panelBusy"
        @click="$emit('update:warehouse-tab', 'seed')"
      >
        种子 {{ totalSeedCount }}
      </button>
      <button
        :class="['warehouse-tab', { 'warehouse-tab--active': warehouseTab === 'crop' }]"
        type="button"
        :disabled="panelBusy"
        @click="$emit('update:warehouse-tab', 'crop')"
      >
        作物 {{ totalCropCount }}
      </button>
    </div>

    <div v-if="warehouseTab === 'seed' && warehouseSeeds.length > 0" class="warehouse-grid">
      <article
        v-for="crop in warehouseSeeds"
        :key="`seed-${crop.type}`"
        class="warehouse-card warehouse-card--compact"
      >
        <span class="warehouse-emoji">{{ crop.stages[3] }}</span>
        <strong :title="crop.name">{{ crop.name }}</strong>
        <div class="warehouse-card__meta warehouse-card__meta--compact">
          <span class="warehouse-count">x{{ crop.quantity }}</span>
        </div>
      </article>
    </div>

    <div v-else-if="warehouseTab === 'crop' && warehouseCrops.length > 0" class="warehouse-grid">
      <article
        v-for="crop in warehouseCrops"
        :key="`crop-${crop.type}`"
        class="warehouse-card warehouse-card--crop warehouse-card--compact"
      >
        <span class="warehouse-emoji">{{ crop.stages[3] }}</span>
        <strong :title="crop.name">{{ crop.name }}</strong>
        <div class="warehouse-card__meta warehouse-card__meta--compact">
          <span class="warehouse-count">x{{ crop.quantity }}</span>
          <span>+{{ crop.fruitPrice }}/份</span>
        </div>

        <button
          class="warehouse-action warehouse-action--compact"
          type="button"
          :disabled="panelBusy || crop.quantity <= 0"
          @click="$emit('sell', crop.type)"
        >
          出售
        </button>
      </article>
    </div>

    <div v-else class="panel-empty panel-empty--warehouse">
      <strong>{{ warehouseTab === "seed" ? "仓库里还没有种子" : "仓库里还没有作物" }}</strong>
      <p>
        {{
          warehouseTab === "seed"
            ? "先去商店买种子，买到的种子才会出现在这里。"
            : "成熟后收获的作物会先进入这里，再决定什么时候卖掉。"
        }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type {
  CropCatalogInventoryItem,
  CropType,
  WarehouseTab,
} from "../types";

defineProps<{
  warehouseTab: WarehouseTab;
  totalSeedCount: number;
  totalCropCount: number;
  warehouseSeeds: CropCatalogInventoryItem[];
  warehouseCrops: CropCatalogInventoryItem[];
  panelBusy: boolean;
}>();

defineEmits<{
  (event: "update:warehouse-tab", tab: WarehouseTab): void;
  (event: "sell", cropType: CropType): void;
}>();
</script>
