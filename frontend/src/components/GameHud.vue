<template>
  <div v-if="user" class="hud-overlay">
    <button
      class="player-medallion"
      type="button"
      :disabled="panelBusy"
      @click="$emit('open-profile')"
    >
      <span class="player-medallion__avatar">{{ user.first_name.slice(0, 1) }}</span>
      <div class="player-medallion__meta">
        <strong>{{ user.first_name }}</strong>
        <p>Lv.{{ playerLevel }}</p>
        <div class="player-progress">
          <div class="player-progress__track">
            <span
              class="player-progress__fill"
              :style="{ width: `${experienceProgressPercent}%` }"
            ></span>
          </div>
          <span class="player-progress__text">
            EXP {{ progression.progressInLevel }}/{{ progression.requiredExperience }}
          </span>
        </div>
      </div>
    </button>
  </div>

  <header class="hud-bar">
    <div class="resource-ribbon">
      <article class="resource-pill resource-pill--coin">
        <span class="resource-pill__icon">🪙</span>
        <div>
          <p>金币</p>
          <strong :class="['coin-total', { 'coin-total--bump': coinBump }]">
            {{ coin }}
          </strong>
        </div>
      </article>
    </div>
  </header>
</template>

<script setup lang="ts">
import type { Progression, TelegramUser } from "../types";

defineProps<{
  user: TelegramUser | null;
  coin: number;
  coinBump: boolean;
  panelBusy: boolean;
  playerLevel: number;
  experienceProgressPercent: number;
  progression: Progression;
}>();

defineEmits<{
  (event: "open-profile"): void;
}>();
</script>
