import {
  env,
  createExecutionContext,
  waitOnExecutionContext,
} from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import worker from "../src/index";

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;
const schemaStatements = [
  "DROP TABLE IF EXISTS inventory_items",
  "DROP TABLE IF EXISTS lands",
  "DROP TABLE IF EXISTS users",
  "CREATE TABLE users (id INTEGER PRIMARY KEY, first_name TEXT NOT NULL, username TEXT, avatar_url TEXT, coin INTEGER NOT NULL DEFAULT 0 CHECK (coin >= 0), experience INTEGER NOT NULL DEFAULT 0 CHECK (experience >= 0), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP) STRICT",
  "CREATE TABLE lands (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, position INTEGER NOT NULL CHECK (position >= 0 AND position < 24), status TEXT NOT NULL DEFAULT 'empty' CHECK (status IN ('empty', 'growing', 'ready')), remain INTEGER NOT NULL DEFAULT 0 CHECK (remain >= 0), crop_type TEXT, planted_at TEXT, growth_duration_seconds INTEGER NOT NULL DEFAULT 0 CHECK (growth_duration_seconds >= 0), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, UNIQUE(user_id, position)) STRICT",
  "CREATE INDEX idx_lands_user_id_position ON lands(user_id, position)",
  "CREATE TABLE inventory_items (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, item_type TEXT NOT NULL CHECK (item_type IN ('seed', 'crop')), crop_type TEXT NOT NULL CHECK (crop_type IN ('wheat', 'corn', 'tomato')), quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, UNIQUE(user_id, item_type, crop_type)) STRICT",
  "CREATE INDEX idx_inventory_items_user_type ON inventory_items(user_id, item_type)",
];

beforeAll(async () => {
  for (const statement of schemaStatements) {
    await env.DB.prepare(statement).run();
  }
}, 30_000);

