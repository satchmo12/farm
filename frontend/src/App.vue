<template>
  <div class="farm-app">
    <div class="game-shell">
      <GameHud
        :user="user"
        :coin="coin"
        :coin-bump="coinBump"
        :panel-busy="panelBusy"
        :player-level="playerLevel"
        :experience-progress-percent="experienceProgressPercent"
        :progression="progression"
        @open-profile="openProfilePanel"
      />

      <div class="game-layout">
        <FarmScene
          :lands="displayedLands"
          :ready-land-count="readyLandCount"
          :growing-land-count="growingLandCount"
          :error-message="errorMessage"
          :panel-busy="panelBusy"
          :visit-mode="visitMode"
          :visit-farm-name="visitFarmName"
          :get-crop-class-name="getCropClassName"
          :get-land-icon="getLandIcon"
          :get-bursts-for-land="getBurstsForLand"
          @land-click="handleLandClick"
          @harvest-all="harvestAllReadyLands"
          @return-home="returnToOwnFarm"
        />

        <SideRail
          :panel-busy="panelBusy"
          @open-shop="openShopPanel"
          @open-warehouse="openWarehousePanel"
          @open-crops="openCropWarehousePanel"
          @open-social="openSocialPanel"
        />
      </div>
    </div>

    <GameModal
      v-if="activePanel"
      :centered="isCompactPanel"
      :compact="isCompactPanel"
      :kicker="panelKicker"
      :title="panelTitle"
      @close="closeActivePanel"
    >
      <PlantPanel
        v-if="activePanel === 'plant'"
        :owned-seeds="ownedSeeds"
        :panel-busy="panelBusy"
        @plant="plantSelectedCrop"
        @open-shop="openShopFromPlant"
      />

      <ShopPanel
        v-else-if="activePanel === 'shop'"
        :shop-catalog="shopCatalog"
        :coin="coin"
        :panel-busy="panelBusy"
        @buy="buySeed"
      />

      <WarehousePanel
        v-else-if="activePanel === 'warehouse'"
        :warehouse-tab="warehouseTab"
        :total-seed-count="totalSeedCount"
        :total-crop-count="totalCropCount"
        :warehouse-seeds="warehouseSeeds"
        :warehouse-crops="warehouseCrops"
        :panel-busy="panelBusy"
        @update:warehouse-tab="warehouseTab = $event"
        @sell="sellStoredCrop"
      />

      <ProfilePanel
        v-else-if="activePanel === 'profile'"
        :user="user"
        :player-level="playerLevel"
        :progression="progression"
        :experience-progress-percent="experienceProgressPercent"
        :experience-remaining="experienceRemaining"
        :coin="coin"
        :total-seed-count="totalSeedCount"
        :total-crop-count="totalCropCount"
      />

      <GrowthPanel
        v-else-if="selectedGrowthLand"
        :land="selectedGrowthLand"
        :crop-icon="getLandIcon(selectedGrowthLand)"
        :crop-label="getCropLabel(selectedGrowthLand.cropType)"
        :remain-text="formatRemain(selectedGrowthLand.remain)"
        :growth-percent="getGrowthPercent(selectedGrowthLand)"
        :stage-icons="getGrowthStageIcons(selectedGrowthLand.cropType)"
        :stage-labels="getGrowthStageLabels(selectedGrowthLand.cropType)"
      />

      <SocialPanel
        v-else-if="activePanel === 'social'"
        :active-tab="socialTab"
        :query="socialQuery"
        :players="leaderboardPlayers"
        :current-user="socialCurrentUser"
        :loading="leaderboardLoading"
        :page="socialPage"
        :total-pages="socialTotalPages"
        :total="socialTotal"
        @refresh="refreshLeaderboard"
        @update:tab="handleSocialTabChange"
        @update:query="handleSocialQueryChange"
        @change-page="handleSocialPageChange"
        @visit="visitPlayerFarm"
        @add-friend="handleAddFriend"
      />
    </GameModal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import {
  buySeedApi,
  getLeaderboardApi,
  harvestAllApi,
  harvestApi,
  plantApi,
  sellCropApi,
  tgLogin,
  visitFarmApi,
} from "./api";
import FarmScene from "./components/FarmScene.vue";
import GameHud from "./components/GameHud.vue";
import GameModal from "./components/GameModal.vue";
import GrowthPanel from "./components/GrowthPanel.vue";
import PlantPanel from "./components/PlantPanel.vue";
import ProfilePanel from "./components/ProfilePanel.vue";
import ShopPanel from "./components/ShopPanel.vue";
import SideRail from "./components/SideRail.vue";
import SocialPanel from "./components/SocialPanel.vue";
import WarehousePanel from "./components/WarehousePanel.vue";
import {
  createEmptyFarm,
  createEmptyInventory,
  createEmptyProgression,
  formatRemain,
  getGrowthPercent,
  LAND_COUNT,
  normalizeInventory,
  normalizeLand,
} from "./game/farm";
import {
  cropCatalog,
  getCropClassName,
  getCropLabel,
  getGrowthStageIcons,
  getGrowthStageLabels,
  getLandIcon,
} from "./game/crops";
import type {
  CropCatalogInventoryItem,
  CropType,
  FarmProfile,
  FloatingBurst,
  Inventory,
  Land,
  LeaderboardPlayer,
  Progression,
  SocialTab,
  TelegramUser,
  WarehouseTab,
} from "./types";
import { getTelegramUser, getTelegramUserErrorReason } from "./utils/telegram";

