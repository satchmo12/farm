<template>
  <div class="farm-app">
    <div class="game-shell">
      <div v-if="user" class="hud-overlay">
        <button class="player-medallion" type="button" :disabled="panelBusy" @click="openProfilePanel">
          <span class="player-medallion__avatar">{{ user.first_name.slice(0, 1) }}</span>
          <div class="player-medallion__meta">
            <strong>{{ user.first_name }}</strong>
            <p>Lv.{{ playerLevel }}</p>
            <div class="player-progress">
              <div class="player-progress__track">
                <span class="player-progress__fill" :style="{ width: `${experienceProgressPercent}%` }"></span>
              </div>
              <span class="player-progress__text">
                EXP {{ progression.progressInLevel }}/{{ progression.requiredExperience }}
              </span>
            </div>
          </div>
        </button>
      </div>

      <header class="hud-bar">
        <div class="resource-ribbon">
          <article class="resource-pill resource-pill--coin">
            <span class="resource-pill__icon">🪙</span>
            <div>
              <p>金币</p>
              <strong :class="['coin-total', { 'coin-total--bump': coinBump }]">
                {{ coin }}
              </strong>
            </div>
          </article>

          <!-- <article class="resource-pill">
            <span class="resource-pill__icon">🌱</span>
            <div>
              <p>种子</p>
              <strong>{{ totalSeedCount }}</strong>
            </div>
          </article> -->

         
        </div>
      </header>

      <div class="game-layout">


        <section class="scene-stage">
          <div class="scene-hint">
            <strong>{{ readyLandCount }} 块可收获</strong>
            <span>{{ growingLandCount }} 块正在成长</span>
            <button
              v-if="readyLandCount > 0"
              class="harvest-all-button"
              type="button"
              :disabled="panelBusy"
              @click="harvestAllReadyLands"
            >
              一键收获 {{ readyLandCount }} 块
            </button>
          </div>

          <p v-if="errorMessage" class="error-banner error-banner--floating">{{ errorMessage }}</p>

          <div
            ref="sceneViewportRef"
            :class="[
              'scene-viewport',
              {
                'scene-viewport--can-pan': canPanScene,
                'scene-viewport--dragging': isSceneDragging,
              },
            ]"
            @pointerdown="beginSceneDrag"
            @pointermove="moveSceneDrag"
            @pointerup="endSceneDrag"
            @pointercancel="endSceneDrag"
          >
            <div
              ref="sceneCanvasRef"
              :class="['scene-stage__canvas', { 'scene-stage__canvas--dragging': isSceneDragging }]"
              :style="sceneCanvasStyle"
            >
              <div class="farm-board">
                <div class="farm-grid">
                  <button v-for="(land, index) in lands" :key="index"
                    :class="['land-tile', `land-tile--${land.status}`, getCropClassName(land)]" type="button"
                    @click="handleLandClick(index)">
                    <span class="plot-id">#{{ String(index + 1).padStart(2, "0") }}</span>
                    <div class="crop-visual">
                      <span class="crop-icon">{{ getIcon(land) }}</span>
                      <span v-if="land.status === 'ready'" class="crop-badge">可收获</span>
                    </div>

                    <span v-for="burst in getBurstsForLand(index)" :key="burst.id" class="coin-burst">
                      {{ burst.label }}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <p v-if="canPanScene" class="scene-pan-note">左右拖动画面查看完整农场</p>
        </section>
      </div>

      <aside class="side-rail">
        <button class="rail-button" type="button" :disabled="panelBusy" @click="openShopPanel">
          <span class="rail-button__icon">🛒</span>
          <span>商店</span>
        </button>
        <button class="rail-button" type="button" :disabled="panelBusy" @click="openWarehousePanel">
          <span class="rail-button__icon">📦</span>
          <span>仓库</span>
        </button>
        <button class="rail-button" type="button" :disabled="panelBusy" @click="openCropWarehousePanel">
          <span class="rail-button__icon">🥕</span>
          <span>作物</span>
        </button>
      </aside>
    </div>

    <div
      v-if="activePanel"
      :class="[
        'seed-panel-backdrop',
        {
          'seed-panel-backdrop--centered':
            activePanel === 'growth' ||
            activePanel === 'profile' ||
            activePanel === 'shop' ||
            activePanel === 'warehouse',
        }
      ]"
      @click.self="closeActivePanel"
    >
      <section
        :class="[
          'seed-panel',
          {
            'seed-panel--compact':
              activePanel === 'growth' ||
              activePanel === 'profile' ||
              activePanel === 'shop' ||
              activePanel === 'warehouse',
          }
        ]"
      >
        <div class="seed-panel__header">
          <div v-if="activePanel === 'plant'">
            <p class="seed-kicker">准备播种</p>
            <h2>第 {{ (selectedLandIndex ?? 0) + 1 }} 号地块</h2>
          </div>

          <div v-else-if="activePanel === 'shop'">
            <p class="seed-kicker">商店</p>
          </div>

          <div v-else-if="activePanel === 'warehouse'">
            <p class="seed-kicker">仓库</p>
          </div>

          <div v-else-if="activePanel === 'profile'">
            <p class="seed-kicker">个人中心</p>
            <h2>{{ user?.first_name ?? "农场主" }}</h2>
          </div>

          <div v-else>
            <p class="seed-kicker">成长状态</p>
            <h2>{{ selectedGrowthLand ? getCropLabel(selectedGrowthLand.cropType) : "作物成长中" }}</h2>
          </div>

          <button class="close-button" type="button" aria-label="关闭弹窗" @click="closeActivePanel">
            ×
          </button>
        </div>

        <template v-if="activePanel === 'plant'">
          <div v-if="ownedSeeds.length > 0" class="seed-grid">
            <button v-for="crop in ownedSeeds" :key="crop.type" class="seed-card seed-card--plant" type="button"
              :disabled="panelBusy" @click="plantSelectedCrop(crop.type)">
              <span class="seed-card__emoji">{{ crop.stages[3] }}</span>
              <strong>{{ crop.label }}</strong>
              <span>{{ crop.description }}</span>
              <div class="seed-stages">
                <span v-for="(stageIcon, stageIndex) in crop.stages" :key="stageIcon + stageIndex" class="seed-stage">
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
            <button class="panel-ghost-button" type="button" :disabled="panelBusy" @click="openShopFromPlant">
              去商店购买
            </button>
          </div>
        </template>

        <div v-else-if="activePanel === 'shop'" class="seed-grid">
          <article v-for="crop in cropCatalog" :key="crop.type" class="seed-card seed-card--shop">
            <span class="seed-card__emoji">{{ crop.stages[3] }}</span>
            <strong>{{ crop.label }}</strong>
            <span>{{ crop.description }}</span>

            <div class="seed-card__chips">
              <span class="owned-chip">拥有 {{ getInventoryQuantity("seed", crop.type) }}</span>
              <span class="owned-chip owned-chip--warm">
                售价 {{ crop.seedPrice }} 金币
              </span>
            </div>

            <div class="seed-stages">
              <span v-for="(stageIcon, stageIndex) in crop.stages" :key="stageIcon + stageIndex" class="seed-stage">
                {{ stageIcon }}
              </span>
            </div>

            <div class="seed-card__meta">
              <span>{{ crop.totalSeconds }}s 成熟</span>
              <span>卖出 {{ crop.sellPrice }} 金币</span>
            </div>

            <button class="seed-buy-button" type="button" :disabled="panelBusy || coin < crop.seedPrice"
              @click="buySeed(crop.type)">
              {{ coin >= crop.seedPrice ? "购买 1 颗" : "金币不足" }}
            </button>
          </article>
        </div>

        <div v-else-if="activePanel === 'warehouse'" class="warehouse-shell">
          <div class="warehouse-tabs">
            <button :class="['warehouse-tab', { 'warehouse-tab--active': warehouseTab === 'seed' }]" type="button"
              :disabled="panelBusy" @click="warehouseTab = 'seed'">
              种子 {{ totalSeedCount }}
            </button>
            <button :class="['warehouse-tab', { 'warehouse-tab--active': warehouseTab === 'crop' }]" type="button"
              :disabled="panelBusy" @click="warehouseTab = 'crop'">
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
                <span class="warehouse-count">
                  {{ getInventoryQuantity("seed", crop.type) }}
                </span>
                <span>库存种子</span>
              </div>
            </article>
          </div>

          <div v-else-if="warehouseTab === 'crop' && warehouseCrops.length > 0" class="warehouse-grid">
            <article v-for="crop in warehouseCrops" :key="`crop-${crop.type}`"
              class="warehouse-card warehouse-card--crop">
              <div class="warehouse-card__top">
                <span class="warehouse-emoji">{{ crop.stages[3] }}</span>
                <div>
                  <strong>{{ crop.label }}</strong>
                </div>
              </div>

              <div class="warehouse-card__meta">
                <span class="warehouse-count">
                  {{ getInventoryQuantity("crop", crop.type) }}
                </span>
                <span>仓库存货</span>
              </div>

              <button class="warehouse-action" type="button"
                :disabled="panelBusy || getInventoryQuantity('crop', crop.type) <= 0"
                @click="sellStoredCrop(crop.type)">
                {{
                  getInventoryQuantity("crop", crop.type) > 0
                    ? `出售 1 份 · +${crop.sellPrice} 金币`
                    : "暂无可出售作物"
                }}
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

        <div v-else-if="activePanel === 'profile'" class="profile-panel">
          <div class="profile-panel__hero">
            <span class="profile-panel__avatar">{{ user?.first_name?.slice(0, 1) ?? "F" }}</span>
            <div>
              <strong>Lv.{{ playerLevel }} 农场主</strong>
              <p>@{{ user?.username || `user_${user?.id ?? "farm"}` }}</p>
            </div>
          </div>

          <div class="profile-progress-card">
            <div class="profile-progress-card__top">
              <span>经验进度</span>
              <strong>{{ progression.progressInLevel }}/{{ progression.requiredExperience }}</strong>
            </div>
            <div class="profile-progress-card__track">
              <span class="profile-progress-card__fill" :style="{ width: `${experienceProgressPercent}%` }"></span>
            </div>
            <p>总经验 {{ progression.experience }}，距离 Lv.{{ playerLevel + 1 }} 还差 {{ experienceRemaining }}</p>
          </div>

          <div class="profile-stats">
            <article class="profile-stat">
              <span>金币</span>
              <strong>{{ coin }}</strong>
            </article>
            <article class="profile-stat">
              <span>种子库存</span>
              <strong>{{ totalSeedCount }}</strong>
            </article>
            <article class="profile-stat">
              <span>作物库存</span>
              <strong>{{ totalCropCount }}</strong>
            </article>
          </div>
        </div>

        <div v-else-if="selectedGrowthLand" class="growth-panel">
          <div class="growth-panel__hero">
            <span class="growth-panel__emoji">{{ getIcon(selectedGrowthLand) }}</span>
            <div>
              <strong>{{ getCropLabel(selectedGrowthLand.cropType) }}</strong>
              <p>第 {{ selectedGrowthLand.stage }} 阶段，距离成熟还有 {{ formatRemain(selectedGrowthLand.remain) }}</p>
            </div>
          </div>

          <div class="growth-panel__meter">
            <article
              v-for="(stageIcon, stageIndex) in getGrowthStageIcons(selectedGrowthLand.cropType)"
              :key="stageIcon + stageIndex"
              :class="['growth-stage', { 'growth-stage--active': stageIndex + 1 <= selectedGrowthLand.stage }]"
            >
              <span class="growth-stage__icon">{{ stageIcon }}</span>
              <strong>阶段 {{ stageIndex + 1 }}</strong>
            </article>
          </div>

          <div class="growth-panel__facts">
            <article class="growth-fact">
              <span>成长进度</span>
              <strong>{{ getGrowthPercent(selectedGrowthLand) }}%</strong>
            </article>
            <article class="growth-fact">
              <span>成熟时间</span>
              <strong>{{ selectedGrowthLand.growthDurationSeconds }}s</strong>
            </article>
          </div>

          <p class="growth-panel__hint">作物成熟后，再点击地块就会直接收获进仓库。</p>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import {
  buySeedApi,
  harvestAllApi,
  harvestApi,
  plantApi,
  sellCropApi,
  tgLogin,
} from "./api";
import type {
  CropType,
  Inventory,
  InventoryEntry,
  Land,
  Progression,
  TelegramUser,
} from "./types";
import { getTelegramUser, getTelegramUserErrorReason } from "./utils/telegram";

