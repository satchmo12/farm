<template>
  <div class="shop-grid">
    <button
      v-for="crop in shopCatalog"
      :key="crop.type"
      class="seed-card seed-card--shop seed-card--shop-grid"
      type="button"
      :disabled="panelBusy"
      @click="openPurchase(crop.type)"
    >
      <span class="seed-card__emoji">{{ crop.stages[3] }}</span>
      <strong :title="crop.name">{{ crop.name }}</strong>

      <div class="seed-card__chips seed-card__chips--compact">
        <span class="owned-chip owned-chip--warm">{{ crop.seedPrice }} 金</span>
        <span v-if="crop.quantity > 0" class="owned-chip">x{{ crop.quantity }}</span>
      </div>
    </button>
  </div>

  <Teleport to="body">
    <div
      v-if="selectedCrop"
      class="shop-confirm-backdrop"
      @click.self="closePurchase"
    >
      <section class="shop-confirm-card">
        <button
          class="close-button shop-confirm-card__close"
          type="button"
          aria-label="关闭购买确认"
          :disabled="panelBusy"
          @click="closePurchase"
        >
          ×
        </button>

        <div class="shop-confirm-card__hero">
          <span class="shop-confirm-card__emoji">{{ selectedCrop.stages[3] }}</span>
          <div>
            <strong>{{ selectedCrop.name }}</strong>
            <p>{{ selectedCrop.description }}</p>
          </div>
        </div>

        <div class="shop-confirm-card__stats">
          <article>
            <span>拥有种子</span>
            <strong>{{ selectedCrop.quantity }}</strong>
          </article>
          <article>
            <span>单价</span>
            <strong>{{ selectedCrop.seedPrice }}</strong>
          </article>
          <article>
            <span>卖价</span>
            <strong>{{ selectedCrop.fruitPrice }}</strong>
          </article>
          <article>
            <span>最高产量</span>
            <strong>{{ selectedCrop.yield }}</strong>
          </article>
          <article>
            <span>经验</span>
            <strong>{{ selectedCrop.experience }}</strong>
          </article>
        </div>

        <div class="shop-confirm-card__quantity">
          <span>购买数量</span>
          <div class="shop-quantity-stepper">
            <button
              class="shop-quantity-stepper__button"
              type="button"
              :disabled="panelBusy || purchaseQuantity <= 1"
              @click="changeQuantity(-1)"
            >
              −
            </button>
            <input
              v-model.number="purchaseQuantity"
              class="shop-quantity-stepper__input"
              type="number"
              min="1"
              :max="maxPurchaseQuantity"
            />
            <button
              class="shop-quantity-stepper__button"
              type="button"
              :disabled="panelBusy || purchaseQuantity >= maxPurchaseQuantity"
              @click="changeQuantity(1)"
            >
              +
            </button>
          </div>
          <p>当前金币 {{ coin }}，最多可买 {{ maxPurchaseQuantity }} 颗</p>
        </div>

        <div class="shop-confirm-card__actions">
          <button class="panel-ghost-button" type="button" :disabled="panelBusy" @click="closePurchase">
            返回列表
          </button>
          <button
            class="seed-buy-button"
            type="button"
            :disabled="panelBusy || maxPurchaseQuantity <= 0"
            @click="confirmPurchase"
          >
            {{
              maxPurchaseQuantity > 0
                ? `确认购买 ${purchaseQuantity} 颗 · ${totalCost} 金币`
                : "金币不足"
            }}
          </button>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { CropCatalogInventoryItem, CropType } from "../types";

const props = defineProps<{
  shopCatalog: CropCatalogInventoryItem[];
  coin: number;
  panelBusy: boolean;
}>();

const emit = defineEmits<{
  (event: "buy", cropType: CropType, quantity: number): void;
}>();

const selectedCropType = ref<CropType | null>(null);
const purchaseQuantity = ref(1);

const selectedCrop = computed(
  () =>
    props.shopCatalog.find((crop) => crop.type === selectedCropType.value) ?? null
);
const maxPurchaseQuantity = computed(() => {
  if (!selectedCrop.value) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(99, Math.floor(props.coin / selectedCrop.value.seedPrice))
  );
});
const totalCost = computed(() =>
  selectedCrop.value ? selectedCrop.value.seedPrice * purchaseQuantity.value : 0
);

watch(selectedCrop, (crop) => {
  if (!crop) {
    purchaseQuantity.value = 1;
    return;
  }

  purchaseQuantity.value = Math.max(1, Math.min(1, maxPurchaseQuantity.value || 1));
});

watch(maxPurchaseQuantity, (value) => {
  if (value <= 0) {
    purchaseQuantity.value = 1;
    return;
  }

  purchaseQuantity.value = Math.min(Math.max(1, purchaseQuantity.value), value);
});

function openPurchase(cropType: CropType) {
  selectedCropType.value = cropType;
  purchaseQuantity.value = 1;
}

function closePurchase() {
  selectedCropType.value = null;
}

function changeQuantity(step: number) {
  if (maxPurchaseQuantity.value <= 0) {
    return;
  }

  purchaseQuantity.value = Math.min(
    maxPurchaseQuantity.value,
    Math.max(1, purchaseQuantity.value + step)
  );
}

function confirmPurchase() {
  if (!selectedCrop.value || maxPurchaseQuantity.value <= 0) {
    return;
  }

  const quantity = Math.min(
    maxPurchaseQuantity.value,
    Math.max(1, purchaseQuantity.value)
  );

  emit("buy", selectedCrop.value.type, quantity);
  closePurchase();
}
</script>
