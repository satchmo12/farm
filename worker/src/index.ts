const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const LAND_COUNT = 24;
const STARTER_COIN = 120;
const CROP_TYPES = ["wheat", "corn", "tomato"] as const;

type CropType = (typeof CROP_TYPES)[number];
type LandStatus = "empty" | "growing" | "ready";
type InventoryItemType = "seed" | "crop";

interface CropConfig {
  growthDurationSeconds: number;
  seedPrice: number;
  sellPrice: number;
}

interface TelegramUser {
  id: number;
  username?: string;
  first_name: string;
}

interface Land {
  status: LandStatus;
  remain: number;
  cropType: CropType | null;
  stage: 0 | 1 | 2 | 3 | 4;
  plantedAt: string | null;
  growthDurationSeconds: number;
}

interface InventoryEntry {
  cropType: CropType;
  quantity: number;
}

interface Inventory {
  seeds: InventoryEntry[];
  crops: InventoryEntry[];
}

interface FarmProfile {
  user: TelegramUser;
  coin: number;
  lands: Land[];
  inventory: Inventory;
}

interface LoginResponse {
  ok: true;
  created: boolean;
  profile: FarmProfile;
}

interface PlantResponse {
  ok: true;
  coin: number;
  inventory: Inventory;
  land: Land;
}

interface HarvestResponse {
  ok: true;
  coin: number;
  inventory: Inventory;
  harvested: {
    cropType: CropType;
    quantity: number;
  };
  land: Land;
}

interface PlantRequest {
  userId: number;
  position: number;
  cropType: CropType;
}

interface HarvestRequest {
  userId: number;
  position: number;
}

interface BuySeedRequest {
  userId: number;
  cropType: CropType;
  quantity?: number;
}

interface BuySeedResponse {
  ok: true;
  coin: number;
  inventory: Inventory;
  purchased: {
    cropType: CropType;
    quantity: number;
    cost: number;
  };
}

interface SellCropRequest {
  userId: number;
  cropType: CropType;
  quantity?: number;
}

interface SellCropResponse {
  ok: true;
  coin: number;
  inventory: Inventory;
  sold: {
    cropType: CropType;
    quantity: number;
    gained: number;
  };
}

interface UserRow {
  id: number;
  first_name: string;
  username: string | null;
  coin: number;
}

interface LandRow {
  position: number;
  status: string;
  remain: number;
  crop_type: string | null;
  planted_at: string | null;
  growth_duration_seconds: number;
}

interface InventoryRow {
  item_type: string;
  crop_type: string;
  quantity: number;
}

const CROPS: Record<CropType, CropConfig> = {
  wheat: {
    growthDurationSeconds: 24,
    seedPrice: 6,
    sellPrice: 12,
  },
  corn: {
    growthDurationSeconds: 36,
    seedPrice: 10,
    sellPrice: 18,
  },
  tomato: {
    growthDurationSeconds: 48,
    seedPrice: 14,
    sellPrice: 26,
  },
};

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(req.url);

    if (url.pathname === "/auth/telegram" && req.method === "POST") {
      return handleTelegramLogin(req, env);
    }

    if (url.pathname === "/plant" && req.method === "POST") {
      return handlePlant(req, env);
    }

    if (url.pathname === "/harvest" && req.method === "POST") {
      return handleHarvest(req, env);
    }

    if (url.pathname === "/shop/buy-seed" && req.method === "POST") {
      return handleBuySeed(req, env);
    }

    if (url.pathname === "/warehouse/sell-crop" && req.method === "POST") {
      return handleSellCrop(req, env);
    }

    return jsonResponse(
      {
        ok: true,
        message: "farm worker is running",
      },
      200
    );
  },
};

async function handleTelegramLogin(
  req: Request,
  env: Env
): Promise<Response> {
  const body = await parseJson<TelegramUser>(req);

  if (!body) {
    return jsonResponse({ error: "请求体不是合法 JSON" }, 400);
  }

  const validationError = validateTelegramUser(body);

  if (validationError) {
    return jsonResponse({ error: validationError }, 400);
  }

  const existingUser = await getUserById(env.DB, body.id);
  const created = !existingUser;

  if (existingUser) {
    await syncTelegramUser(env.DB, existingUser, body);
    await ensureUserLands(env.DB, body.id);
  } else {
    await createUserFarm(env.DB, body);
  }

  await ensureStarterPack(env.DB, body.id);

  const profile = await getFarmProfile(env.DB, body.id);

  return jsonResponse<LoginResponse>({
    ok: true,
    created,
    profile,
  });
}

