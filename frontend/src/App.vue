<template>
  <div class="farm-app">
    <section class="hero-shell">
      <div class="hero-copy">
        <p class="eyebrow">Farm Season</p>
        <h1>先去商店买种子，再让 24 块地一起结果。</h1>
        <p class="hero-text">
          空地点击播种，只会展示你仓库里真正拥有的种子。成熟后收获进仓库，再把作物卖成金币继续循环。
        </p>
      </div>

      <div class="hero-stats">
        <article class="stat-card stat-card--coin">
          <span class="stat-label">金币仓</span>
          <strong :class="['coin-total', { 'coin-total--bump': coinBump }]">
            {{ coin }}
          </strong>
          <span class="stat-hint">商店买种、仓库卖货都走这里</span>
        </article>

        <article class="stat-card">
          <span class="stat-label">仓库概览</span>
          <strong>{{ totalSeedCount }} / {{ totalCropCount }}</strong>
          <div class="stat-stack">
            <span>种子 {{ totalSeedCount }}</span>
            <span>作物 {{ totalCropCount }}</span>
          </div>
        </article>

        <article class="stat-card">
          <span class="stat-label">农场规模</span>
          <strong>24 块地</strong>
          <span class="stat-hint">四阶段成长，成熟后点击收获</span>
        </article>
      </div>
    </section>

    <section class="farm-shell">
      <header class="farm-toolbar">
        <div v-if="user" class="hero-user">
          <span class="avatar">{{ user.first_name.slice(0, 1) }}</span>
          <div>
            <strong>{{ user.first_name }}</strong>
            <p>@{{ user.username || `user_${user.id}` }}</p>
          </div>
        </div>

        <div class="toolbar-actions">
          <button
            class="action-button"
            type="button"
            :disabled="panelBusy"
            @click="openShopPanel"
          >
            商店
          </button>
          <button
            class="action-button action-button--warehouse"
            type="button"
            :disabled="panelBusy"
            @click="openWarehousePanel"
          >
            仓库
          </button>
        </div>
      </header>

      <p v-if="errorMessage" class="error-banner">{{ errorMessage }}</p>

      <div class="farm-grid">
        <button
          v-for="(land, index) in lands"
          :key="index"
          :class="['land-tile', `land-tile--${land.status}`, getCropClassName(land)]"
          type="button"
          @click="handleLandClick(index)"
        >
          <span class="plot-id">#{{ String(index + 1).padStart(2, "0") }}</span>
          <span class="plot-stage">
            {{ land.status === "empty" ? "空地" : `第 ${land.stage} 阶段` }}
          </span>

          <div class="crop-visual">
            <span class="crop-icon">{{ getIcon(land) }}</span>
            <span v-if="land.status !== 'empty'" class="crop-name">
              {{ getCropLabel(land.cropType) }}
            </span>
          </div>

          <div class="land-meta">
            <span class="land-status">{{ getLandStatusText(land) }}</span>
            <span class="land-time">
              {{
                land.status === "growing"
                  ? `${formatRemain(land.remain)} 后成熟`
                  : getLandActionText(land)
              }}
            </span>
          </div>

          <div v-if="land.status !== 'empty'" class="stage-bar">
            <span
              v-for="stage in 4"
              :key="stage"
              :class="['stage-dot', { 'stage-dot--active': stage <= land.stage }]"
            />
          </div>

          <span
            v-for="burst in getBurstsForLand(index)"
            :key="burst.id"
            class="coin-burst"
          >
            {{ burst.label }}
          </span>
        </button>
      </div>
    </section>

    <div
      v-if="activePanel"
      class="seed-panel-backdrop"
      @click.self="closeActivePanel"
    >
      <section class="seed-panel">
        <div class="seed-panel__header">
          <div v-if="activePanel === 'plant'">
            <p class="seed-kicker">准备播种</p>
            <h2>第 {{ (selectedLandIndex ?? 0) + 1 }} 号地块</h2>
          </div>

          <div v-else-if="activePanel === 'shop'">
            <p class="seed-kicker">商店</p>
            <h2>购买种子</h2>
          </div>

          <div v-else>
            <p class="seed-kicker">仓库</p>
            <h2>查看种子和作物</h2>
          </div>

          <button class="close-button" type="button" @click="closeActivePanel">
            关闭
          </button>
        </div>

        <template v-if="activePanel === 'plant'">
          <div v-if="ownedSeeds.length > 0" class="seed-grid">
            <button
              v-for="crop in ownedSeeds"
              :key="crop.type"
              class="seed-card seed-card--plant"
              type="button"
              :disabled="panelBusy"
              @click="plantSelectedCrop(crop.type)"
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
            <button
              class="panel-ghost-button"
              type="button"
              :disabled="panelBusy"
              @click="openShopFromPlant"
            >
              去商店购买
            </button>
          </div>
        </template>

        <div v-else-if="activePanel === 'shop'" class="seed-grid">
          <article
            v-for="crop in cropCatalog"
            :key="crop.type"
            class="seed-card seed-card--shop"
          >
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
              <span>卖出 {{ crop.sellPrice }} 金币</span>
            </div>

            <button
              class="seed-buy-button"
              type="button"
              :disabled="panelBusy || coin < crop.seedPrice"
              @click="buySeed(crop.type)"
            >
              {{ coin >= crop.seedPrice ? "购买 1 颗" : "金币不足" }}
            </button>
          </article>
        </div>

        <div v-else class="warehouse-shell">
          <div class="warehouse-tabs">
            <button
              :class="['warehouse-tab', { 'warehouse-tab--active': warehouseTab === 'seed' }]"
              type="button"
              :disabled="panelBusy"
              @click="warehouseTab = 'seed'"
            >
              种子 {{ totalSeedCount }}
            </button>
            <button
              :class="['warehouse-tab', { 'warehouse-tab--active': warehouseTab === 'crop' }]"
              type="button"
              :disabled="panelBusy"
              @click="warehouseTab = 'crop'"
            >
              作物 {{ totalCropCount }}
            </button>
          </div>

          <div v-if="warehouseTab === 'seed'" class="warehouse-grid">
            <article
              v-for="crop in cropCatalog"
              :key="`seed-${crop.type}`"
              class="warehouse-card"
            >
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

          <div v-else class="warehouse-grid">
            <article
              v-for="crop in cropCatalog"
              :key="`crop-${crop.type}`"
              class="warehouse-card warehouse-card--crop"
            >
              <div class="warehouse-card__top">
                <span class="warehouse-emoji">{{ crop.stages[3] }}</span>
                <div>
                  <strong>{{ crop.label }}</strong>
                  <p>收获后先进仓库，再决定何时卖出</p>
                </div>
              </div>

              <div class="warehouse-card__meta">
                <span class="warehouse-count">
                  {{ getInventoryQuantity("crop", crop.type) }}
                </span>
                <span>仓库存货</span>
              </div>

              <button
                class="warehouse-action"
                type="button"
                :disabled="panelBusy || getInventoryQuantity('crop', crop.type) <= 0"
                @click="sellStoredCrop(crop.type)"
              >
                {{
                  getInventoryQuantity("crop", crop.type) > 0
                    ? `出售 1 份 · +${crop.sellPrice} 金币`
                    : "暂无可出售作物"
                }}
              </button>
            </article>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import {
  buySeedApi,
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
  TelegramUser,
} from "./types";
import { getTelegramUser, getTelegramUserErrorReason } from "./utils/telegram";

