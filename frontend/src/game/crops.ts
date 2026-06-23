import { cropDefinitions, getCropDefinition } from "../../../shared/crops";
import type { CropCatalogItem, CropType, Land } from "../types";

export const cropCatalog: CropCatalogItem[] = cropDefinitions;

export function getCropMeta(cropType: CropType | null) {
  return getCropDefinition(cropType);
}

export function getCropLabel(cropType: CropType | null) {
  return getCropMeta(cropType)?.name ?? "空地";
}

export function getGrowthStageIcons(cropType: CropType | null) {
  return (getCropMeta(cropType)?.stages ?? ["🌰", "🌱", "🌿", "✨"]).map(
    (icon, index) => (index === 0 && icon === "·" ? "🌰" : icon)
  );
}

export function getGrowthStageLabels(cropType: CropType | null) {
  return (
    getCropMeta(cropType)?.stageLabels ?? ["播种", "发芽", "生长", "成熟"]
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