const LAND_COUNT = 24;

type PanelType = "plant" | "shop" | "warehouse" | "growth" | "profile";
type WarehouseTab = "seed" | "crop";

interface CropCatalogItem {
  type: CropType;
  label: string;
  description: string;
  totalSeconds: number;
  seedPrice: number;
  sellPrice: number;
  stages: [string, string, string, string];
}

const cropCatalog: CropCatalogItem[] = [
  {
    type: "wheat",
    label: "金穗小麦",
    description: "成熟快，适合快速滚动种植节奏。",
    totalSeconds: 24,
    seedPrice: 6,
    sellPrice: 12,
    stages: ["·", "🌱", "🌿", "🌾"],
  },
  {
    type: "corn",
    label: "甜芯玉米",
    description: "中等周期，适合稳定屯货出售。",
    totalSeconds: 36,
    seedPrice: 10,
    sellPrice: 18,
    stages: ["·", "🌱", "🌿", "🌽"],
  },
  {
    type: "tomato",
    label: "红果番茄",
    description: "成熟慢一点，但卖价最高。",
    totalSeconds: 48,
    seedPrice: 14,
    sellPrice: 26,
    stages: ["·", "🌱", "🪴", "🍅"],
  },
];

interface FloatingBurst {
  id: number;
  label: string;
  landIndex: number;
}