async function handlePlant(req: Request, env: Env): Promise<Response> {
  const body = await parseJson<PlantRequest>(req);

  if (!body) {
    return jsonResponse({ error: "请求体不是合法 JSON" }, 400);
  }

  const validationError = validateFarmAction(body.userId, body.position);

  if (validationError) {
    return jsonResponse({ error: validationError }, 400);
  }

  if (!isCropType(body.cropType)) {
    return jsonResponse({ error: "不支持的种子类型" }, 400);
  }

  const user = await getUserById(env.DB, body.userId);

  if (!user) {
    return jsonResponse({ error: "用户不存在，请重新登录" }, 404);
  }

  await ensureUserLands(env.DB, body.userId);

  const row = await getLandByPosition(env.DB, body.userId, body.position);

  if (!row) {
    return jsonResponse({ error: "地块不存在" }, 404);
  }

  const currentLand = serializeLand(row);

  if (currentLand.status !== "empty") {
    return jsonResponse({ error: "这块地已经种下作物了" }, 400);
  }

  const hasSeed = await consumeInventoryQuantity(
    env.DB,
    body.userId,
    "seed",
    body.cropType,
    1
  );

  if (!hasSeed) {
    return jsonResponse({ error: "种子不足，请先去商店购买" }, 400);
  }

  const crop = CROPS[body.cropType];
  const plantedAt = new Date().toISOString();

  await env.DB
    .prepare(
      "UPDATE lands SET status = 'growing', remain = ?, crop_type = ?, planted_at = ?, growth_duration_seconds = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND position = ?"
    )
    .bind(
      crop.growthDurationSeconds,
      body.cropType,
      plantedAt,
      crop.growthDurationSeconds,
      body.userId,
      body.position
    )
    .run();

  const updated = await getLandByPosition(env.DB, body.userId, body.position);

  if (!updated) {
    return jsonResponse({ error: "播种失败，请稍后再试" }, 500);
  }

  const inventory = await getInventory(env.DB, body.userId);

  return jsonResponse<PlantResponse>({
    ok: true,
    coin: user.coin,
    inventory,
    land: serializeLand(updated),
  });
}

async function handleHarvest(req: Request, env: Env): Promise<Response> {
  const body = await parseJson<HarvestRequest>(req);

  if (!body) {
    return jsonResponse({ error: "请求体不是合法 JSON" }, 400);
  }

  const validationError = validateFarmAction(body.userId, body.position);

  if (validationError) {
    return jsonResponse({ error: validationError }, 400);
  }

  const user = await getUserById(env.DB, body.userId);

  if (!user) {
    return jsonResponse({ error: "用户不存在，请重新登录" }, 404);
  }

  const row = await getLandByPosition(env.DB, body.userId, body.position);

  if (!row) {
    return jsonResponse({ error: "地块不存在" }, 404);
  }

  const currentLand = serializeLand(row);

  if (currentLand.status !== "ready" || !currentLand.cropType) {
    return jsonResponse({ error: "作物还没有成熟" }, 400);
  }

  await addInventoryQuantity(env.DB, body.userId, "crop", currentLand.cropType, 1);

  await env.DB
    .prepare(
      "UPDATE lands SET status = 'empty', remain = 0, crop_type = NULL, planted_at = NULL, growth_duration_seconds = 0, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND position = ?"
    )
    .bind(body.userId, body.position)
    .run();

  const inventory = await getInventory(env.DB, body.userId);

  return jsonResponse<HarvestResponse>({
    ok: true,
    coin: user.coin,
    inventory,
    harvested: {
      cropType: currentLand.cropType,
      quantity: 1,
    },
    land: createEmptyLand(),
  });
}

