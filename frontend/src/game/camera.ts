import { ref } from "vue";

export function useCamera() {
  const camera = ref({
    x: 0,
    y: 0,
    zoom: 1,
  });

  const dragging = ref(false);
  const last = { x: 0, y: 0 };

  function onPointerDown(e: PointerEvent) {
    dragging.value = true;
    last.x = e.clientX;
    last.y = e.clientY;
  }

  function onPointerMove(e: PointerEvent) {
    if (!dragging.value) return;

    const dx = e.clientX - last.x;
    const dy = e.clientY - last.y;

    camera.value.x += dx;
    camera.value.y += dy;

    last.x = e.clientX;
    last.y = e.clientY;
  }

  function onPointerUp() {
    dragging.value = false;
  }

  function onWheel(e: WheelEvent) {
    const delta = -e.deltaY * 0.001;

    const next = camera.value.zoom + delta;

    camera.value.zoom = Math.min(2, Math.max(0.5, next));
  }

  return {
    camera,
    dragging,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onWheel,
  };

}