const user = ref<TelegramUser | null>(null);
const errorMessage = ref("");
const coin = ref(0);
const coinBump = ref(false);
const activePanel = ref<PanelType | null>(null);
const warehouseTab = ref<WarehouseTab>("seed");
const selectedLandIndex = ref<number | null>(null);
const panelBusy = ref(false);
const lands = reactive<Land[]>(createEmptyFarm());
const inventory = ref<Inventory>(createEmptyInventory());
const progression = ref<Progression>(createEmptyProgression());
const harvestBursts = ref<FloatingBurst[]>([]);
const sceneViewportRef = ref<HTMLElement | null>(null);
const sceneCanvasRef = ref<HTMLElement | null>(null);
const sceneOffsetX = ref(0);
const canPanScene = ref(false);
const sceneMinOffsetX = ref(0);
const sceneMaxOffsetX = ref(0);
const draggingPointerId = ref<number | null>(null);
const dragStartX = ref(0);
const dragOriginX = ref(0);
const dragMoved = ref(false);
const suppressLandClickUntil = ref(0);

const totalSeedCount = computed(() =>
  inventory.value.seeds.reduce((total, entry) => total + entry.quantity, 0)
);
const totalCropCount = computed(() =>
  inventory.value.crops.reduce((total, entry) => total + entry.quantity, 0)
);
const playerLevel = computed(() => progression.value.level);
const experienceProgressPercent = computed(() =>
  Math.max(
    0,
    Math.min(
      100,
      Math.round((progression.value.progressInLevel / progression.value.requiredExperience) * 100)
    )
  )
);
const experienceRemaining = computed(() =>
  Math.max(0, progression.value.requiredExperience - progression.value.progressInLevel)
);
const readyLandCount = computed(
  () => lands.filter((land) => land.status === "ready").length
);
const growingLandCount = computed(
  () => lands.filter((land) => land.status === "growing").length
);
const ownedSeeds = computed(() =>
  cropCatalog
    .map((crop) => ({
      ...crop,
      quantity: getInventoryQuantity("seed", crop.type),
    }))
    .filter((crop) => crop.quantity > 0)
);
const warehouseSeeds = computed(() =>
  cropCatalog.filter((crop) => getInventoryQuantity("seed", crop.type) > 0)
);
const warehouseCrops = computed(() =>
  cropCatalog.filter((crop) => getInventoryQuantity("crop", crop.type) > 0)
);
const selectedGrowthLand = computed(() => {
  if (activePanel.value !== "growth" || selectedLandIndex.value === null) {
    return null;
  }

  return lands[selectedLandIndex.value] ?? null;
});
const isSceneDragging = computed(() => draggingPointerId.value !== null);
const sceneCanvasStyle = computed(() => ({
  transform: `translateX(${sceneOffsetX.value}px)`,
}));

