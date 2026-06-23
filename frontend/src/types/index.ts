import type {
  CropDefinition,
  CropType,
} from "../../../shared/crops";

export type {
  CropStageIcons,
  CropStageLabels,
  CropType,
} from "../../../shared/crops";

export interface TelegramUser {
  id: number;
  username?: string;
  first_name: string;
  photo_url?: string;
}

export type LandStatus = "empty" | "growing" | "ready";
export type InventoryItemType = "seed" | "crop";
export type WarehouseTab = "seed" | "crop";
export type SocialTab = "leaderboard" | "friends";

export interface Land {
  status: LandStatus;
  remain: number;
  cropType: CropType | null;
  stage: 0 | 1 | 2 | 3 | 4;
  plantedAt: string | null;
  growthDurationSeconds: number;
}

export interface InventoryEntry {
  cropType: CropType;
  quantity: number;
}

export interface Inventory {
  seeds: InventoryEntry[];
  crops: InventoryEntry[];
}

export interface CropCatalogItem extends CropDefinition {}

export interface CropCatalogInventoryItem extends CropCatalogItem {
  quantity: number;
}

export interface FloatingBurst {
  id: number;
  label: string;
  landIndex: number;
}

export interface Progression {
  experience: number;
  level: number;
  currentLevelExperience: number;
  nextLevelExperience: number;
  progressInLevel: number;
  requiredExperience: number;
}

export interface FarmProfile {
  user: TelegramUser;
  coin: number;
  progression: Progression;
  lands: Land[];
  inventory: Inventory;
}

export interface TelegramLoginResponse {
  ok: true;
  created: boolean;
  profile: FarmProfile;
}

export interface VisitFarmResponse {
  ok: true;
  profile: FarmProfile;
}

export interface PlantResponse {
  ok: true;
  coin: number;
  progression: Progression;
  inventory: Inventory;
  land: Land;
}

export interface HarvestResponse {
  ok: true;
  coin: number;
  progression: Progression;
  gainedExperience: number;
  inventory: Inventory;
  harvested: {
    cropType: CropType;
    quantity: number;
  };
  land: Land;
}

export interface HarvestAllResponse {
  ok: true;
  coin: number;
  progression: Progression;
  gainedExperience: number;
  harvestedCount: number;
  harvested: Array<{
    position: number;
    cropType: CropType;
    quantity: number;
  }>;
  inventory: Inventory;
  lands: Land[];
}

export interface BuySeedResponse {
  ok: true;
  coin: number;
  progression: Progression;
  inventory: Inventory;
  purchased: {
    cropType: CropType;
    quantity: number;
    cost: number;
  };
}

export interface SellCropResponse {
  ok: true;
  coin: number;
  progression: Progression;
  inventory: Inventory;
  sold: {
    cropType: CropType;
    quantity: number;
    gained: number;
  };
}

export interface LeaderboardPlayer {
  rank: number;
  user: TelegramUser;
  coin: number;
  progression: Progression;
  isCurrentUser: boolean;
}

export interface SocialListResponse {
  ok: true;
  players: LeaderboardPlayer[];
  currentUser: LeaderboardPlayer | null;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  query: string;
  tab: SocialTab;
}
