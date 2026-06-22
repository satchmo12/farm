import type {
  CropType,
  HarvestResponse,
  PlantResponse,
  TelegramLoginResponse,
  TelegramUser
} from "../types";

const API =
  import.meta.env.VITE_API_BASE_URL || "https://worker.d7895h.workers.dev";
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
    res = await fetch(`${API}${path}`, {
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
      return new Error(`无法连接接口：${API}${path}`);
    }

    return error;
  }

  return new Error(`请求失败：${API}${path}`);
}