let progressTimer: number | null = null;
let coinAnimationTimer: number | null = null;
let burstId = 0;
const burstTimers = new Set<number>();

function createEmptyLand(): Land {
  return {
    status: "empty",
    remain: 0,
    cropType: null,
    stage: 0,
    plantedAt: null,
    growthDurationSeconds: 0,
  };
}

function createEmptyFarm(): Land[] {
  return Array.from({ length: LAND_COUNT }, () => createEmptyLand());
}

function createEmptyInventory(): Inventory {
  return {
    seeds: createInventoryEntries(),
    crops: createInventoryEntries(),
  };
}

function createEmptyProgression(): Progression {
  return {
    experience: 0,
    level: 1,
    currentLevelExperience: 0,
    nextLevelExperience: 60,
    progressInLevel: 0,
    requiredExperience: 60,
  };
}

function createInventoryEntries(source?: InventoryEntry[] | null): InventoryEntry[] {
  const quantities = new Map<CropType, number>();

  for (const entry of source ?? []) {
    quantities.set(entry.cropType, Math.max(0, entry.quantity || 0));
  }

  return cropCatalog.map((crop) => ({
    cropType: crop.type,
    quantity: quantities.get(crop.type) ?? 0,
  }));
}

function normalizeInventory(next?: Partial<Inventory> | null): Inventory {
  return {
    seeds: createInventoryEntries(next?.seeds),
    crops: createInventoryEntries(next?.crops),
  };
}

