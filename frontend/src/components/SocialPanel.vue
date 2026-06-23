<template>
  <div class="social-panel">
    <div class="social-panel__top">
      <div class="social-tabs">
        <button
          :class="['warehouse-tab', { 'warehouse-tab--active': activeTab === 'leaderboard' }]"
          type="button"
          @click="$emit('update:tab', 'leaderboard')"
        >
          玩家
        </button>
        <button
          :class="['warehouse-tab', { 'warehouse-tab--active': activeTab === 'friends' }]"
          type="button"
          @click="$emit('update:tab', 'friends')"
        >
          好友
        </button>
      </div>

      <div class="leaderboard-panel__header">
        <div>
          <strong class="social-result-count">共 {{ total }} 位玩家</strong>
        </div>
        <button class="panel-ghost-button" type="button" :disabled="loading" @click="$emit('refresh')">
          {{ loading ? "刷新中..." : activeTab === "leaderboard" ? "刷新排行" : "重新搜索" }}
        </button>
      </div>

      <label class="social-search">
        <span class="social-search__icon">⌕</span>
        <input
          :value="query"
          class="social-search__input"
          type="search"
          :placeholder="activeTab === 'leaderboard' ? '搜索玩家昵称或用户名...' : '搜索好友昵称或用户名...'"
          @input="$emit('update:query', ($event.target as HTMLInputElement).value)"
        />
      </label>
    </div>

    <div class="social-panel__list-shell">
      <div v-if="players.length > 0" class="leaderboard-list leaderboard-list--scroll">
        <article
          v-for="player in players"
          :key="`${player.user.id}-${player.rank}`"
          class="leaderboard-card"
        >
          <div class="leaderboard-card__rank">{{ player.rank }}</div>

          <div
            :class="['leaderboard-avatar', { 'leaderboard-avatar--image': !!player.user.photo_url }]"
            :style="getAvatarStyle(player.user.photo_url)"
          >
            <span v-if="!player.user.photo_url">{{ getInitial(player.user.first_name) }}</span>
          </div>

          <div class="leaderboard-card__meta">
            <strong>{{ player.user.first_name }}</strong>
            <p>@{{ player.user.username || `user_${player.user.id}` }}</p>
          </div>

          <div class="leaderboard-card__stats">
            <span>Lv.{{ player.progression.level }}</span>
            <span>{{ player.coin }} 金币</span>
            <!-- <span>{{ player.progression.experience }} EXP</span> -->
          </div>

          <div class="leaderboard-card__actions">
            <button
              class="panel-ghost-button leaderboard-card__button"
              type="button"
              :disabled="loading || player.isCurrentUser"
              @click="$emit('visit', player)"
            >
              {{ player.isCurrentUser ? "自己" : "拜访" }}
            </button>
            <button
              class="panel-ghost-button leaderboard-card__button"
              type="button"
              :disabled="loading || player.isCurrentUser"
              @click="$emit('add-friend', player)"
            >
              加好友
            </button>
          </div>
        </article>
      </div>

      <div v-else class="panel-empty panel-empty--warehouse social-panel__empty">
        <strong>
          {{
            loading
              ? "正在加载玩家列表"
              : activeTab === "friends" && query.trim() === ""
                ? "输入昵称开始搜索好友"
                : "没有找到匹配的玩家"
          }}
        </strong>
        <p>
          {{
            loading
              ? "稍等一下，正在从服务器读取玩家数据。"
              : activeTab === "friends" && query.trim() === ""
                ? "好友系统后面会继续扩展，先通过搜索来筛选玩家。"
                : "换一个昵称、用户名或翻页试试看。"
          }}
        </p>
      </div>
    </div>

    <div class="social-pagination">
      <button
        class="panel-ghost-button"
        type="button"
        :disabled="loading || page <= 1"
        @click="$emit('change-page', page - 1)"
      >
        上一页
      </button>
      <strong>{{ totalPages > 0 ? `${page}/${totalPages}` : "1/1" }}</strong>
      <button
        class="panel-ghost-button"
        type="button"
        :disabled="loading || page >= totalPages"
        @click="$emit('change-page', page + 1)"
      >
        下一页
      </button>
    </div>

    <footer v-if="currentUser" class="social-self-card">
      <div
        :class="['social-self-card__avatar', { 'social-self-card__avatar--image': !!currentUser.user.photo_url }]"
        :style="getAvatarStyle(currentUser.user.photo_url)"
      >
        <span v-if="!currentUser.user.photo_url">{{ getInitial(currentUser.user.first_name) }}</span>
      </div>

      <div class="social-self-card__meta">
        <strong>{{ currentUser.user.first_name }}</strong>
        <p>Lv.{{ currentUser.progression.level }}</p>
      </div>

      <div class="social-self-card__rank">
        <span>我的排名</span>
        <strong>#{{ currentUser.rank }}</strong>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import type { CSSProperties } from "vue";
import type { LeaderboardPlayer, SocialTab } from "../types";

defineProps<{
  activeTab: SocialTab;
  query: string;
  players: LeaderboardPlayer[];
  currentUser: LeaderboardPlayer | null;
  loading: boolean;
  page: number;
  totalPages: number;
  total: number;
}>();

defineEmits<{
  (event: "refresh"): void;
  (event: "update:tab", tab: SocialTab): void;
  (event: "update:query", query: string): void;
  (event: "change-page", page: number): void;
  (event: "visit", player: LeaderboardPlayer): void;
  (event: "add-friend", player: LeaderboardPlayer): void;
}>();

function getInitial(name: string) {
  return name.slice(0, 1).toUpperCase();
}

function getAvatarStyle(photoUrl?: string): CSSProperties {
  if (!photoUrl) {
    return {};
  }

  return {
    backgroundImage: `url("${photoUrl}")`,
  };
}
</script>
