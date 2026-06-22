export interface TelegramUser {
  id: number;
  username?: string;
  first_name: string;
}

export type CropType = "wheat" | "corn" | "tomato";
export type LandStatus = "empty" | "growing" | "ready";
export type InventoryItemType = "seed" | "crop";

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

export interface FarmProfile {
  user: TelegramUser;
  coin: number;
  lands: Land[];
  inventory: Inventory;
}

export interface TelegramLoginResponse {
  ok: true;
  created: boolean;
  profile: FarmProfile;
}

export interface PlantResponse {
  ok: true;
  coin: number;
  inventory: Inventory;
  land: Land;
}

export interface HarvestResponse {
  ok: true;
  coin: number;
  inventory: Inventory;
  harvested: {
    cropType: CropType;
    quantity: number;
  };
  land: Land;
}

export interface BuySeedResponse {
  ok: true;
  coin: number;
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
  inventory: Inventory;
  sold: {
    cropType: CropType;
    quantity: number;
    gained: number;
  };
}
