export type CropType = string;

export type CropStageIcons = [string, string, string, string];
export type CropStageLabels = [string, string, string, string];

export interface CropDefinition {
  id: string;
  type: CropType;
  name: string;
  description: string;
  growthDurationSeconds: number;
  seedPrice: number;
  yield: number;
  guaranteedYield: number;
  fruitPrice: number;
  experience: number;
  stages: CropStageIcons;
  stageLabels: CropStageLabels;
}

export const cropDefinitions: CropDefinition[] = [
  {
    id: "seed_wheat",
    type: "wheat",
    name: "金穗小麦",
    description: "成熟快，适合快速滚动种植节奏。",
    growthDurationSeconds: 24,
    seedPrice: 6,
    yield: 2,
    guaranteedYield: 1,
    fruitPrice: 12,
    experience: 8,
    stages: ["·", "🌱", "🌿", "🌾"],
    stageLabels: ["播种", "发芽", "生长", "成熟"],
  },
  {
    id: "seed_corn",
    type: "corn",
    name: "甜芯玉米",
    description: "中等周期，适合稳定屯货出售。",
    growthDurationSeconds: 36,
    seedPrice: 10,
    yield: 2,
    guaranteedYield: 1,
    fruitPrice: 18,
    experience: 12,
    stages: ["·", "🌱", "🌿", "🌽"],
    stageLabels: ["播种", "破土", "抽叶", "成熟"],
  },
  {
    id: "seed_tomato",
    type: "tomato",
    name: "红果番茄",
    description: "成熟慢一点，但卖价最高。",
    
    growthDurationSeconds: 48,
    seedPrice: 14,
    yield: 2,
    guaranteedYield: 1,
    fruitPrice: 26,
    experience: 18,
    stages: ["·", "🌱", "🪴", "🍅"],
    stageLabels: ["播种", "育苗", "开花", "成熟"],
  },
];

const cropIds = new Set<string>();

for (const crop of cropDefinitions) {
  if (!crop.id.trim()) {
    throw new Error("Crop config id cannot be empty.");
  }

  if (cropIds.has(crop.id)) {
    throw new Error(`Duplicate crop config id: ${crop.id}`);
  }

  cropIds.add(crop.id);

  if (!crop.type.trim()) {
    throw new Error("Crop config type cannot be empty.");
  }

  if (!crop.name.trim()) {
    throw new Error(`Crop config name cannot be empty: ${crop.type}`);
  }

  if (crop.guaranteedYield <= 0 || crop.yield <= 0) {
    throw new Error(`Crop yield must be positive: ${crop.type}`);
  }

  if (crop.guaranteedYield > crop.yield) {
    throw new Error(
      `Crop guaranteedYield cannot exceed yield: ${crop.type}`
    );
  }
}

const cropDefinitionMap = new Map<CropType, CropDefinition>(
  cropDefinitions.map((crop) => [crop.type, crop])
);

export function getCropDefinition(
  cropType: CropType | null | undefined
): CropDefinition | null {
  if (!cropType) {
    return null;
  }

  return cropDefinitionMap.get(cropType) ?? null;
}

export function hasCropDefinition(value: unknown): value is CropType {
  return typeof value === "string" && cropDefinitionMap.has(value);
}
