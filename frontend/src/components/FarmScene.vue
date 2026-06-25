<template>
  <section class="scene-stage">
    <div class="scene-hint">
      <!-- <strong>{{ readyLandCount }} 块可收获</strong>
      <span>{{ growingLandCount }} 块正在成长</span> -->

      <button v-if="readyLandCount > 0" class="harvest-all-button" type="button" :disabled="panelBusy"
        @click="$emit('harvest-all')">
        一键收获
      </button>
    </div>

    <p v-if="errorMessage" class="error-banner error-banner--floating">{{ errorMessage }}</p>

    <div class="viewport" @pointerdown="onPointerDown"
  @pointermove="onPointerMove"
  @pointerup="onPointerUp"
  @pointercancel="onPointerUp"
  @wheel.prevent="onWheel" >

      <div class="world" 
       
      
      :style="worldStyle" >


        <div v-for="land in renderLands" :key="land.id" class="tile" :class="land.status" :style="getStyle(land)"
          @click.stop="handleClick(land.id)">

          {{ getLandIcon(land) }}


        </div>


      </div>

    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useCamera } from "../game/camera";
import { normalizeFarm } from "../game/farmMap";

import type {
  FloatingBurst,
  Land,
  RenderLand
} from "../types";

const props = defineProps<{
  lands: Land[];
  readyLandCount: number;
  growingLandCount: number;
  errorMessage: string;
  panelBusy: boolean;
  getCropClassName: (land: Land) => string;
  getLandIcon: (land: Land) => string;
  getBurstsForLand: (index: number) => FloatingBurst[];
}>();

const emit = defineEmits<{
  (e: "land-click", index: number): void;
  (e: "harvest-all"): void;
}>();

const {
  camera,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onWheel
} = useCamera();

/** 渲染地块 */
const renderLands = computed(() => {
  return normalizeFarm(props.lands);
});

/** 相机变换 */
const worldStyle = computed(() => ({
  transform: `translate(${camera.value.x}px, ${camera.value.y}px) scale(${camera.value.zoom})`
}));

function handleClick(index: number) {
  emit("land-click", index);
}

/** 地块位置 */
function getStyle(land: RenderLand) {
  return {
    left: `${land.x}px`,
    top: `${land.y}px`,
    zIndex: land.row + land.col
  };
}


onMounted(() => {
  // setInterval(() => {
  // }, 1000 / 30); // 30fps更新
});

</script>


<style scoped>
.farm-map {
  position: relative;
  width: 100%;
  height: 600px;
}



.tile.empty {
  background: #6ecb6e;
}

.tile.growing {
  background: #4caf50;
}

.tile.ready {
  background: #ffd54f;
}

.progress {
  position: absolute;
  bottom: 2px;
  left: 5px;
  right: 5px;
  height: 4px;
  background: rgba(0, 0, 0, 0.2);
}

.bar {
  height: 100%;
  background: white;
}

.viewport {
  width: 100%;
  height: 100vh;
  overflow: hidden;
  position: relative;
  cursor: grab;
}

.world {
  position: absolute;
  left: 0;
  top: 0;
}

.tile {
  position: absolute;
  width: 100px;
  height: 56px;

  clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
  background: #6fcf6f;

  will-change: transform;
  transition: transform 0.05s linear;
}
</style>