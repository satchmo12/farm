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
      <article v-for="crop in warehouseSeeds" :key="`seed-${crop.type}`" class="warehouse-card">
        <div class="warehouse-card__top">
          <span class="warehouse-emoji">{{ crop.stages[3] }}</span>
          <div>
            <strong>{{ crop.label }}</strong>
            <p>可直接出现在播种面板</p>
          </div>
        </div>

        <div class="warehouse-card__meta">
          <span class="warehouse-count">{{ crop.quantity }}</span>
          <span>库存种子</span>
        </div>
      </article>
    </div>

    <div v-else-if="warehouseTab === 'crop' && warehouseCrops.length > 0" class="warehouse-grid">
      <article
        v-for="crop in warehouseCrops"
        :key="`crop-${crop.type}`"
        class="warehouse-card warehouse-card--crop"
      >
        <div class="warehouse-card__top">
          <span class="warehouse-emoji">{{ crop.stages[3] }}</span>
          <div>
            <strong>{{ crop.label }}</strong>
          </div>
        </div>

        <div class="warehouse-card__meta">
          <span class="warehouse-count">{{ crop.quantity }}</span>
          <span>仓库存货</span>
        </div>

        <button
          class="warehouse-action"
          type="button"
          :disabled="panelBusy || crop.quantity <= 0"
          @click="$emit('sell', crop.type)"
        >
          {{ crop.quantity > 0 ? `出售 1 份 · +${crop.sellPrice} 金币` : "暂无可出售作物" }}
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
