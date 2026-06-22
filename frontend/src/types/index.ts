export interface TelegramUser {
  id: number;
  username?: string;
  first_name: string;
}

export type CropType = "wheat" | "corn" | "tomato";
export type LandStatus = "empty" | "growing" | "ready";

export interface Land {
  status: LandStatus;
  remain: number;
  cropType: CropType | null;
  stage: 0 | 1 | 2 | 3 | 4;
  plantedAt: string | null;
  growthDurationSeconds: number;
}

export interface FarmProfile {
  user: TelegramUser;
  coin: number;
  lands: Land[];
}

export interface TelegramLoginResponse {
  ok: true;
  created: boolean;
  profile: FarmProfile;
}

export interface PlantResponse {
  ok: true;
  land: Land;
}

export interface HarvestResponse {
  ok: true;
  coin: number;
  gained: number;
  land: Land;
}