describe("farm gameplay", () => {
  it("creates 24 empty lands for a new user", async () => {
    const request = new IncomingRequest("https://example.com/auth/telegram", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: 1001,
        first_name: "Alice",
        username: "alice",
      }),
    });
    const ctx = createExecutionContext();

    const response = await worker.fetch(request, env, ctx);

    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(200);

    const data = (await response.json()) as {
      ok: boolean;
      created: boolean;
      profile: {
        coin: number;
        progression: {
          experience: number;
          level: number;
          progressInLevel: number;
          requiredExperience: number;
        };
        inventory: {
          seeds: Array<{ cropType: string; quantity: number }>;
          crops: Array<{ cropType: string; quantity: number }>;
        };
        lands: Array<{ status: string; remain: number; stage: number }>;
        user: { id: number; first_name: string; username?: string; photo_url?: string };
      };
    };

    expect(data.ok).toBe(true);
    expect(data.created).toBe(true);
    expect(data.profile.coin).toBe(120);
    expect(data.profile.progression.level).toBe(1);
    expect(data.profile.progression.experience).toBe(0);
    expect(data.profile.user).toEqual({
      id: 1001,
      first_name: "Alice",
      username: "alice",
    });
    expect(data.profile.inventory.seeds).toEqual([
      { cropType: "wheat", quantity: 0 },
      { cropType: "corn", quantity: 0 },
      { cropType: "tomato", quantity: 0 },
    ]);
    expect(data.profile.lands).toHaveLength(24);
    expect(data.profile.lands.every((land) => land.status === "empty")).toBe(
      true
    );
    expect(data.profile.lands.every((land) => land.stage === 0)).toBe(true);
  }, 30_000);

  it("plants a crop and returns growing land data", async () => {
    await createUserFarm(2002);
    await env.DB
      .prepare(
        "INSERT INTO inventory_items (user_id, item_type, crop_type, quantity) VALUES (?, ?, ?, ?)"
      )
      .bind(2002, "seed", "corn", 2)
      .run();

    const request = new IncomingRequest("https://example.com/plant", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: 2002,
        position: 3,
        cropType: "corn",
      }),
    });
    const ctx = createExecutionContext();

    const response = await worker.fetch(request, env, ctx);

    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(200);

    const data = (await response.json()) as {
      ok: boolean;
      coin: number;
      progression: { level: number };
      inventory: {
        seeds: Array<{ cropType: string; quantity: number }>;
      };
      land: {
        status: string;
        cropType: string | null;
        stage: number;
        growthDurationSeconds: number;
      };
    };

    expect(data.ok).toBe(true);
    expect(data.coin).toBe(120);
    expect(data.progression.level).toBe(1);
    expect(data.land.status).toBe("growing");
    expect(data.land.cropType).toBe("corn");
    expect(data.land.stage).toBe(1);
    expect(data.land.growthDurationSeconds).toBe(36);
    expect(
      data.inventory.seeds.find((entry) => entry.cropType === "corn")?.quantity
    ).toBe(1);
  }, 30_000);

  it("harvests a ready crop and stores it in inventory", async () => {
    await createUserFarm(3003);
    const plantedAt = new Date(Date.now() - 60_000).toISOString();

    await env.DB
      .prepare(
        "UPDATE lands SET status = 'growing', remain = 0, crop_type = ?, planted_at = ?, growth_duration_seconds = ? WHERE user_id = ? AND position = ?"
      )
      .bind("wheat", plantedAt, 24, 3003, 5)
      .run();

    const request = new IncomingRequest("https://example.com/harvest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: 3003,
        position: 5,
      }),
    });
    const ctx = createExecutionContext();

    const response = await worker.fetch(request, env, ctx);

    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(200);

    const data = (await response.json()) as {
      ok: boolean;
      coin: number;
      progression: {
        experience: number;
        level: number;
      };
      gainedExperience: number;
      harvested: {
        cropType: string;
        quantity: number;
      };
      inventory: {
        crops: Array<{ cropType: string; quantity: number }>;
      };
      land: {
        status: string;
        cropType: string | null;
        stage: number;
      };
    };

    expect(data.ok).toBe(true);
    expect(data.gainedExperience).toBe(8);
    expect(data.progression.experience).toBe(8);
    expect(data.progression.level).toBe(1);
    expect(data.harvested).toEqual({
      cropType: "wheat",
      quantity: 1,
    });
    expect(data.coin).toBe(120);
    expect(
      data.inventory.crops.find((entry) => entry.cropType === "wheat")?.quantity
    ).toBe(1);
    expect(data.land.status).toBe("empty");
    expect(data.land.cropType).toBeNull();
    expect(data.land.stage).toBe(0);
  }, 30_000);

  it("buys seeds with coins and sells stored crops back for coins", async () => {
    await createUserFarm(4004);
    await env.DB
      .prepare(
        "INSERT INTO inventory_items (user_id, item_type, crop_type, quantity) VALUES (?, ?, ?, ?)"
      )
      .bind(4004, "crop", "tomato", 2)
      .run();

    const buyRequest = new IncomingRequest(
      "https://example.com/shop/buy-seed",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: 4004,
          cropType: "wheat",
          quantity: 3,
        }),
      }
    );
    const buyCtx = createExecutionContext();
    const buyResponse = await worker.fetch(buyRequest, env, buyCtx);

    await waitOnExecutionContext(buyCtx);

    expect(buyResponse.status).toBe(200);

    const buyData = (await buyResponse.json()) as {
      ok: boolean;
      coin: number;
      progression: { level: number };
      purchased: { cropType: string; quantity: number; cost: number };
      inventory: { seeds: Array<{ cropType: string; quantity: number }> };
    };

    expect(buyData.ok).toBe(true);
    expect(buyData.coin).toBe(102);
    expect(buyData.progression.level).toBe(1);
    expect(buyData.purchased).toEqual({
      cropType: "wheat",
      quantity: 3,
      cost: 18,
    });
    expect(
      buyData.inventory.seeds.find((entry) => entry.cropType === "wheat")
        ?.quantity
    ).toBe(3);

    const sellRequest = new IncomingRequest(
      "https://example.com/warehouse/sell-crop",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: 4004,
          cropType: "tomato",
          quantity: 2,
        }),
      }
    );
    const sellCtx = createExecutionContext();
    const sellResponse = await worker.fetch(sellRequest, env, sellCtx);

    await waitOnExecutionContext(sellCtx);

    expect(sellResponse.status).toBe(200);

    const sellData = (await sellResponse.json()) as {
      ok: boolean;
      coin: number;
      progression: { level: number };
      sold: { cropType: string; quantity: number; gained: number };
      inventory: { crops: Array<{ cropType: string; quantity: number }> };
    };

    expect(sellData.ok).toBe(true);
    expect(sellData.coin).toBe(154);
    expect(sellData.progression.level).toBe(1);
    expect(sellData.sold).toEqual({
      cropType: "tomato",
      quantity: 2,
      gained: 52,
    });
    expect(
      sellData.inventory.crops.find((entry) => entry.cropType === "tomato")
        ?.quantity
    ).toBe(0);
  }, 30_000);

  it("returns leaderboard players ordered by experience and coin", async () => {
    await createUserFarm(5005, "Nova", "nova", "https://img.example/nova.png");
    await createUserFarm(5006, "Milo", "milo", "https://img.example/milo.png");
    await createUserFarm(5007, "Luna", "luna", "https://img.example/luna.png");

    await env.DB
      .prepare("UPDATE users SET experience = ?, coin = ? WHERE id = ?")
      .bind(120, 140, 5005)
      .run();
    await env.DB
      .prepare("UPDATE users SET experience = ?, coin = ? WHERE id = ?")
      .bind(220, 90, 5006)
      .run();
    await env.DB
      .prepare("UPDATE users SET experience = ?, coin = ? WHERE id = ?")
      .bind(120, 180, 5007)
      .run();

    const request = new IncomingRequest(
      "https://example.com/leaderboard?userId=5005",
      {
        method: "GET",
      }
    );
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, env, ctx);

    await waitOnExecutionContext(ctx);

    expect(response.status).toBe(200);

    const data = (await response.json()) as {
      ok: boolean;
      players: Array<{
        rank: number;
        coin: number;
        isCurrentUser: boolean;
        user: {
          id: number;
          first_name: string;
          photo_url?: string;
        };
        progression: {
          level: number;
          experience: number;
        };
      }>;
      currentUser: {
        rank: number;
        user: { id: number; first_name: string };
      } | null;
      total: number;
      totalPages: number;
      page: number;
    };

    expect(data.ok).toBe(true);
    expect(data.total).toBe(2);
    expect(data.totalPages).toBe(1);
    expect(data.page).toBe(1);
    expect(data.players.slice(0, 2).map((player) => player.user.id)).toEqual([
      5006,
      5007,
    ]);
    expect(data.players[0]).toMatchObject({
      rank: 1,
      coin: 90,
      user: {
        id: 5006,
        first_name: "Milo",
        photo_url: "https://img.example/milo.png",
      },
      progression: { level: 3, experience: 220 },
    });
    expect(data.currentUser).toMatchObject({
      rank: 3,
      user: { id: 5005, first_name: "Nova" },
    });
  }, 30_000);

  it("supports leaderboard search and pagination", async () => {
    await createUserFarm(6001, "Alpha", "alpha");
    await createUserFarm(6002, "Bravo", "bravo");
    await createUserFarm(6003, "Charlie", "charlie");
    await createUserFarm(6004, "Delta", "delta");

    const pagedRequest = new IncomingRequest(
      "https://example.com/leaderboard?userId=6001&page=2&pageSize=2",
      {
        method: "GET",
      }
    );
    const pagedCtx = createExecutionContext();
    const pagedResponse = await worker.fetch(pagedRequest, env, pagedCtx);

    await waitOnExecutionContext(pagedCtx);

    expect(pagedResponse.status).toBe(200);

    const pagedData = (await pagedResponse.json()) as {
      players: Array<{ user: { id: number } }>;
      page: number;
      totalPages: number;
      total: number;
    };

    expect(pagedData.page).toBe(2);
    expect(pagedData.totalPages).toBe(2);
    expect(pagedData.total).toBe(3);
    expect(pagedData.players).toHaveLength(1);

    const searchRequest = new IncomingRequest(
      "https://example.com/leaderboard?userId=6001&query=char",
      {
        method: "GET",
      }
    );
    const searchCtx = createExecutionContext();
    const searchResponse = await worker.fetch(searchRequest, env, searchCtx);

    await waitOnExecutionContext(searchCtx);

    expect(searchResponse.status).toBe(200);

    const searchData = (await searchResponse.json()) as {
      players: Array<{ user: { id: number; first_name: string } }>;
      total: number;
    };

    expect(searchData.total).toBe(1);
    expect(searchData.players).toEqual([
      { user: { id: 6003, first_name: "Charlie" } },
    ]);
  }, 30_000);
});

async function createUserFarm(
  userId: number,
  firstName = "Alice",
  username = "alice",
  avatarUrl: string | null = null
): Promise<void> {
  await env.DB
    .prepare(
      "INSERT INTO users (id, first_name, username, avatar_url, coin, experience) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(userId, firstName, username, avatarUrl, 120, 0)
    .run();

  for (let position = 0; position < 24; position++) {
    await env.DB
      .prepare(
        "INSERT INTO lands (user_id, position, status, remain) VALUES (?, ?, ?, ?)"
      )
      .bind(userId, position, "empty", 0)
      .run();
  }
}
