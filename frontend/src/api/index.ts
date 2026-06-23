import type {
  BuySeedResponse,
  CropType,
  HarvestAllResponse,
  HarvestResponse,
  SocialListResponse,
  SocialTab,
  PlantResponse,
  SellCropResponse,
  VisitFarmResponse,
  TelegramLoginResponse,
  TelegramUser
} from "../types";

const API =
  resolveApiBaseUrl();
const REQUEST_TIMEOUT_MS = 10000;

export async function tgLogin(
  user: TelegramUser
): Promise<TelegramLoginResponse> {
  return requestJson<TelegramLoginResponse>("/auth/telegram", {
    method: "POST",
    body: JSON.stringify(user)
  });
}


export async function plantApi(
  userId: number,
  position: number,
  cropType: CropType
): Promise<PlantResponse> {
  return requestJson<PlantResponse>("/plant", {
    method: "POST",
    body: JSON.stringify({ userId, position, cropType })
  });
}

export async function harvestApi(
  userId: number,
  position: number
): Promise<HarvestResponse> {
  return requestJson<HarvestResponse>("/harvest", {
    method: "POST",
    body: JSON.stringify({ userId, position })
  });
}

export async function harvestAllApi(
  userId: number
): Promise<HarvestAllResponse> {
  return requestJson<HarvestAllResponse>("/harvest-all", {
    method: "POST",
    body: JSON.stringify({ userId })
  });
}

export async function buySeedApi(
  userId: number,
  cropType: CropType,
  quantity = 1
): Promise<BuySeedResponse> {
  return requestJson<BuySeedResponse>("/shop/buy-seed", {
    method: "POST",
    body: JSON.stringify({ userId, cropType, quantity })
  });
}

export async function sellCropApi(
  userId: number,
  cropType: CropType,
  quantity = 1
): Promise<SellCropResponse> {
  return requestJson<SellCropResponse>("/warehouse/sell-crop", {
    method: "POST",
    body: JSON.stringify({ userId, cropType, quantity })
  });
}

export async function getLeaderboardApi(
  options: {
    userId?: number;
    page?: number;
    pageSize?: number;
    query?: string;
    tab?: SocialTab;
  } = {}
): Promise<SocialListResponse> {
  const searchParams = new URLSearchParams();

  if (typeof options.userId === "number") {
    searchParams.set("userId", String(options.userId));
  }

  if (typeof options.page === "number") {
    searchParams.set("page", String(options.page));
  }

  if (typeof options.pageSize === "number") {
    searchParams.set("pageSize", String(options.pageSize));
  }

  if (options.query?.trim()) {
    searchParams.set("query", options.query.trim());
  }

  if (options.tab) {
    searchParams.set("tab", options.tab);
  }

  const query = searchParams.toString();

  return requestJson<SocialListResponse>(`/leaderboard${query ? `?${query}` : ""}`, {
    method: "GET"
  });
}

export async function visitFarmApi(userId: number): Promise<VisitFarmResponse> {
  const searchParams = new URLSearchParams({
    userId: String(userId)
  });

  return requestJson<VisitFarmResponse>(`/farm/visit?${searchParams.toString()}`, {
    method: "GET"
  });
}


async function requestJson<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  let res: Response;

  try {
    res = await fetch(buildApiUrl(path), {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {})
      }
    });
  } catch (error) {
    window.clearTimeout(timeoutId);
    throw formatRequestError(path, error);
  }

  window.clearTimeout(timeoutId);

  const contentType = res.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const data = isJson
    ? ((await res.json()) as T & { error?: string })
    : null;
  const text = isJson ? "" : await res.text();

  if (!res.ok) {
    throw new Error(
      (data && "error" in data && data.error) ||
        text ||
        `请求失败（${res.status}）`
    );
  }

  return (data ?? (text as T)) as T;
}

function formatRequestError(path: string, error: unknown): Error {
  if (error instanceof DOMException && error.name === "AbortError") {
    return new Error(`请求超时：${path}`);
  }

  if (error instanceof Error) {
    if (error.message === "Load failed" || error.message === "Failed to fetch") {
      return new Error(`无法连接接口：${buildApiUrl(path)}`);
    }

    return error;
  }

  return new Error(`请求失败：${buildApiUrl(path)}`);
}

function buildApiUrl(path: string): string {
  return API ? `${API}${path}` : path;
}

function resolveApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();

  if (configured) {
    return configured;
  }

  if (isLocalHost(window.location.hostname)) {
    return "";
  }

  return "https://worker.d7895h.workers.dev";
}

function isLocalHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0"
  );
}