const LAND_COUNT = 24;

type PanelType = "plant" | "shop" | "warehouse";
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
const harvestBursts = ref<FloatingBurst[]>([]);

const totalSeedCount = computed(() =>
  inventory.value.seeds.reduce((total, entry) => total + entry.quantity, 0)
);
const totalCropCount = computed(() =>
  inventory.value.crops.reduce((total, entry) => total + entry.quantity, 0)
);
const ownedSeeds = computed(() =>
  cropCatalog
    .map((crop) => ({
      ...crop,
      quantity: getInventoryQuantity("seed", crop.type),
    }))
    .filter((crop) => crop.quantity > 0)
);

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

function handleTick() {
  for (const land of lands) {
    if (land.status !== "empty") {
      syncLandProgress(land);
    }
  }
}

async function handleLandClick(index: number) {
  const land = lands[index];

  if (!user.value || panelBusy.value) {
    return;
  }

  if (land.status === "empty") {
    selectedLandIndex.value = index;
    activePanel.value = "plant";
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
    replaceInventory(response.inventory);
    closeActivePanel();
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
    replaceInventory(response.inventory);
    launchHarvestBurst(
      index,
      `+${response.harvested.quantity} ${getCropLabel(response.harvested.cropType)}`
    );
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : "收获失败，请稍后再试。";
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

function getLandStatusText(land: Land) {
  if (land.status === "empty") {
    return "点击播种";
  }

  if (land.status === "ready") {
    return "已经成熟";
  }

  return `${getCropLabel(land.cropType)} 正在成长`;
}

function getLandActionText(land: Land) {
  if (land.status === "empty") {
    return "选择种子";
  }

  if (land.status === "ready") {
    return "点击收获";
  }

  return "成长中";
}

function formatRemain(remain: number) {
  const minutes = Math.floor(remain / 60);
  const seconds = remain % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

onMounted(async () => {
  progressTimer = window.setInterval(handleTick, 1000);

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