function replaceInventory(next?: Partial<Inventory> | null) {
  inventory.value = normalizeInventory(next);
}

function replaceProgression(next?: Partial<Progression> | null) {
  progression.value = {
    ...createEmptyProgression(),
    ...next,
  };
}

function getInventoryQuantity(itemType: WarehouseTab, cropType: CropType) {
  const bucket = itemType === "seed" ? inventory.value.seeds : inventory.value.crops;

  return bucket.find((entry) => entry.cropType === cropType)?.quantity ?? 0;
}

function normalizeLand(land?: Partial<Land> | null): Land {
  const cropType = land?.cropType ?? null;
  const plantedAt = land?.plantedAt ?? null;
  const growthDurationSeconds =
    typeof land?.growthDurationSeconds === "number"
      ? Math.max(0, land.growthDurationSeconds)
      : 0;

  if (!cropType || !plantedAt || growthDurationSeconds <= 0) {
    return createEmptyLand();
  }

  const plantedAtMs = Date.parse(plantedAt);

  if (Number.isNaN(plantedAtMs)) {
    return createEmptyLand();
  }

  const elapsedSeconds = Math.max(
    0,
    Math.floor((Date.now() - plantedAtMs) / 1000)
  );
  const remain = Math.max(0, growthDurationSeconds - elapsedSeconds);
  const status = remain === 0 ? "ready" : "growing";
  const stage = getGrowthStage(elapsedSeconds, growthDurationSeconds, status);

  return {
    status,
    remain,
    cropType,
    stage,
    plantedAt,
    growthDurationSeconds,
  };
}

