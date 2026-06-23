import type {
  CropType,
  Inventory,
  InventoryEntry,
  Land,
  Progression,
} from "../types";
import { cropCatalog } from "./crops";

export const LAND_COUNT = 24;

export function createEmptyLand(): Land {
  return {
    status: "empty",
    remain: 0,
    cropType: null,
    stage: 0,
    plantedAt: null,
    growthDurationSeconds: 0,
  };
}

export function createEmptyFarm(): Land[] {
  return Array.from({ length: LAND_COUNT }, () => createEmptyLand());
}

export function createEmptyInventory(): Inventory {
  return {
    seeds: createInventoryEntries(),
    crops: createInventoryEntries(),
  };
}

export function createEmptyProgression(): Progression {
  return {
    experience: 0,
    level: 1,
    currentLevelExperience: 0,
    nextLevelExperience: 60,
    progressInLevel: 0,
    requiredExperience: 60,
  };
}

export function createInventoryEntries(
  source?: InventoryEntry[] | null
): InventoryEntry[] {
  const quantities = new Map<CropType, number>();

  for (const entry of source ?? []) {
    quantities.set(entry.cropType, Math.max(0, entry.quantity || 0));
  }

  return cropCatalog.map((crop) => ({
    cropType: crop.type,
    quantity: quantities.get(crop.type) ?? 0,
  }));
}

export function normalizeInventory(next?: Partial<Inventory> | null): Inventory {
  return {
    seeds: createInventoryEntries(next?.seeds),
    crops: createInventoryEntries(next?.crops),
  };
}

export function getGrowthStage(
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

export function normalizeLand(land?: Partial<Land> | null): Land {
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

export function formatRemain(remain: number) {
  const minutes = Math.floor(remain / 60);
  const seconds = remain % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0"
  )}`;
}

export function getGrowthPercent(land: Land) {
  if (land.status === "empty" || land.growthDurationSeconds <= 0) {
    return 0;
  }

  const completed = Math.max(0, land.growthDurationSeconds - land.remain);
  const progress = (completed / land.growthDurationSeconds) * 100;

  return Math.max(0, Math.min(100, Math.round(progress)));
}
