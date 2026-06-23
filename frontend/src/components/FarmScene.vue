<template>
  <section class="scene-stage">
    <div class="scene-hint">
      <template v-if="visitMode">
        <strong>{{ visitFarmName }} 的农场</strong>
        <span>当前是拜访模式，只能查看，不能操作。</span>
        <button
          class="panel-ghost-button scene-hint__button"
          type="button"
          @click="$emit('return-home')"
        >
          返回我的农场
        </button>
      </template>

      <button
        v-else-if="readyLandCount > 0"
        class="harvest-all-button"
        type="button"
        :disabled="panelBusy"
        @click="$emit('harvest-all')"
      >
        一键收获
      </button>
    </div>

    <p v-if="errorMessage" class="error-banner error-banner--floating">{{ errorMessage }}</p>

    <div
      ref="sceneViewportRef"
      :class="[
        'scene-viewport',
        {
          'scene-viewport--can-pan': canPanScene,
          'scene-viewport--dragging': isSceneDragging,
        },
      ]"
      @pointerdown="beginSceneDrag"
      @pointermove="moveSceneDrag"
      @pointerup="endSceneDrag"
      @pointercancel="endSceneDrag"
    >
      <div
        ref="sceneCanvasRef"
        :class="['scene-stage__canvas', { 'scene-stage__canvas--dragging': isSceneDragging }]"
        :style="sceneCanvasStyle"
      >
        <div class="farm-board">
          <div class="farm-grid">
            <button
              v-for="(land, index) in lands"
              :key="index"
              :class="['land-tile', `land-tile--${land.status}`, getCropClassName(land)]"
              type="button"
              @click="handleLandButtonClick(index)"
            >
              <span class="plot-id">#{{ String(index + 1).padStart(2, "0") }}</span>
              <div class="crop-visual">
                <span class="crop-icon">{{ getLandIcon(land) }}</span>
                <span v-if="land.status === 'ready'" class="crop-badge">可收获</span>
              </div>

              <span v-for="burst in getBurstsForLand(index)" :key="burst.id" class="coin-burst">
                {{ burst.label }}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- <p v-if="canPanScene" class="scene-pan-note">左右拖动画面查看完整农场</p> -->
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";
import type { FloatingBurst, Land } from "../types";

const props = defineProps<{
  lands: Land[];
  readyLandCount: number;
  growingLandCount: number;
  errorMessage: string;
  panelBusy: boolean;
  visitMode: boolean;
  visitFarmName: string;
  getCropClassName: (land: Land) => string;
  getLandIcon: (land: Land) => string;
  getBurstsForLand: (index: number) => FloatingBurst[];
}>();

const emit = defineEmits<{
  (event: "land-click", index: number): void;
  (event: "harvest-all"): void;
  (event: "return-home"): void;
}>();

const sceneViewportRef = ref<HTMLElement | null>(null);
const sceneCanvasRef = ref<HTMLElement | null>(null);
const sceneOffsetX = ref(0);
const canPanScene = ref(false);
const sceneMinOffsetX = ref(0);
const sceneMaxOffsetX = ref(0);
const draggingPointerId = ref<number | null>(null);
const dragStartX = ref(0);
const dragOriginX = ref(0);
const dragMoved = ref(false);
const suppressLandClickUntil = ref(0);

const isSceneDragging = computed(() => draggingPointerId.value !== null);
const sceneCanvasStyle = computed(() => ({
  transform: `translateX(${sceneOffsetX.value}px)`,
}));

function clampSceneOffset(nextOffset: number) {
  return Math.min(
    sceneMaxOffsetX.value,
    Math.max(sceneMinOffsetX.value, nextOffset)
  );
}

function getCenteredSceneOffset(viewportWidth: number, canvasWidth: number) {
  if (canvasWidth <= viewportWidth) {
    return 0;
  }

  return Math.round((viewportWidth - canvasWidth) / 2);
}

function syncScenePanBounds(recenter = false) {
  const viewportWidth = sceneViewportRef.value?.clientWidth ?? 0;
  const canvasWidth = sceneCanvasRef.value?.scrollWidth ?? 0;

  if (!viewportWidth || !canvasWidth) {
    return;
  }

  const shouldPan = canvasWidth > viewportWidth + 2;

  canPanScene.value = shouldPan;
  sceneMinOffsetX.value = shouldPan ? viewportWidth - canvasWidth : 0;
  sceneMaxOffsetX.value = 0;

  if (!shouldPan) {
    sceneOffsetX.value = 0;
    return;
  }

  if (recenter) {
    sceneOffsetX.value = clampSceneOffset(
      getCenteredSceneOffset(viewportWidth, canvasWidth)
    );
    return;
  }

  sceneOffsetX.value = clampSceneOffset(sceneOffsetX.value);
}

function handleSceneResize() {
  syncScenePanBounds(true);
}

function beginSceneDrag(event: PointerEvent) {
  if (!canPanScene.value) {
    return;
  }

  draggingPointerId.value = event.pointerId;
  dragStartX.value = event.clientX;
  dragOriginX.value = sceneOffsetX.value;
  dragMoved.value = false;

  sceneViewportRef.value?.setPointerCapture(event.pointerId);
}

function moveSceneDrag(event: PointerEvent) {
  if (draggingPointerId.value !== event.pointerId) {
    return;
  }

  const deltaX = event.clientX - dragStartX.value;

  if (Math.abs(deltaX) > 6) {
    dragMoved.value = true;
  }

  sceneOffsetX.value = clampSceneOffset(dragOriginX.value + deltaX);
}

function endSceneDrag(event: PointerEvent) {
  if (draggingPointerId.value !== event.pointerId) {
    return;
  }

  if (dragMoved.value) {
    suppressLandClickUntil.value = Date.now() + 180;
  }

  if (sceneViewportRef.value?.hasPointerCapture(event.pointerId)) {
    sceneViewportRef.value.releasePointerCapture(event.pointerId);
  }

  draggingPointerId.value = null;
  dragMoved.value = false;
}

function handleLandButtonClick(index: number) {
  if (Date.now() < suppressLandClickUntil.value) {
    return;
  }

  emit("land-click", index);
}

onMounted(async () => {
  window.addEventListener("resize", handleSceneResize);
  await nextTick();
  syncScenePanBounds(true);
});

onUnmounted(() => {
  window.removeEventListener("resize", handleSceneResize);
});
</script>
