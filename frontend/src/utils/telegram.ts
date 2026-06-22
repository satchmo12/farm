import { retrieveLaunchParams } from "@telegram-apps/sdk";
import type { TelegramUser } from "../types";

export function getTelegram() {
  return window.Telegram?.WebApp ?? null;
}

export function initTelegram() {
  const tg = getTelegram();
  if (!tg) return null;

  tg.ready();
  tg.expand();

  return tg;
}

export function getTelegramUser(): TelegramUser | null {
  const launchUser = getLaunchParamsUser();

  if (launchUser) {
    return launchUser;
  }

  return getTelegram()?.initDataUnsafe?.user ?? null;
}

export function getTelegramInitData(): string {
  return getTelegram()?.initData ?? "";
}

export function getTelegramUserErrorReason(): string {
  const tg = getTelegram();

  if (!tg) {
    return "当前页面不是在 Telegram Mini App 容器里打开的，`window.Telegram.WebApp` 不存在。";
  }

  if (tg.initDataUnsafe?.user) {
    return "Telegram WebApp 已注入，但当前用户对象读取失败。";
  }

  try {
    const launchParams = retrieveLaunchParams();

    if (!launchParams.tgWebAppData) {
      return "Telegram 已打开页面，但 launch params 里没有 `tgWebAppData`。";
    }

    if (!launchParams.tgWebAppData.user) {
      return "launch params 已拿到，但里面没有 `user` 字段。";
    }
  } catch {
    return "无法从 Telegram launch params 中解析用户数据。";
  }

  return "未读取到 Telegram 用户信息。";
}

function getLaunchParamsUser(): TelegramUser | null {
  try {
    const launchParams = retrieveLaunchParams();

    return launchParams.tgWebAppData?.user ?? null;
  } catch {
    return null;
  }
}
