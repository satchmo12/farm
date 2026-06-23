<template>
  <div class="growth-panel">
    <div class="growth-panel__hero">
      <span class="growth-panel__emoji">{{ cropIcon }}</span>
      <div>
        <strong>{{ cropLabel }}</strong>
        <p>{{ currentStageLabel }}，距离成熟还有 {{ remainText }}</p>
      </div>
    </div>

    <div class="growth-panel__meter">
      <article
        v-for="(stageIcon, stageIndex) in stageIcons"
        :key="stageIcon + stageIndex"
        :class="['growth-stage', { 'growth-stage--active': stageIndex + 1 <= land.stage }]"
      >
        <span class="growth-stage__icon">{{ stageIcon }}</span>
        <strong>{{ stageLabels[stageIndex] }}</strong>
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
import { computed } from "vue";
import type { Land } from "../types";

const props = defineProps<{
  land: Land;
  cropIcon: string;
  cropLabel: string;
  remainText: string;
  growthPercent: number;
  stageIcons: string[];
  stageLabels: string[];
}>();

const currentStageLabel = computed(() => {
  if (props.land.stage <= 0) {
    return props.stageLabels[0] ?? "播种";
  }

  return props.stageLabels[props.land.stage - 1] ?? `阶段 ${props.land.stage}`;
});
</script>