function getGrowthStage(
  elapsedSeconds: number,
  totalSeconds: number,
  status: Land["status"]
): Land["stage"] {
  if (status === "empty") {
    return 0;
  }

  if (status === "ready") {
    return 4;
  }

  const safeTotal = Math.max(1, totalSeconds);
  const progress = Math.min(0.999, elapsedSeconds / safeTotal);
  const stage = Math.floor(progress * 4) + 1;

  return Math.min(4, Math.max(1, stage)) as Land["stage"];
}

function syncLandProgress(land: Land) {
  Object.assign(land, normalizeLand(land));
}

function replaceFarm(nextLands: Land[]) {
  const normalized = Array.from({ length: LAND_COUNT }, (_, index) =>
    normalizeLand(nextLands[index])
  );

  lands.splice(0, lands.length, ...normalized);
}

function setPanelScrollLock(locked: boolean) {
  document.documentElement.classList.toggle("panel-open", locked);
  document.body.classList.toggle("panel-open", locked);
}

function clampSceneOffset(nextOffset: number) {
  return Math.min(
    sceneMaxOffsetX.value,
    Math.max(sceneMinOffsetX.value, nextOffset)
  );
}

function getCenteredSceneOffset(viewportWidth: number, canvasWidth: number) {
  if (canvasWidth <= viewportWidth) {
    return 0;
  }

  return Math.round((viewportWidth - canvasWidth) / 2);
}

function syncScenePanBounds(recenter = false) {
  const viewportWidth = sceneViewportRef.value?.clientWidth ?? 0;
  const canvasWidth = sceneCanvasRef.value?.scrollWidth ?? 0;

  if (!viewportWidth || !canvasWidth) {
    return;
  }

  const shouldPan = canvasWidth > viewportWidth + 2;

  canPanScene.value = shouldPan;
  sceneMinOffsetX.value = shouldPan ? viewportWidth - canvasWidth : 0;
  sceneMaxOffsetX.value = 0;

  if (!shouldPan) {
    sceneOffsetX.value = 0;
    return;
  }

  if (recenter) {
    sceneOffsetX.value = clampSceneOffset(
      getCenteredSceneOffset(viewportWidth, canvasWidth)
    );
    return;
  }

  sceneOffsetX.value = clampSceneOffset(sceneOffsetX.value);
}

function handleSceneResize() {
  syncScenePanBounds(true);
}

function beginSceneDrag(event: PointerEvent) {
  if (!canPanScene.value || activePanel.value !== null) {
    return;
  }

  draggingPointerId.value = event.pointerId;
  dragStartX.value = event.clientX;
  dragOriginX.value = sceneOffsetX.value;
  dragMoved.value = false;

  sceneViewportRef.value?.setPointerCapture(event.pointerId);
}

function moveSceneDrag(event: PointerEvent) {
  if (draggingPointerId.value !== event.pointerId) {
    return;
  }

  const deltaX = event.clientX - dragStartX.value;

  if (Math.abs(deltaX) > 6) {
    dragMoved.value = true;
  }

  sceneOffsetX.value = clampSceneOffset(dragOriginX.value + deltaX);
}

function endSceneDrag(event: PointerEvent) {
  if (draggingPointerId.value !== event.pointerId) {
    return;
  }

  if (dragMoved.value) {
    suppressLandClickUntil.value = Date.now() + 180;
  }

  if (sceneViewportRef.value?.hasPointerCapture(event.pointerId)) {
    sceneViewportRef.value.releasePointerCapture(event.pointerId);
  }
  draggingPointerId.value = null;
  dragMoved.value = false;
}

