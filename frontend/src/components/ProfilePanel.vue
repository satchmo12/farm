<template>
  <div class="profile-panel">
    <div class="profile-panel__hero">
      <span class="profile-panel__avatar">{{ user?.first_name?.slice(0, 1) ?? "F" }}</span>
      <div>
        <strong>{{ user?.first_name ?? "农场主" }}</strong>
        <p>{{ visitMode ? `拜访中 · Lv.${playerLevel} 农场主` : `Lv.${playerLevel} 农场主` }}</p>
        <p>@{{ user?.username || `user_${user?.id ?? "farm"}` }}</p>
      </div>
    </div>

    <div class="profile-progress-card">
      <div class="profile-progress-card__top">
        <span>经验进度</span>
        <strong>{{ progression.progressInLevel }}/{{ progression.requiredExperience }}</strong>
      </div>
      <div class="profile-progress-card__track">
        <span
          class="profile-progress-card__fill"
          :style="{ width: `${experienceProgressPercent}%` }"
        ></span>
      </div>
      <p>总经验 {{ progression.experience }}，距离 Lv.{{ playerLevel + 1 }} 还差 {{ experienceRemaining }}</p>
    </div>

    <div class="profile-stats">
      <article class="profile-stat">
        <span>金币</span>
        <strong>{{ coin }}</strong>
      </article>
      <article class="profile-stat">
        <span>种子库存</span>
        <strong>{{ totalSeedCount }}</strong>
      </article>
      <article class="profile-stat">
        <span>作物库存</span>
        <strong>{{ totalCropCount }}</strong>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Progression, TelegramUser } from "../types";

defineProps<{
  user: TelegramUser | null;
  playerLevel: number;
  progression: Progression;
  experienceProgressPercent: number;
  experienceRemaining: number;
  coin: number;
  totalSeedCount: number;
  totalCropCount: number;
  visitMode: boolean;
}>();
</script>
