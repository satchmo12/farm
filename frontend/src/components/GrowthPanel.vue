<template>
  <div class="growth-panel">
    <div class="growth-panel__hero">
      <span class="growth-panel__emoji">{{ cropIcon }}</span>
      <div>
        <strong>{{ cropLabel }}</strong>
        <p>第 {{ land.stage }} 阶段，距离成熟还有 {{ remainText }}</p>
      </div>
    </div>

    <div class="growth-panel__meter">
      <article
        v-for="(stageIcon, stageIndex) in stageIcons"
        :key="stageIcon + stageIndex"
        :class="['growth-stage', { 'growth-stage--active': stageIndex + 1 <= land.stage }]"
      >
        <span class="growth-stage__icon">{{ stageIcon }}</span>
        <strong>阶段 {{ stageIndex + 1 }}</strong>
      </article>
    </div>

    <div class="growth-panel__facts">
      <article class="growth-fact">
        <span>成长进度</span>
        <strong>{{ growthPercent }}%</strong>
      </article>
      <article class="growth-fact">
        <span>成熟时间</span>
        <strong>{{ land.growthDurationSeconds }}s</strong>
      </article>
    </div>

    <p class="growth-panel__hint">作物成熟后，再点击地块就会直接收获进仓库。</p>
  </div>
</template>

<script setup lang="ts">
import type { Land } from "../types";

defineProps<{
  land: Land;
  cropIcon: string;
  cropLabel: string;
  remainText: string;
  growthPercent: number;
  stageIcons: string[];
}>();
</script>