type PanelType =
  | "plant"
  | "shop"
  | "warehouse"
  | "growth"
  | "profile"
  | "social";

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
const leaderboardPlayers = ref<LeaderboardPlayer[]>([]);
const leaderboardLoading = ref(false);
const socialCurrentUser = ref<LeaderboardPlayer | null>(null);
const socialTab = ref<SocialTab>("leaderboard");
const socialQuery = ref("");
const socialPage = ref(1);
const socialTotal = ref(0);
const socialTotalPages = ref(1);
const visitProfile = ref<FarmProfile | null>(null);

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
      Math.round(
        (progression.value.progressInLevel / progression.value.requiredExperience) *
          100
      )
    )
  )
);
const experienceRemaining = computed(() =>
  Math.max(0, progression.value.requiredExperience - progression.value.progressInLevel)
);
const displayedLands = computed(() => visitProfile.value?.lands ?? lands);
const visitMode = computed(() => visitProfile.value !== null);
const visitFarmName = computed(() => visitProfile.value?.user.first_name ?? "");
const readyLandCount = computed(
  () => displayedLands.value.filter((land) => land.status === "ready").length
);
const growingLandCount = computed(
  () => displayedLands.value.filter((land) => land.status === "growing").length
);
const shopCatalog = computed<CropCatalogInventoryItem[]>(() =>
  cropCatalog.map((crop) => ({
    ...crop,
    quantity: getInventoryQuantity("seed", crop.type),
  }))
);
const ownedSeeds = computed(() =>
  shopCatalog.value.filter((crop) => crop.quantity > 0)
);
const warehouseSeeds = computed(() =>
  shopCatalog.value.filter((crop) => crop.quantity > 0)
);
const warehouseCrops = computed<CropCatalogInventoryItem[]>(() =>
  cropCatalog
    .map((crop) => ({
      ...crop,
      quantity: getInventoryQuantity("crop", crop.type),
    }))
    .filter((crop) => crop.quantity > 0)
);
const selectedGrowthLand = computed(() => {
  if (activePanel.value !== "growth" || selectedLandIndex.value === null) {
    return null;
  }

  return displayedLands.value[selectedLandIndex.value] ?? null;
});
const panelKicker = computed(() => {
  switch (activePanel.value) {
    case "plant":
      return "准备播种";
    case "shop":
      return "商店";
    case "warehouse":
      return "仓库";
    case "profile":
      return "个人中心";
    case "social":
      return "好友大厅";
    case "growth":
      return "成长状态";
    default:
      return "";
  }
});
const panelTitle = computed(() => {
  switch (activePanel.value) {
    case "plant":
      return `第 ${(selectedLandIndex.value ?? 0) + 1} 号地块`;
    case "shop":
      return "种子商店";
    case "warehouse":
      return "农场仓库";
    case "profile":
      return user.value?.first_name ?? "农场主";
    case "social":
      return "好友";
    case "growth":
      return selectedGrowthLand.value
        ? getCropLabel(selectedGrowthLand.value.cropType)
        : "作物成长中";
    default:
      return "";
  }
});
const isCompactPanel = computed(
  () =>
    activePanel.value === "growth" ||
    activePanel.value === "profile" ||
    activePanel.value === "shop" ||
    activePanel.value === "warehouse" ||
    activePanel.value === "social"
);