function openShopPanel() {
  warehouseTab.value = "seed";
  selectedLandIndex.value = null;
  activePanel.value = "shop";
}

function openWarehousePanel() {
  warehouseTab.value = "seed";
  selectedLandIndex.value = null;
  activePanel.value = "warehouse";
}

function openCropWarehousePanel() {
  warehouseTab.value = "crop";
  selectedLandIndex.value = null;
  activePanel.value = "warehouse";
}

function openProfilePanel() {
  selectedLandIndex.value = null;
  activePanel.value = "profile";
}

function openShopFromPlant() {
  if (panelBusy.value) {
    return;
  }

  openShopPanel();
}

function closeActivePanel() {
  if (panelBusy.value) {
    return;
  }

  activePanel.value = null;
  selectedLandIndex.value = null;
}

function forceCloseActivePanel() {
  activePanel.value = null;
  selectedLandIndex.value = null;
}

function handleTick() {
  for (const land of lands) {
    if (land.status !== "empty") {
      syncLandProgress(land);
    }
  }
}

async function handleLandClick(index: number) {
  const land = lands[index];

  if (
    !user.value ||
    panelBusy.value ||
    Date.now() < suppressLandClickUntil.value
  ) {
    return;
  }

  if (land.status === "empty") {
    selectedLandIndex.value = index;
    activePanel.value = "plant";
    return;
  }

  if (land.status === "growing") {
    selectedLandIndex.value = index;
    activePanel.value = "growth";
    return;
  }

  if (land.status === "ready") {
    await harvestLand(index);
  }
}

async function buySeed(cropType: CropType) {
  if (!user.value) {
    return;
  }

  panelBusy.value = true;
  errorMessage.value = "";

  try {
    const response = await buySeedApi(user.value.id, cropType, 1);

    coin.value = response.coin;
    replaceProgression(response.progression);
    replaceInventory(response.inventory);
    bumpCoinCounter();
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : "购买失败，请稍后再试。";
  } finally {
    panelBusy.value = false;
  }
}

async function plantSelectedCrop(cropType: CropType) {
  if (selectedLandIndex.value === null || !user.value) {
    return;
  }

  panelBusy.value = true;
  errorMessage.value = "";

  try {
    const response = await plantApi(user.value.id, selectedLandIndex.value, cropType);

    lands.splice(selectedLandIndex.value, 1, normalizeLand(response.land));
    coin.value = response.coin;
    replaceProgression(response.progression);
    replaceInventory(response.inventory);
    forceCloseActivePanel();
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : "播种失败，请稍后再试。";
  } finally {
    panelBusy.value = false;
  }
}

async function harvestLand(index: number) {
  if (!user.value) {
    return;
  }

  errorMessage.value = "";

  try {
    const response = await harvestApi(user.value.id, index);

    lands.splice(index, 1, normalizeLand(response.land));
    coin.value = response.coin;
    replaceProgression(response.progression);
    replaceInventory(response.inventory);
    launchHarvestBurst(
      index,
      `+${response.harvested.quantity} ${getCropLabel(response.harvested.cropType)} · +${response.gainedExperience} EXP`
    );
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : "收获失败，请稍后再试。";
  }
}

async function harvestAllReadyLands() {
  if (!user.value || readyLandCount.value <= 0) {
    return;
  }

  panelBusy.value = true;
  errorMessage.value = "";

  try {
    const response = await harvestAllApi(user.value.id);

    coin.value = response.coin;
    replaceProgression(response.progression);
    replaceInventory(response.inventory);
    replaceFarm(response.lands);

    for (const entry of response.harvested) {
      launchHarvestBurst(
        entry.position,
        `+${entry.quantity} ${getCropLabel(entry.cropType)}`
      );
    }
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : "一键收获失败，请稍后再试。";
  } finally {
    panelBusy.value = false;
  }
}