async function handleBuySeed(req: Request, env: Env): Promise<Response> {
  const body = await parseJson<BuySeedRequest>(req);

  if (!body) {
    return jsonResponse({ error: "请求体不是合法 JSON" }, 400);
  }

  const validationError = validateUserId(body.userId);

  if (validationError) {
    return jsonResponse({ error: validationError }, 400);
  }

  if (!isCropType(body.cropType)) {
    return jsonResponse({ error: "不支持的种子类型" }, 400);
  }

  const quantity = parseQuantity(body.quantity);

  if (quantity === null) {
    return jsonResponse({ error: "购买数量不合法" }, 400);
  }

  const user = await getUserById(env.DB, body.userId);

  if (!user) {
    return jsonResponse({ error: "用户不存在，请重新登录" }, 404);
  }

  const cost = CROPS[body.cropType].seedPrice * quantity;

  if (user.coin < cost) {
    return jsonResponse({ error: "金币不足，无法购买这些种子" }, 400);
  }

  await env.DB
    .prepare(
      "UPDATE users SET coin = coin - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND coin >= ?"
    )
    .bind(cost, body.userId, cost)
    .run();

  await addInventoryQuantity(env.DB, body.userId, "seed", body.cropType, quantity);

  const inventory = await getInventory(env.DB, body.userId);

  return jsonResponse<BuySeedResponse>({
    ok: true,
    coin: user.coin - cost,
    inventory,
    purchased: {
      cropType: body.cropType,
      quantity,
      cost,
    },
  });
}

async function handleSellCrop(req: Request, env: Env): Promise<Response> {
  const body = await parseJson<SellCropRequest>(req);

  if (!body) {
    return jsonResponse({ error: "请求体不是合法 JSON" }, 400);
  }

  const validationError = validateUserId(body.userId);

  if (validationError) {
    return jsonResponse({ error: validationError }, 400);
  }

  if (!isCropType(body.cropType)) {
    return jsonResponse({ error: "不支持的作物类型" }, 400);
  }

  const quantity = parseQuantity(body.quantity);

  if (quantity === null) {
    return jsonResponse({ error: "出售数量不合法" }, 400);
  }

  const user = await getUserById(env.DB, body.userId);

  if (!user) {
    return jsonResponse({ error: "用户不存在，请重新登录" }, 404);
  }

  const hasCrop = await consumeInventoryQuantity(
    env.DB,
    body.userId,
    "crop",
    body.cropType,
    quantity
  );

  if (!hasCrop) {
    return jsonResponse({ error: "仓库里的作物数量不足" }, 400);
  }

  const gained = CROPS[body.cropType].sellPrice * quantity;

  await env.DB
    .prepare(
      "UPDATE users SET coin = coin + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    )
    .bind(gained, body.userId)
    .run();

  const inventory = await getInventory(env.DB, body.userId);

  return jsonResponse<SellCropResponse>({
    ok: true,
    coin: user.coin + gained,
    inventory,
    sold: {
      cropType: body.cropType,
      quantity,
      gained,
    },
  });
}

async function parseJson<T>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}

function validateTelegramUser(user: TelegramUser): string | null {
  if (!Number.isInteger(user.id) || user.id <= 0) {
    return "缺少合法的用户 id";
  }

  if (typeof user.first_name !== "string" || user.first_name.trim() === "") {
    return "缺少用户 first_name";
  }

  if (
    user.username !== undefined &&
    (typeof user.username !== "string" || user.username.trim() === "")
  ) {
    return "username 不能为空字符串";
  }

  return null;
}

function validateUserId(userId: number): string | null {
  if (!Number.isInteger(userId) || userId <= 0) {
    return "缺少合法的用户 id";
  }

  return null;
}

function validateFarmAction(userId: number, position: number): string | null {
  const userIdError = validateUserId(userId);

  if (userIdError) {
    return userIdError;
  }

  if (!Number.isInteger(position) || position < 0 || position >= LAND_COUNT) {
    return "地块位置不合法";
  }

  return null;
}

async function getUserById(
  db: D1Database,
  userId: number
): Promise<UserRow | null> {
  return db
    .prepare(
      "SELECT id, first_name, username, coin FROM users WHERE id = ? LIMIT 1"
    )
    .bind(userId)
    .first<UserRow>();
}