let progressTimer: number | null = null;
let coinAnimationTimer: number | null = null;
let burstId = 0;
let socialSearchTimer: number | null = null;
const burstTimers = new Set<number>();

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

function openCropWarehousePanel() {
  warehouseTab.value = "crop";
  selectedLandIndex.value = null;
  activePanel.value = "warehouse";
}

function openProfilePanel() {
  selectedLandIndex.value = null;
  activePanel.value = "profile";
}

async function openSocialPanel() {
  selectedLandIndex.value = null;
  activePanel.value = "social";
  socialTab.value = "leaderboard";
  socialQuery.value = "";
  socialPage.value = 1;
  await refreshLeaderboard();
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

  if (socialSearchTimer !== null) {
    window.clearTimeout(socialSearchTimer);
    socialSearchTimer = null;
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

  for (const land of visitProfile.value?.lands ?? []) {
    if (land.status !== "empty") {
      syncLandProgress(land);
    }
  }
}

async function handleLandClick(index: number) {
  const land = displayedLands.value[index];

  if (!user.value || panelBusy.value || !land) {
    return;
  }

  if (visitMode.value) {
    if (land.status === "empty") {
      return;
    }

    selectedLandIndex.value = index;
    activePanel.value = "growth";
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

async function refreshLeaderboard() {
  if (!user.value) {
    return;
  }

  leaderboardLoading.value = true;

  try {
    const response = await getLeaderboardApi({
      userId: user.value.id,
      page: socialPage.value,
      pageSize: 5,
      query: socialQuery.value,
      tab: socialTab.value,
    });
    leaderboardPlayers.value = response.players;
    socialCurrentUser.value = response.currentUser;
    socialTotal.value = response.total;
    socialTotalPages.value = response.totalPages;
    socialPage.value = response.page;
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : "排行榜加载失败，请稍后再试。";
  } finally {
    leaderboardLoading.value = false;
  }
}

function handleSocialTabChange(nextTab: SocialTab) {
  if (socialTab.value === nextTab) {
    return;
  }

  if (socialSearchTimer !== null) {
    window.clearTimeout(socialSearchTimer);
    socialSearchTimer = null;
  }

  socialTab.value = nextTab;
  socialQuery.value = "";
  socialPage.value = 1;
  void refreshLeaderboard();
}

function handleSocialQueryChange(nextQuery: string) {
  socialQuery.value = nextQuery;
  socialPage.value = 1;

  if (socialSearchTimer !== null) {
    window.clearTimeout(socialSearchTimer);
  }

  socialSearchTimer = window.setTimeout(() => {
    socialSearchTimer = null;
    void refreshLeaderboard();
  }, 260);
}

function handleSocialPageChange(nextPage: number) {
  if (nextPage < 1 || nextPage === socialPage.value) {
    return;
  }

  socialPage.value = nextPage;
  void refreshLeaderboard();
}

async function visitPlayerFarm(player: LeaderboardPlayer) {
  if (panelBusy.value || player.isCurrentUser) {
    return;
  }

  panelBusy.value = true;
  errorMessage.value = "";

  try {
    const response = await visitFarmApi(player.user.id);
    visitProfile.value = response.profile;
    forceCloseActivePanel();
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : "拜访农场失败，请稍后再试。";
  } finally {
    panelBusy.value = false;
  }
}

function handleAddFriend(player: LeaderboardPlayer) {
  if (player.isCurrentUser) {
    return;
  }

  errorMessage.value = `加好友功能稍后开放，先支持拜访 ${player.user.first_name} 的农场。`;
}

function returnToOwnFarm() {
  if (panelBusy.value) {
    return;
  }

  visitProfile.value = null;
  selectedLandIndex.value = null;
}

async function buySeed(cropType: CropType, quantity = 1) {
  if (!user.value) {
    return;
  }

  panelBusy.value = true;
  errorMessage.value = "";

  try {
    const response = await buySeedApi(user.value.id, cropType, quantity);

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
    const response = await plantApi(
      user.value.id,
      selectedLandIndex.value,
      cropType
    );

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
      `+${response.harvested.quantity} ${getCropLabel(
        response.harvested.cropType
      )} · +${response.gainedExperience} EXP`
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

  if (socialSearchTimer !== null) {
    window.clearTimeout(socialSearchTimer);
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
