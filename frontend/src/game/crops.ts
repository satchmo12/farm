import type { CropCatalogItem, CropType, Land } from "../types";

export const cropCatalog: CropCatalogItem[] = [
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

export function getCropMeta(cropType: CropType | null) {
  return cropCatalog.find((crop) => crop.type === cropType) ?? null;
}

export function getCropLabel(cropType: CropType | null) {
  return getCropMeta(cropType)?.label ?? "空地";
}

export function getGrowthStageIcons(cropType: CropType | null) {
  return (getCropMeta(cropType)?.stages ?? ["🌰", "🌱", "🌿", "✨"]).map(
    (icon, index) => (index === 0 && icon === "·" ? "🌰" : icon)
  );
}

export function getLandIcon(land: Land) {
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

export function getCropClassName(land: Land) {
  if (!land.cropType) {
    return "land-tile--plain";
  }

  return `land-tile--${land.cropType}`;
}
