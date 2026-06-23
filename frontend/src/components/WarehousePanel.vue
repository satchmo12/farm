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
      <button
        v-for="crop in warehouseCrops"
        :key="`crop-${crop.type}`"
        :class="[
          'warehouse-card',
          'warehouse-card--crop',
          'warehouse-card--compact',
          'warehouse-card--selectable',
          { 'warehouse-card--selected': isSelected(crop.type) },
        ]"
        type="button"
        :disabled="panelBusy"
        @click="$emit('toggle-select', crop.type)"
      >
        <span v-if="isSelected(crop.type)" class="warehouse-card__badge">已选</span>
        <span class="warehouse-emoji">{{ crop.stages[3] }}</span>
        <strong :title="crop.name">{{ crop.name }}</strong>
        <div class="warehouse-card__meta warehouse-card__meta--compact">
          <span class="warehouse-count">x{{ crop.quantity }}</span>
          <span>+{{ crop.fruitPrice }}/份</span>
        </div>
      </button>
    </div>

    <div
      v-if="warehouseTab === 'crop' && warehouseCrops.length > 0"
      class="warehouse-footer"
    >
      <p class="warehouse-footer__summary">
        {{ selectedCropTypes.length > 0 ? `已选 ${selectedCropTypes.length} 种作物` : "请选择要出售的作物" }}
      </p>

      <div class="warehouse-footer__actions">
        <button
          class="panel-ghost-button warehouse-footer__button"
          type="button"
          :disabled="panelBusy"
          @click="$emit('toggle-select-all')"
        >
          {{ allCropsSelected ? "取消全选" : "全选" }}
        </button>

        <button
          class="warehouse-action warehouse-footer__button"
          type="button"
          :disabled="panelBusy || selectedCropTypes.length === 0"
          @click="$emit('sell-selected')"
        >
          全部卖出
        </button>
      </div>
    </div>

    <div
      v-if="warehouseTab === 'seed' ? warehouseSeeds.length === 0 : warehouseCrops.length === 0"
      class="panel-empty panel-empty--warehouse"
    >
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

const props = defineProps<{
  warehouseTab: WarehouseTab;
  totalSeedCount: number;
  totalCropCount: number;
  warehouseSeeds: CropCatalogInventoryItem[];
  warehouseCrops: CropCatalogInventoryItem[];
  selectedCropTypes: CropType[];
  allCropsSelected: boolean;
  panelBusy: boolean;
}>();

defineEmits<{
  (event: "update:warehouse-tab", tab: WarehouseTab): void;
  (event: "toggle-select", cropType: CropType): void;
  (event: "toggle-select-all"): void;
  (event: "sell-selected"): void;
}>();

function isSelected(cropType: CropType) {
  return props.selectedCropTypes.includes(cropType);
}
</script>
