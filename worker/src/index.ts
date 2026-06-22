const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const LAND_COUNT = 24;

type CropType = "wheat" | "corn" | "tomato";
type LandStatus = "empty" | "growing" | "ready";

interface CropConfig {
  growthDurationSeconds: number;
  reward: number;
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

interface FarmProfile {
  user: TelegramUser;
  coin: number;
  lands: Land[];
}

interface LoginResponse {
  ok: true;
  created: boolean;
  profile: FarmProfile;
}

interface PlantResponse {
  ok: true;
  land: Land;
}

interface HarvestResponse {
  ok: true;
  coin: number;
  gained: number;
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

const CROPS: Record<CropType, CropConfig> = {
  wheat: {
    growthDurationSeconds: 24,
    reward: 12,
  },
  corn: {
    growthDurationSeconds: 36,
    reward: 18,
  },
  tomato: {
    growthDurationSeconds: 48,
    reward: 26,
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

  return jsonResponse<PlantResponse>({
    ok: true,
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

  const gained = CROPS[currentLand.cropType].reward;

  await env.DB.batch([
    env.DB
      .prepare(
        "UPDATE users SET coin = coin + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      )
      .bind(gained, body.userId),
    env.DB
      .prepare(
        "UPDATE lands SET status = 'empty', remain = 0, crop_type = NULL, planted_at = NULL, growth_duration_seconds = 0, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND position = ?"
      )
      .bind(body.userId, body.position),
  ]);

  return jsonResponse<HarvestResponse>({
    ok: true,
    coin: user.coin + gained,
    gained,
    land: createEmptyLand(),
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

function validateFarmAction(userId: number, position: number): string | null {
  if (!Number.isInteger(userId) || userId <= 0) {
    return "缺少合法的用户 id";
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
        "INSERT OR IGNORE INTO users (id, first_name, username, coin, updated_at) VALUES (?, ?, ?, 0, CURRENT_TIMESTAMP)"
      )
      .bind(user.id, user.first_name, user.username ?? null),
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

async function getFarmProfile(
  db: D1Database,
  userId: number
): Promise<FarmProfile> {
  const user = await getUserById(db, userId);

  if (!user) {
    throw new Error(`未找到用户 ${userId} 的农场数据`);
  }

  const landResult = await db
    .prepare(
      "SELECT position, status, remain, crop_type, planted_at, growth_duration_seconds FROM lands WHERE user_id = ? ORDER BY position ASC"
    )
    .bind(userId)
    .all<LandRow>();
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
  };
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

function jsonResponse<T>(data: T, status = 200): Response {
  return Response.json(data, {
    status,
    headers: corsHeaders,
  });
}
