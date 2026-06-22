import {
  env,
  createExecutionContext,
  waitOnExecutionContext,
} from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import worker from "../src/index";
import schemaV1 from "../migrations/0001_create_farm_tables.sql?raw";
import schemaV2 from "../migrations/0002_add_crop_fields.sql?raw";

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;
const schemaStatements = [schemaV1, schemaV2]
  .flatMap((schema) => schema.split(/;\s*\n/g))
  .map((statement) => statement.replace(/\s+/g, " ").trim())
  .filter(Boolean);

beforeEach(async () => {
  for (const statement of schemaStatements) {
    await env.DB.prepare(statement).run();
  }
});

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
        lands: Array<{ status: string; remain: number; stage: number }>;
        user: { id: number; first_name: string; username?: string };
      };
    };

    expect(data.ok).toBe(true);
    expect(data.created).toBe(true);
    expect(data.profile.coin).toBe(0);
    expect(data.profile.user).toEqual({
      id: 1001,
      first_name: "Alice",
      username: "alice",
    });
    expect(data.profile.lands).toHaveLength(24);
    expect(data.profile.lands.every((land) => land.status === "empty")).toBe(
      true
    );
    expect(data.profile.lands.every((land) => land.stage === 0)).toBe(true);
  });

  it("plants a crop and returns growing land data", async () => {
    await createUserFarm();

    const request = new IncomingRequest("https://example.com/plant", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: 1001,
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
      land: {
        status: string;
        cropType: string | null;
        stage: number;
        growthDurationSeconds: number;
      };
    };

    expect(data.ok).toBe(true);
    expect(data.land.status).toBe("growing");
    expect(data.land.cropType).toBe("corn");
    expect(data.land.stage).toBe(1);
    expect(data.land.growthDurationSeconds).toBe(36);
  });

  it("harvests a ready crop and rewards coins", async () => {
    await createUserFarm();
    const plantedAt = new Date(Date.now() - 60_000).toISOString();

    await env.DB
      .prepare(
        "UPDATE lands SET status = 'growing', remain = 0, crop_type = ?, planted_at = ?, growth_duration_seconds = ? WHERE user_id = ? AND position = ?"
      )
      .bind("wheat", plantedAt, 24, 1001, 5)
      .run();

    const request = new IncomingRequest("https://example.com/harvest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: 1001,
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
      gained: number;
      land: {
        status: string;
        cropType: string | null;
        stage: number;
      };
    };

    expect(data.ok).toBe(true);
    expect(data.gained).toBe(12);
    expect(data.coin).toBe(12);
    expect(data.land.status).toBe("empty");
    expect(data.land.cropType).toBeNull();
    expect(data.land.stage).toBe(0);
  });
});

async function createUserFarm(): Promise<void> {
  await env.DB
    .prepare(
      "INSERT INTO users (id, first_name, username, coin) VALUES (?, ?, ?, ?)"
    )
    .bind(1001, "Alice", "alice", 0)
    .run();

  for (let position = 0; position < 24; position++) {
    await env.DB
      .prepare(
        "INSERT INTO lands (user_id, position, status, remain) VALUES (?, ?, ?, ?)"
      )
      .bind(1001, position, "empty", 0)
      .run();
  }
}