async function createUserFarm(db: D1Database, user: TelegramUser): Promise<void> {
  const statements = [
    db
      .prepare(
        "INSERT OR IGNORE INTO users (id, first_name, username, coin, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)"
      )
      .bind(user.id, user.first_name, user.username ?? null, STARTER_COIN),
    ...createLandInsertStatements(db, user.id),
  ];

  await db.batch(statements);
}

async function syncTelegramUser(
  db: D1Database,
  existingUser: UserRow,
  user: TelegramUser
): Promise<void> {
  if (
    existingUser.first_name === user.first_name &&
    (user.username === undefined || existingUser.username === user.username)
  ) {
    return;
  }

  if (user.username === undefined) {
    await db
      .prepare(
        "UPDATE users SET first_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      )
      .bind(user.first_name, user.id)
      .run();
    return;
  }

  await db
    .prepare(
      "UPDATE users SET first_name = ?, username = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    )
    .bind(user.first_name, user.username, user.id)
    .run();
}

async function ensureStarterPack(db: D1Database, userId: number): Promise<void> {
  const user = await getUserById(db, userId);

  if (!user || user.coin > 0) {
    return;
  }

  const [inventory, activeLandCount] = await Promise.all([
    getInventory(db, userId),
    countActiveLands(db, userId),
  ]);
  const storedCount = sumInventoryQuantity(inventory);

  if (storedCount > 0 || activeLandCount > 0) {
    return;
  }

  await db
    .prepare(
      "UPDATE users SET coin = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    )
    .bind(STARTER_COIN, userId)
    .run();
}

async function ensureUserLands(db: D1Database, userId: number): Promise<void> {
  const result = await db
    .prepare("SELECT position FROM lands WHERE user_id = ?")
    .bind(userId)
    .all<{ position: number }>();
  const existingPositions = new Set(
    (result.results ?? []).map((row) => row.position)
  );

  if (existingPositions.size === LAND_COUNT) {
    return;
  }

  const missingStatements = createLandInsertStatements(
    db,
    userId,
    existingPositions
  );

  if (missingStatements.length > 0) {
    await db.batch(missingStatements);
  }
}

function createLandInsertStatements(
  db: D1Database,
  userId: number,
  existingPositions?: Set<number>
): D1PreparedStatement[] {
  const statements: D1PreparedStatement[] = [];

  for (let position = 0; position < LAND_COUNT; position++) {
    if (existingPositions?.has(position)) {
      continue;
    }

    statements.push(
      db
        .prepare(
          "INSERT OR IGNORE INTO lands (user_id, position, status, remain, updated_at) VALUES (?, ?, 'empty', 0, CURRENT_TIMESTAMP)"
        )
        .bind(userId, position)
    );
  }

  return statements;
}

async function getLandByPosition(
  db: D1Database,
  userId: number,
  position: number
): Promise<LandRow | null> {
  return db
    .prepare(
      "SELECT position, status, remain, crop_type, planted_at, growth_duration_seconds FROM lands WHERE user_id = ? AND position = ? LIMIT 1"
    )
    .bind(userId, position)
    .first<LandRow>();
}

async function countActiveLands(
  db: D1Database,
  userId: number
): Promise<number> {
  const row = await db
    .prepare(
      "SELECT COUNT(*) AS total FROM lands WHERE user_id = ? AND status != 'empty'"
    )
    .bind(userId)
    .first<{ total: number }>();

  return typeof row?.total === "number" ? row.total : 0;
}

async function getInventory(db: D1Database, userId: number): Promise<Inventory> {
  const result = await db
    .prepare(
      "SELECT item_type, crop_type, quantity FROM inventory_items WHERE user_id = ?"
    )
    .bind(userId)
    .all<InventoryRow>();

  return serializeInventory(result.results ?? []);
}

async function addInventoryQuantity(
  db: D1Database,
  userId: number,
  itemType: InventoryItemType,
  cropType: CropType,
  quantity: number
): Promise<void> {
  if (quantity <= 0) {
    return;
  }

  await db
    .prepare(
      "INSERT INTO inventory_items (user_id, item_type, crop_type, quantity, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(user_id, item_type, crop_type) DO UPDATE SET quantity = inventory_items.quantity + excluded.quantity, updated_at = CURRENT_TIMESTAMP"
    )
    .bind(userId, itemType, cropType, quantity)
    .run();
}

async function consumeInventoryQuantity(
  db: D1Database,
  userId: number,
  itemType: InventoryItemType,
  cropType: CropType,
  quantity: number
): Promise<boolean> {
  if (quantity <= 0) {
    return false;
  }

  const result = await db
    .prepare(
      "UPDATE inventory_items SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND item_type = ? AND crop_type = ? AND quantity >= ?"
    )
    .bind(quantity, userId, itemType, cropType, quantity)
    .run();

  return (result.meta.changes ?? 0) > 0;
}

async function getFarmProfile(
  db: D1Database,
  userId: number
): Promise<FarmProfile> {
  const user = await getUserById(db, userId);

  if (!user) {
    throw new Error(`未找到用户 ${userId} 的农场数据`);
  }

  const [landResult, inventory] = await Promise.all([
    db
      .prepare(
        "SELECT position, status, remain, crop_type, planted_at, growth_duration_seconds FROM lands WHERE user_id = ? ORDER BY position ASC"
      )
      .bind(userId)
      .all<LandRow>(),
    getInventory(db, userId),
  ]);
  const landsByPosition = new Map<number, LandRow>();

  for (const land of landResult.results ?? []) {
    landsByPosition.set(land.position, land);
  }

  return {
    user: {
      id: user.id,
      first_name: user.first_name,
      username: user.username ?? undefined,
    },
    coin: typeof user.coin === "number" ? user.coin : 0,
    lands: Array.from({ length: LAND_COUNT }, (_, position) => {
      const land = landsByPosition.get(position);

      return land ? serializeLand(land) : createEmptyLand();
    }),
    inventory,
  };
}

function serializeInventory(rows: InventoryRow[]): Inventory {
  const seedMap = new Map<CropType, number>();
  const cropMap = new Map<CropType, number>();

  for (const row of rows) {
    if (!isCropType(row.crop_type)) {
      continue;
    }

    const quantity =
      typeof row.quantity === "number" && Number.isFinite(row.quantity)
        ? Math.max(0, row.quantity)
        : 0;

    if (row.item_type === "seed") {
      seedMap.set(row.crop_type, quantity);
      continue;
    }

    if (row.item_type === "crop") {
      cropMap.set(row.crop_type, quantity);
    }
  }

  return {
    seeds: CROP_TYPES.map((cropType) => ({
      cropType,
      quantity: seedMap.get(cropType) ?? 0,
    })),
    crops: CROP_TYPES.map((cropType) => ({
      cropType,
      quantity: cropMap.get(cropType) ?? 0,
    })),
  };
}

function sumInventoryQuantity(inventory: Inventory): number {
  return [...inventory.seeds, ...inventory.crops].reduce(
    (total, entry) => total + entry.quantity,
    0
  );
}

function serializeLand(row: LandRow): Land {
  const cropType = isCropType(row.crop_type) ? row.crop_type : null;
  const growthDurationSeconds =
    typeof row.growth_duration_seconds === "number" &&
    Number.isFinite(row.growth_duration_seconds)
      ? Math.max(0, row.growth_duration_seconds)
      : 0;
  const plantedAt = row.planted_at ?? null;

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
  const status: LandStatus = remain === 0 ? "ready" : "growing";
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

function getGrowthStage(
  elapsedSeconds: number,
  totalSeconds: number,
  status: LandStatus
): 0 | 1 | 2 | 3 | 4 {
  if (status === "empty") {
    return 0;
  }

  if (status === "ready") {
    return 4;
  }

  const safeTotal = Math.max(1, totalSeconds);
  const progress = Math.min(0.999, elapsedSeconds / safeTotal);
  const stage = Math.floor(progress * 4) + 1;

  return Math.min(4, Math.max(1, stage)) as 1 | 2 | 3 | 4;
}

function isCropType(value: unknown): value is CropType {
  return value === "wheat" || value === "corn" || value === "tomato";
}

function parseQuantity(value: unknown): number | null {
  if (value === undefined) {
    return 1;
  }

  if (typeof value !== "number" || !Number.isInteger(value)) {
    return null;
  }

  if (value <= 0 || value > 99) {
    return null;
  }

  return value;
}

function jsonResponse<T>(data: T, status = 200): Response {
  return Response.json(data, {
    status,
    headers: corsHeaders,
  });
}