async function sellStoredCrop(cropType: CropType) {
  if (!user.value) {
    return;
  }

  panelBusy.value = true;
  errorMessage.value = "";

  try {
    const response = await sellCropApi(user.value.id, cropType, 1);

    coin.value = response.coin;
    replaceProgression(response.progression);
    replaceInventory(response.inventory);
    bumpCoinCounter();
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : "出售失败，请稍后再试。";
  } finally {
    panelBusy.value = false;
  }
}

function bumpCoinCounter() {
  coinBump.value = false;

  if (coinAnimationTimer !== null) {
    window.clearTimeout(coinAnimationTimer);
  }

  window.requestAnimationFrame(() => {
    coinBump.value = true;
    coinAnimationTimer = window.setTimeout(() => {
      coinBump.value = false;
      coinAnimationTimer = null;
    }, 520);
  });
}

function launchHarvestBurst(landIndex: number, label: string) {
  const id = ++burstId;

  harvestBursts.value.push({
    id,
    landIndex,
    label,
  });

  const timer = window.setTimeout(() => {
    harvestBursts.value = harvestBursts.value.filter((burst) => burst.id !== id);
    burstTimers.delete(timer);
  }, 950);

  burstTimers.add(timer);
}

function getBurstsForLand(index: number) {
  return harvestBursts.value.filter((burst) => burst.landIndex === index);
}

function getCropMeta(cropType: CropType | null) {
  return cropCatalog.find((crop) => crop.type === cropType) ?? null;
}

function getCropLabel(cropType: CropType | null) {
  return getCropMeta(cropType)?.label ?? "空地";
}

function getCropClassName(land: Land) {
  if (!land.cropType) {
    return "land-tile--plain";
  }

  return `land-tile--${land.cropType}`;
}

function getIcon(land: Land) {
  if (land.status === "empty") {
    return "＋";
  }

  const crop = getCropMeta(land.cropType);

  if (!crop) {
    return "＋";
  }

  const iconIndex = Math.max(0, land.stage - 1);

  return crop.stages[iconIndex] ?? crop.stages[0];
}

function getGrowthPercent(land: Land) {
  if (land.status === "empty" || land.growthDurationSeconds <= 0) {
    return 0;
  }

  const completed = Math.max(0, land.growthDurationSeconds - land.remain);
  const progress = (completed / land.growthDurationSeconds) * 100;

  return Math.max(0, Math.min(100, Math.round(progress)));
}

function getGrowthStageIcons(cropType: CropType | null) {
  return (getCropMeta(cropType)?.stages ?? ["🌰", "🌱", "🌿", "✨"]).map(
    (icon, index) => (index === 0 && icon === "·" ? "🌰" : icon)
  );
}

function formatRemain(remain: number) {
  const minutes = Math.floor(remain / 60);
  const seconds = remain % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

onMounted(async () => {
  progressTimer = window.setInterval(handleTick, 1000);
  window.addEventListener("resize", handleSceneResize);

  await nextTick();
  syncScenePanBounds(true);

  const tgUser = getTelegramUser();

  if (!tgUser) {
    errorMessage.value = `没有读取到 Telegram 用户信息，请从 Telegram 里重新打开。${getTelegramUserErrorReason()}`;
    return;
  }

  user.value = tgUser;

  try {
    const result = await tgLogin(tgUser);

    user.value = result.profile.user;
    coin.value = result.profile.coin;
    replaceProgression(result.profile.progression);
    replaceInventory(result.profile.inventory);
    replaceFarm(result.profile.lands);
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : "登录失败，请稍后再试。";
  }
});

watch(activePanel, (value) => {
  setPanelScrollLock(value !== null);
});

onUnmounted(() => {
  setPanelScrollLock(false);
  window.removeEventListener("resize", handleSceneResize);

  if (progressTimer !== null) {
    window.clearInterval(progressTimer);
  }

  if (coinAnimationTimer !== null) {
    window.clearTimeout(coinAnimationTimer);
  }

  for (const timer of burstTimers) {
    window.clearTimeout(timer);
  }

  burstTimers.clear();
});
</script>
