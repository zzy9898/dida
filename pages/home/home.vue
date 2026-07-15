<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAppStore } from '@/stores/app'
import GlobalSOS from '@/components/GlobalSOS.vue'
import type { Activity, ClassmateMatch, ThemeEvent } from '@/data/types'
import { MOCK_MATCHES, MOCK_THEMES } from '@/data/mock'

const store = useAppStore()

// ==================== Sub-tab state ====================
const currentTab = ref<number>(0)
const tabs = ['推荐', 'AI偏好', '附近', '主题周']

// ==================== Search state ====================
const searchQuery = ref<string>('')

// ==================== Overlay / Modal state ====================
const showThemeDetail = ref<boolean>(false)
const selectedTheme = ref<ThemeEvent | null>(null)

const showActivityDetail = ref<boolean>(false)
const selectedActivity = ref<Activity | null>(null)

const showReputationModal = ref<boolean>(false)
const reputationTarget = ref<{ name: string; avatar: string; school: string; creditScore: number } | null>(null)

// ==================== AI Match skip state ====================
const skippedMatchIds = ref<Set<string>>(new Set())
const visibleMatchCount = ref<number>(2)

// ==================== Helpers ====================
const getGreeting = (): string => {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 9) return '早上好'
  if (h < 12) return '上午好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
}

const getMockDistance = (id: string): string => {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) & 0xffff
  const distances = ['300m', '500m', '800m', '1.2km', '1.5km', '2.1km', '3.0km', '4.5km']
  return distances[hash % distances.length]
}

const getActivityButtonState = (activity: Activity) => {
  if (!store.userProfile) return { text: '加入', disabled: true, type: 'join' as const }
  const uid = store.userProfile.uid

  if (activity.creatorUid === uid) return { text: '我的活动', disabled: true, type: 'owner' as const }
  if (activity.members.includes(uid)) return { text: '已加入', disabled: true, type: 'joined' as const }
  if (activity.joinedCount >= activity.limit) return { text: '已满', disabled: true, type: 'full' as const }

  const req = store.groupJoinRequests.find(
    (r) => r.activityId === activity.id && r.requesterId === uid
  )
  if (req) {
    if (req.status === 'pending') return { text: '等待合拍', disabled: true, type: 'pending' as const }
    if (req.status === 'approved') return { text: '已加入', disabled: true, type: 'approved' as const }
    if (req.status === 'rejected') return { text: '重新申请', disabled: false, type: 'rejected' as const }
  }

  return { text: '加入', disabled: false, type: 'join' as const }
}

// ==================== Computed ====================
const searchResults = computed(() => {
  if (!searchQuery.value.trim()) return { activities: [] as Activity[], matches: [] as ClassmateMatch[] }
  const q = searchQuery.value.trim().toLowerCase()

  const matchActivities = store.activityList.filter(
    (a) =>
      a.title.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q) ||
      a.location.toLowerCase().includes(q) ||
      a.tags.some((t) => t.toLowerCase().includes(q)) ||
      a.creatorName.toLowerCase().includes(q)
  )

  const matchMatches = MOCK_MATCHES.filter(
    (m) =>
      m.nickname.toLowerCase().includes(q) ||
      m.school.toLowerCase().includes(q) ||
      m.interests.some((i) => i.toLowerCase().includes(q)) ||
      m.personalityTags.some((p) => p.toLowerCase().includes(q)) ||
      m.bio.toLowerCase().includes(q)
  )

  return { activities: matchActivities, matches: matchMatches }
})

const activeMatches = computed(() =>
  MOCK_MATCHES.filter((m) => !skippedMatchIds.value.has(m.uid))
)

const allMatchesSkipped = computed(() => activeMatches.value.length === 0)
const visibleMatches = computed(() => activeMatches.value.slice(0, visibleMatchCount.value))
const hasMoreMatches = computed(() => visibleMatchCount.value < activeMatches.value.length)

const nearbyActivities = computed(() =>
  store.activityList
    .map((a) => ({ ...a, _distance: getMockDistance(a.id) }))
    .sort((a, b) => {
      const parse = (d: string) => {
        const num = parseFloat(d)
        return d.includes('km') ? num * 1000 : num
      }
      return parse(a._distance) - parse(b._distance)
    })
)

const themeRegisteredIds = computed(() => store.registeredThemes)
const themeLongtermIds = computed(() => store.longtermThemes)

// ==================== Actions ====================
const switchTab = (idx: number) => {
  currentTab.value = idx
}

// Search
const clearSearch = () => {
  searchQuery.value = ''
}

// AI Match
const handleSkipMatch = (uid: string) => {
  skippedMatchIds.value = new Set([...skippedMatchIds.value, uid])
}

const handleResetSkips = () => {
  skippedMatchIds.value = new Set()
  visibleMatchCount.value = 2
}

const handleLoadMoreMatches = () => {
  visibleMatchCount.value = Math.min(visibleMatchCount.value + 2, activeMatches.value.length)
}

// Theme
const openThemeDetail = (theme: ThemeEvent) => {
  selectedTheme.value = theme
  showThemeDetail.value = true
}
const closeThemeDetail = () => {
  showThemeDetail.value = false
  selectedTheme.value = null
}
const handleRegisterTheme = (themeId: string) => {
  store.registeredThemes[themeId] = !store.registeredThemes[themeId]
  if (store.registeredThemes[themeId]) {
    uni.showToast({ title: '报名成功！', icon: 'success' })
  } else {
    uni.showToast({ title: '已取消报名', icon: 'none' })
  }
}
const handleLongtermToggle = (themeId: string) => {
  store.longtermThemes[themeId] = !store.longtermThemes[themeId]
}

// Activity
const openActivityDetail = (activity: Activity) => {
  selectedActivity.value = activity
  showActivityDetail.value = true
}
const closeActivityDetail = () => {
  showActivityDetail.value = false
  selectedActivity.value = null
}
const handleJoin = (activityId: string) => {
  store.handleJoinActivity(activityId)
}

// Chat
const handleInitiateChat = (peer: ClassmateMatch) => {
  store.handleInitiateChat({
    uid: peer.uid,
    nickname: peer.nickname,
    name: peer.nickname,
    avatar: peer.avatar,
  })
  uni.switchTab({ url: '/pages/chat/chat' })
}

// Reputation
const openReputationModal = (target: { name: string; avatar: string; school: string; creditScore: number }) => {
  reputationTarget.value = target
  showReputationModal.value = true
}
const closeReputationModal = () => {
  showReputationModal.value = false
  reputationTarget.value = null
}

// ==================== Derived ====================
const currentUserCredit = computed(() => store.userProfile?.creditScore ?? 0)
const currentUserName = computed(() => store.userProfile?.nickname ?? '同学')
</script>

<template>
  <view class="home-page">
    <!-- ======================== Search Bar ======================== -->
    <view class="search-section">
      <view class="search-bar">
        <view class="search-icon">&#128269;</view>
        <input
          class="search-input"
          v-model="searchQuery"
          type="text"
          placeholder="搜索活动、兴趣、同学..."
          placeholder-style="color:#a3a3a3;font-size:28rpx;"
          :focus="false"
        />
        <view v-if="searchQuery" class="search-clear" @tap="clearSearch">&#10005;</view>
      </view>
    </view>

    <!-- ======================== Sub-tab Navigation ======================== -->
    <view class="tab-nav">
      <view
        v-for="(tab, idx) in tabs"
        :key="tab"
        class="tab-item"
        :class="{ active: currentTab === idx }"
        @tap="switchTab(idx)"
      >
        <text class="tab-text">{{ tab }}</text>
      </view>
      <view class="tab-underline" :style="{ transform: 'translateX(' + currentTab * 100 + '%)' }"></view>
    </view>

    <!-- ======================== Search Results (when searching) ======================== -->
    <scroll-view
      v-if="searchQuery.trim()"
      class="content-scroll"
      scroll-y
    >
      <view v-if="searchResults.activities.length === 0 && searchResults.matches.length === 0" class="empty-search">
        <text class="empty-search-text">未找到相关结果，换个关键词试试吧</text>
      </view>

      <view v-if="searchResults.activities.length > 0" class="search-section-label">
        <text class="section-title">相关活动</text>
      </view>
      <view
        v-for="act in searchResults.activities"
        :key="act.id"
        class="search-activity-card"
        @tap="openActivityDetail(act)"
      >
        <image class="search-act-img" :src="act.coverImage" mode="aspectFill" />
        <view class="search-act-info">
          <text class="search-act-title truncate">{{ act.title }}</text>
          <view class="search-act-meta">
            <text class="search-act-loc">{{ act.location }}</text>
            <text class="search-act-count">{{ act.joinedCount }}/{{ act.limit }}人</text>
          </view>
        </view>
      </view>

      <view v-if="searchResults.matches.length > 0" class="search-section-label">
        <text class="section-title">匹配同学</text>
      </view>
      <view
        v-for="m in searchResults.matches"
        :key="m.uid"
        class="search-match-card"
        @tap="openReputationModal({ name: m.nickname, avatar: m.avatar, school: m.school, creditScore: 80 + Math.floor(Math.random() * 21) })"
      >
        <image class="search-match-avatar" :src="m.avatar" mode="aspectFill" />
        <view class="search-match-info">
          <text class="search-match-name">{{ m.nickname }}</text>
          <text class="search-match-school">{{ m.school }}</text>
          <view class="search-match-interests">
            <text v-for="tag in m.interests.slice(0, 3)" :key="tag" class="search-match-tag">{{ tag }}</text>
          </view>
        </view>
        <view class="search-match-rate">{{ m.matchRate }}%匹配</view>
      </view>
    </scroll-view>

    <!-- ======================== Tab Content ======================== -->
    <scroll-view
      v-else
      class="content-scroll"
      scroll-y
    >
      <!-- ===== 推荐 Tab ===== -->
      <view v-if="currentTab === 0" class="tab-content recommend-tab">
        <!-- Banner -->
        <view class="banner-card">
          <view class="banner-content">
            <text class="banner-greeting">{{ getGreeting() }}，{{ currentUserName }}</text>
            <text class="banner-subtitle">今天有 {{ store.activityList.length }} 个活动正在进行，快去看看吧</text>
            <view class="banner-stats">
              <view class="banner-stat-item">
                <text class="banner-stat-num">{{ store.activityList.length }}</text>
                <text class="banner-stat-label">进行中</text>
              </view>
              <view class="banner-stat-divider"></view>
              <view class="banner-stat-item">
                <text class="banner-stat-num">{{ MOCK_MATCHES.length }}</text>
                <text class="banner-stat-label">新匹配</text>
              </view>
              <view class="banner-stat-divider"></view>
              <view class="banner-stat-item">
                <text class="banner-stat-num">{{ MOCK_THEMES.length }}</text>
                <text class="banner-stat-label">主题周</text>
              </view>
            </view>
          </view>
        </view>

        <!-- Weekly Theme Cards (Horizontal Scroll) -->
        <view class="section-header">
          <text class="section-title">本周主题</text>
          <text class="section-more" @tap="switchTab(3)">查看全部 &#8250;</text>
        </view>
        <scroll-view class="theme-h-scroll" scroll-x :show-scrollbar="false">
          <view class="theme-h-list">
            <view
              v-for="theme in MOCK_THEMES"
              :key="theme.id"
              class="theme-h-card"
              @tap="openThemeDetail(theme)"
            >
              <image class="theme-h-img" :src="theme.image" mode="aspectFill" />
              <view class="theme-h-badge">{{ theme.badge }}</view>
              <view class="theme-h-overlay">
                <text class="theme-h-title">{{ theme.title }}</text>
                <view class="theme-h-stats">
                  <text class="theme-h-stat">{{ theme.partnerCount }}人参与</text>
                  <text class="theme-h-stat">{{ theme.activitiesCount }}个活动</text>
                </view>
              </view>
            </view>
          </view>
        </scroll-view>

        <!-- Activity Feed -->
        <view class="section-header">
          <text class="section-title">推荐活动</text>
        </view>
        <view class="activity-feed">
          <view
            v-for="act in store.activityList"
            :key="act.id"
            class="activity-card"
            @tap="openActivityDetail(act)"
          >
            <!-- Cover Image -->
            <view class="act-cover-wrap">
              <image class="act-cover-img" :src="act.coverImage" mode="aspectFill" />
              <view class="act-cover-gradient"></view>
              <view class="act-cover-tags">
                <text v-for="tag in act.tags.slice(0, 2)" :key="tag" class="act-cover-tag">{{ tag }}</text>
              </view>
              <view class="act-cover-mode" v-if="act.mode">
                <text class="act-mode-text">{{ act.mode === 'online' ? '线上' : '线下' }}</text>
              </view>
            </view>

            <!-- Content -->
            <view class="act-content">
              <text class="act-title">{{ act.title }}</text>
              <text class="act-desc">{{ act.description.length > 60 ? act.description.slice(0, 60) + '...' : act.description }}</text>

              <!-- Progress -->
              <view class="act-progress-section">
                <view class="act-progress-bar">
                  <view
                    class="act-progress-fill"
                    :style="{ width: (act.joinedCount / act.limit * 100) + '%' }"
                  ></view>
                </view>
                <view class="act-progress-info">
                  <text class="act-progress-text">已报名 {{ act.joinedCount }}/{{ act.limit }} 人</text>
                  <text class="act-progress-percent">{{ Math.round(act.joinedCount / act.limit * 100) }}%</text>
                </view>
              </view>

              <!-- Footer -->
              <view class="act-footer">
                <view class="act-creator">
                  <image
                    class="act-creator-avatar"
                    :src="act.creatorAvatar"
                    mode="aspectFill"
                    @tap.stop="openReputationModal({ name: act.creatorName, avatar: act.creatorAvatar, school: act.school, creditScore: 70 + Math.floor(Math.random() * 31) })"
                  />
                  <text class="act-creator-name">{{ act.creatorName }}</text>
                </view>
                <view class="act-footer-right">
                  <view class="act-meta">
                    <text class="act-time">{{ act.time }}</text>
                    <text class="act-location">{{ act.location.length > 10 ? act.location.slice(0, 10) + '...' : act.location }}</text>
                  </view>
                  <view
                    class="act-join-btn"
                    :class="{
                      disabled: getActivityButtonState(act).disabled,
                      joined: getActivityButtonState(act).type === 'joined' || getActivityButtonState(act).type === 'approved'
                    }"
                    @tap.stop="handleJoin(act.id)"
                  >
                    <text class="act-join-text">{{ getActivityButtonState(act).text }}</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
        <view class="list-end">-- 已经到底啦 --</view>
      </view>

      <!-- ===== AI偏好 Tab ===== -->
      <view v-else-if="currentTab === 1" class="tab-content ai-tab">
        <view class="section-header">
          <text class="section-title">AI 为你匹配</text>
          <text class="ai-match-count">今天 {{ activeMatches.length }} 位新同学</text>
        </view>

        <!-- Empty State -->
        <view v-if="allMatchesSkipped" class="ai-empty">
          <view class="ai-empty-icon">&#128064;</view>
          <text class="ai-empty-title">没有更多推荐了</text>
          <text class="ai-empty-desc">你已浏览完今天的全部推荐同学，换个视角看看？</text>
          <view class="ai-empty-btn" @tap="handleResetSkips">
            <text class="ai-empty-btn-text">重置推荐</text>
          </view>
        </view>

        <!-- Match Cards -->
        <view v-else class="ai-match-list">
          <view v-for="match in visibleMatches" :key="match.uid" class="match-card">
            <!-- Header -->
            <view class="match-header" @tap="openReputationModal({ name: match.nickname, avatar: match.avatar, school: match.school, creditScore: 75 + Math.floor(Math.random() * 26) })">
              <image class="match-avatar" :src="match.avatar" mode="aspectFill" />
              <view class="match-basic">
                <view class="match-name-row">
                  <text class="match-name">{{ match.nickname }}</text>
                  <view class="match-rate-badge">
                    <text class="match-rate-text">{{ match.matchRate }}% 匹配</text>
                  </view>
                </view>
                <text class="match-school">{{ match.school }}</text>
                <text class="match-distance">&#128205; {{ match.distance }}</text>
              </view>
            </view>

            <!-- Bio -->
            <text class="match-bio">{{ match.bio }}</text>

            <!-- Interest Tags -->
            <view class="match-tags">
              <text v-for="tag in match.interests" :key="tag" class="match-tag">{{ tag }}</text>
            </view>

            <!-- Personality Tags -->
            <view class="match-personality">
              <text v-for="tag in match.personalityTags" :key="tag" class="match-personality-tag">{{ tag }}</text>
            </view>

            <!-- Action Buttons -->
            <view class="match-actions">
              <view class="match-skip-btn" @tap="handleSkipMatch(match.uid)">
                <text class="match-skip-text">不感兴趣</text>
              </view>
              <view class="match-chat-btn" @tap="handleInitiateChat(match)">
                <text class="match-chat-text">发起对话</text>
              </view>
            </view>
          </view>

          <view v-if="hasMoreMatches" class="match-load-more" @tap="handleLoadMoreMatches">
            <text class="match-load-more-text">查看更多匹配</text>
            <text class="match-load-more-arrow">↓</text>
          </view>
          <view v-else-if="activeMatches.length > 2" class="match-list-finished">
            <text>已展示全部匹配</text>
          </view>
        </view>
      </view>

      <!-- ===== 附近 Tab ===== -->
      <view v-else-if="currentTab === 2" class="tab-content nearby-tab">
        <view class="section-header">
          <text class="section-title">附近活动</text>
          <text class="section-sub">按距离排序</text>
        </view>
        <view class="nearby-list">
          <view
            v-for="act in nearbyActivities"
            :key="act.id"
            class="nearby-card"
            @tap="openActivityDetail(act)"
          >
            <image class="nearby-img" :src="act.coverImage" mode="aspectFill" />
            <view class="nearby-info">
              <text class="nearby-title">{{ act.title }}</text>
              <text class="nearby-desc">{{ act.description.slice(0, 40) }}{{ act.description.length > 40 ? '...' : '' }}</text>
              <view class="nearby-meta">
                <text class="nearby-time">{{ act.time }}</text>
                <text class="nearby-loc">{{ act.location.slice(0, 12) }}{{ act.location.length > 12 ? '...' : '' }}</text>
              </view>
            </view>
            <view class="nearby-right">
              <view class="nearby-distance-badge">
                <text class="nearby-distance-text">{{ (act as any)._distance }}</text>
              </view>
              <view class="nearby-people">
                <text class="nearby-people-text">{{ act.joinedCount }}/{{ act.limit }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- Nearby Peers Section -->
        <view class="section-header section-header-mt">
          <text class="section-title">附近同学</text>
        </view>
        <view class="nearby-peer-list">
          <view
            v-for="peer in MOCK_MATCHES"
            :key="peer.uid"
            class="nearby-peer-card"
            @tap="openReputationModal({ name: peer.nickname, avatar: peer.avatar, school: peer.school, creditScore: 75 + Math.floor(Math.random() * 26) })"
          >
            <image class="nearby-peer-avatar" :src="peer.avatar" mode="aspectFill" />
            <view class="nearby-peer-info">
              <text class="nearby-peer-name">{{ peer.nickname }}</text>
              <view class="nearby-peer-tags">
                <text v-for="tag in peer.interests.slice(0, 2)" :key="tag" class="nearby-peer-tag">{{ tag }}</text>
              </view>
            </view>
            <view class="nearby-peer-actions">
              <text class="nearby-peer-distance">{{ peer.distance }}</text>
              <view class="nearby-peer-chat" @tap.stop="handleInitiateChat(peer)">
                <text class="nearby-peer-chat-text">聊天</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- ===== 主题周 Tab ===== -->
      <view v-else-if="currentTab === 3" class="tab-content themes-tab">
        <view class="section-header">
          <text class="section-title">主题周活动</text>
          <text class="section-sub">选择感兴趣的主题报名参与</text>
        </view>
        <view class="theme-list">
          <view
            v-for="theme in MOCK_THEMES"
            :key="theme.id"
            class="theme-card"
            @tap="openThemeDetail(theme)"
          >
            <image class="theme-card-img" :src="theme.image" mode="aspectFill" />
            <view class="theme-card-overlay"></view>
            <view class="theme-card-content">
              <view class="theme-card-badge">{{ theme.badge }}</view>
              <text class="theme-card-title">{{ theme.title }}</text>
              <text class="theme-card-desc">{{ theme.description.slice(0, 50) }}{{ theme.description.length > 50 ? '...' : '' }}</text>
              <view class="theme-card-stats">
                <text class="theme-card-stat">{{ theme.partnerCount }}人参与</text>
                <text class="theme-card-stat-dot"></text>
                <text class="theme-card-stat">{{ theme.activitiesCount }}个活动</text>
              </view>
            </view>
            <!-- Registration Toggle -->
            <view
              class="theme-register-btn"
              :class="{ registered: themeRegisteredIds[theme.id] }"
              @tap.stop="handleRegisterTheme(theme.id)"
            >
              <text class="theme-register-text">
                {{ themeRegisteredIds[theme.id] ? '已报名' : '我要报名' }}
              </text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- ======================== Theme Detail Overlay ======================== -->
    <view class="detail-overlay" :class="{ visible: showThemeDetail }" v-if="selectedTheme">
      <view class="detail-overlay-mask" @tap="closeThemeDetail"></view>
      <view class="detail-panel" :class="{ 'panel-visible': showThemeDetail }">
        <view class="detail-panel-header">
          <view class="detail-panel-handle"></view>
          <view class="detail-panel-back" @tap="closeThemeDetail">
            <text class="detail-panel-back-icon">&#8592;</text>
          </view>
          <text class="detail-panel-title">主题详情</text>
        </view>

        <scroll-view class="detail-panel-body" scroll-y>
          <image class="detail-hero-img" :src="selectedTheme.image" mode="aspectFill" />
          <view class="detail-hero-badge">{{ selectedTheme.badge }}</view>

          <view class="detail-content">
            <text class="detail-title">{{ selectedTheme.title }}</text>
            <text class="detail-desc">{{ selectedTheme.description }}</text>

            <view class="detail-stats-row">
              <view class="detail-stat-item">
                <text class="detail-stat-num">{{ selectedTheme.partnerCount }}</text>
                <text class="detail-stat-label">已参与人数</text>
              </view>
              <view class="detail-stat-item">
                <text class="detail-stat-num">{{ selectedTheme.activitiesCount }}</text>
                <text class="detail-stat-label">关联活动</text>
              </view>
            </view>

            <view class="theme-detail-highlights">
              <text class="theme-detail-section-title">主题亮点</text>
              <view class="theme-detail-chips">
                <text class="theme-detail-chip">校园同好</text>
                <text class="theme-detail-chip">系列活动</text>
                <text class="theme-detail-chip">兴趣交流</text>
              </view>
              <text class="theme-detail-tip">加入主题后，你可以第一时间收到相关活动和同好动态，和更多同学一起探索校园生活。</text>
            </view>

            <!-- Long-term Participation Checkbox -->
            <view class="detail-longterm" @tap="handleLongtermToggle(selectedTheme.id)">
              <view
                class="detail-checkbox"
                :class="{ checked: themeLongtermIds[selectedTheme.id] }"
              >
                <text v-if="themeLongtermIds[selectedTheme.id]" class="detail-checkmark">&#10003;</text>
              </view>
              <text class="detail-longterm-text">长期参与此主题（接收后续系列活动提醒）</text>
            </view>

            <!-- Action -->
            <view
              class="detail-register-btn"
              :class="{ registered: themeRegisteredIds[selectedTheme.id] }"
              @tap="handleRegisterTheme(selectedTheme.id)"
            >
              <text class="detail-register-text">
                {{ themeRegisteredIds[selectedTheme.id] ? '取消报名' : '立即报名' }}
              </text>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- ======================== Activity Detail Overlay ======================== -->
    <view class="detail-overlay" :class="{ visible: showActivityDetail }" v-if="selectedActivity">
      <view class="detail-overlay-mask" @tap="closeActivityDetail"></view>
      <view class="detail-panel" :class="{ 'panel-visible': showActivityDetail }">
        <view class="detail-panel-header">
          <view class="detail-panel-handle"></view>
          <view class="detail-panel-back" @tap="closeActivityDetail">
            <text class="detail-panel-back-icon">&#8592;</text>
          </view>
          <text class="detail-panel-title">活动详情</text>
        </view>

        <scroll-view class="detail-panel-body" scroll-y>
          <image class="detail-hero-img" :src="selectedActivity.coverImage" mode="aspectFill" />
          <view class="detail-hero-gradient"></view>

          <view class="detail-content">
            <text class="detail-title">{{ selectedActivity.title }}</text>

            <!-- Creator -->
            <view
              class="detail-creator"
              @tap="openReputationModal({ name: selectedActivity.creatorName, avatar: selectedActivity.creatorAvatar, school: selectedActivity.school, creditScore: 70 + Math.floor(Math.random() * 31) })"
            >
              <image class="detail-creator-avatar" :src="selectedActivity.creatorAvatar" mode="aspectFill" />
              <view class="detail-creator-info">
                <text class="detail-creator-name">{{ selectedActivity.creatorName }}</text>
                <text class="detail-creator-school">{{ selectedActivity.school }}</text>
              </view>
              <text class="detail-creator-arrow">&#8250;</text>
            </view>

            <text class="detail-desc">{{ selectedActivity.description }}</text>

            <!-- Info Grid -->
            <view class="detail-info-grid">
              <view class="detail-info-item">
                <text class="detail-info-label">时间</text>
                <text class="detail-info-value">{{ selectedActivity.time }}</text>
              </view>
              <view class="detail-info-item">
                <text class="detail-info-label">地点</text>
                <text class="detail-info-value">{{ selectedActivity.location }}</text>
              </view>
              <view class="detail-info-item">
                <text class="detail-info-label">人数</text>
                <text class="detail-info-value">{{ selectedActivity.joinedCount }}/{{ selectedActivity.limit }}人</text>
              </view>
              <view class="detail-info-item">
                <text class="detail-info-label">标签</text>
                <view class="detail-info-tags">
                  <text v-for="tag in selectedActivity.tags" :key="tag" class="detail-info-tag">{{ tag }}</text>
                </view>
              </view>
            </view>

            <!-- Progress in detail -->
            <view class="detail-progress-section">
              <view class="detail-progress-header">
                <text class="detail-progress-label">报名进度</text>
                <text class="detail-progress-percent">{{ Math.round(selectedActivity.joinedCount / selectedActivity.limit * 100) }}%</text>
              </view>
              <view class="detail-progress-bar">
                <view
                  class="detail-progress-fill"
                  :style="{ width: (selectedActivity.joinedCount / selectedActivity.limit * 100) + '%' }"
                ></view>
              </view>
            </view>

            <!-- Members -->
            <view v-if="selectedActivity.members.length > 0" class="detail-members">
              <text class="detail-members-label">已报名成员</text>
              <view class="detail-members-list">
                <image
                  v-for="(mid, idx) in selectedActivity.members"
                  :key="mid"
                  class="detail-member-avatar"
                  :src="'https://images.unsplash.com/photo-' + (1500000000000 + idx * 10000) + '?auto=format&fit=crop&w=80&q=80'"
                  mode="aspectFill"
                />
              </view>
            </view>

            <!-- Join Button -->
            <view
              class="detail-join-btn"
              :class="{
                disabled: getActivityButtonState(selectedActivity).disabled,
                joined: getActivityButtonState(selectedActivity).type === 'joined' || getActivityButtonState(selectedActivity).type === 'approved'
              }"
              @tap="handleJoin(selectedActivity.id)"
            >
              <text class="detail-join-text">{{ getActivityButtonState(selectedActivity).text }}</text>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- ======================== Reputation Modal ======================== -->
    <view class="modal-backdrop" :class="{ visible: showReputationModal }" v-if="showReputationModal" @tap="closeReputationModal">
      <view class="reputation-modal" @tap.stop>
        <view class="modal-close" @tap="closeReputationModal">&#10005;</view>

        <image v-if="reputationTarget" class="reputation-avatar" :src="reputationTarget.avatar" mode="aspectFill" />

        <text v-if="reputationTarget" class="reputation-name">{{ reputationTarget.name }}</text>
        <text v-if="reputationTarget" class="reputation-school">{{ reputationTarget.school }}</text>

        <!-- Credit Score Ring -->
        <view class="credit-ring-wrap">
          <view class="credit-ring">
            <text class="credit-score-num">{{ reputationTarget?.creditScore ?? 0 }}</text>
            <text class="credit-score-label">信用分</text>
          </view>
        </view>

        <view class="credit-scale">
          <view class="credit-scale-bar">
            <view class="credit-scale-fill" :style="{ width: ((reputationTarget?.creditScore ?? 0) / 120 * 100) + '%' }"></view>
          </view>
          <view class="credit-scale-labels">
            <text class="credit-scale-label">0</text>
            <text class="credit-scale-label" :class="{ excellent: (reputationTarget?.creditScore ?? 0) >= 100 }">100</text>
            <text class="credit-scale-label">120</text>
          </view>
        </view>

        <text class="credit-desc">
          {{ (reputationTarget?.creditScore ?? 0) >= 100 ? '信用极佳，值得信赖的校友伙伴' : (reputationTarget?.creditScore ?? 0) >= 80 ? '信用良好，活跃靠谱的大学生' : '信用中等，正常参与校园活动' }}
        </text>
      </view>
    </view>
    <GlobalSOS v-if="!store.userProfile || !store.userProfile.hideSOS" />
  </view>
</template>

<style lang="scss" scoped>
// ==================== Variables ====================
$primary: #2563eb;
$primary-light: #eff6ff;
$primary-dark: #1d4ed8;
$text-primary: #1a1a1a;
$text-secondary: #666666;
$text-tertiary: #999999;
$bg-page: #f5f5f5;
$bg-card: #ffffff;
$border-color: #f0f0f0;
$shadow-card: 0 4rpx 20rpx rgba(0, 0, 0, 0.06);
$shadow-lg: 0 8rpx 40rpx rgba(0, 0, 0, 0.1);
$radius-sm: 12rpx;
$radius-md: 16rpx;
$radius-lg: 24rpx;

// ==================== Page ====================
.home-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  box-sizing: border-box;
  background-color: $bg-page;
  overflow: hidden;
}

// ==================== Search Bar ====================
.search-section {
  padding: calc(var(--status-bar-height) + 88rpx) 24rpx 12rpx;
  background: $bg-card;
  box-sizing: border-box;
}

.search-bar {
  display: flex;
  align-items: center;
  background: #f5f5f5;
  border-radius: 40rpx;
  padding: 14rpx 24rpx;
  height: 72rpx;
  box-sizing: border-box;
  min-width: 0;
}

.search-icon {
  font-size: 28rpx;
  margin-right: 12rpx;
  color: $text-tertiary;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  height: 44rpx;
  font-size: 28rpx;
  color: $text-primary;
  background: transparent;
}

.search-clear {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: #d9d9d9;
  color: #fff;
  font-size: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 12rpx;
  flex-shrink: 0;
}

// ==================== Tab Navigation ====================
.tab-nav {
  display: flex;
  position: relative;
  background: $bg-card;
  padding: 8rpx 0 0;
  border-bottom: 2rpx solid $border-color;
}

.tab-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20rpx 0;
  position: relative;

  &.active .tab-text {
    color: $primary;
    font-weight: 700;
  }
}

.tab-text {
  font-size: 30rpx;
  color: $text-tertiary;
  font-weight: 500;
  transition: color 0.2s ease;
}

.tab-underline {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 25%;
  height: 6rpx;
  background: $primary;
  border-radius: 3rpx;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

// ==================== Content Scroll ====================
.content-scroll {
  flex: 1;
  min-height: 0;
  background: $bg-page;
}

.tab-content {
  padding-bottom: calc(140rpx + env(safe-area-inset-bottom));
}

// ==================== Section Headers ====================
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 24rpx 16rpx;
}

.section-header-mt {
  margin-top: 16rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 700;
  color: $text-primary;
}

.section-sub {
  font-size: 24rpx;
  color: $text-tertiary;
}

.section-more {
  font-size: 24rpx;
  color: $primary;
  font-weight: 500;
}

.list-end {
  text-align: center;
  padding: 32rpx 0;
  font-size: 24rpx;
  color: $text-tertiary;
}

// ==================== Banner ====================
.banner-card {
  margin: 16rpx 24rpx;
  background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%);
  border-radius: $radius-lg;
  padding: 32rpx 28rpx;
  box-shadow: $shadow-lg;
  box-sizing: border-box;
}

@media screen and (max-width: 360px) {
  .search-section { padding-left: 20rpx; padding-right: 20rpx; }
  .search-input { font-size: 24rpx; }
  .tab-text { font-size: 27rpx; }
  .section-title { font-size: 29rpx; }
  .banner-card { margin-left: 20rpx; margin-right: 20rpx; padding: 28rpx 24rpx; }
  .banner-greeting { font-size: 32rpx; }
  .banner-stat-num { font-size: 36rpx; }
}

.banner-content {
  display: flex;
  flex-direction: column;
}

.banner-greeting {
  font-size: 36rpx;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 8rpx;
}

.banner-subtitle {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.75);
  margin-bottom: 24rpx;
}

.banner-stats {
  display: flex;
  align-items: center;
}

.banner-stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

.banner-stat-num {
  font-size: 40rpx;
  font-weight: 800;
  color: #ffffff;
}

.banner-stat-label {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 4rpx;
}

.banner-stat-divider {
  width: 2rpx;
  height: 48rpx;
  background: rgba(255, 255, 255, 0.2);
}

// ==================== Theme Horizontal Scroll ====================
.theme-h-scroll {
  white-space: nowrap;
  width: 100%;
}

.theme-h-list {
  display: flex;
  padding: 0 24rpx;
}

.theme-h-card {
  position: relative;
  width: 320rpx;
  height: 210rpx;
  border-radius: $radius-md;
  overflow: hidden;
  margin-right: 20rpx;
  flex-shrink: 0;
  box-shadow: $shadow-card;
}

.theme-h-img {
  width: 100%;
  height: 100%;
}

.theme-h-badge {
  position: absolute;
  top: 12rpx;
  left: 12rpx;
  background: $primary;
  color: #fff;
  font-size: 20rpx;
  font-weight: 600;
  padding: 4rpx 14rpx;
  border-radius: 8rpx;
}

.theme-h-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 40rpx 16rpx 16rpx;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
}

.theme-h-title {
  font-size: 26rpx;
  font-weight: 700;
  color: #fff;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 6rpx;
}

.theme-h-stats {
  display: flex;
}

.theme-h-stat {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.8);
  margin-right: 16rpx;
}

// ==================== Activity Cards (Feed) ====================
.activity-feed {
  padding: 0 24rpx;
}

.activity-card {
  background: $bg-card;
  border-radius: $radius-lg;
  overflow: hidden;
  margin-bottom: 24rpx;
  box-shadow: $shadow-card;
}

.act-cover-wrap {
  position: relative;
  width: 100%;
  height: 300rpx;
}

.act-cover-img {
  width: 100%;
  height: 100%;
}

.act-cover-gradient {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 140rpx;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.5));
}

.act-cover-tags {
  position: absolute;
  bottom: 16rpx;
  left: 16rpx;
  display: flex;
}

.act-cover-tag {
  background: rgba(255, 255, 255, 0.9);
  color: $text-primary;
  font-size: 20rpx;
  font-weight: 500;
  padding: 4rpx 14rpx;
  border-radius: 20rpx;
  margin-right: 8rpx;
}

.act-cover-mode {
  position: absolute;
  top: 16rpx;
  right: 16rpx;
  background: rgba(0, 0, 0, 0.5);
  padding: 4rpx 14rpx;
  border-radius: 20rpx;
}

.act-mode-text {
  color: #fff;
  font-size: 20rpx;
}

.act-content {
  padding: 20rpx;
}

.act-title {
  font-size: 30rpx;
  font-weight: 700;
  color: $text-primary;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  line-height: 1.4;
  margin-bottom: 10rpx;
}

.act-desc {
  font-size: 24rpx;
  color: $text-secondary;
  line-height: 1.5;
  margin-bottom: 16rpx;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

// Progress Bar
.act-progress-section {
  margin-bottom: 20rpx;
}

.act-progress-bar {
  height: 10rpx;
  background: #e5e7eb;
  border-radius: 5rpx;
  overflow: hidden;
  margin-bottom: 8rpx;
}

.act-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, $primary, #6366f1);
  border-radius: 5rpx;
  transition: width 0.6s ease;
}

.act-progress-info {
  display: flex;
  justify-content: space-between;
}

.act-progress-text {
  font-size: 22rpx;
  color: $text-tertiary;
}

.act-progress-percent {
  font-size: 22rpx;
  color: $primary;
  font-weight: 600;
}

// Footer
.act-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16rpx;
  border-top: 2rpx solid $border-color;
}

.act-creator {
  display: flex;
  align-items: center;
}

.act-creator-avatar {
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  margin-right: 10rpx;
  background: #f0f0f0;
}

.act-creator-name {
  font-size: 24rpx;
  color: $text-secondary;
  font-weight: 500;
}

.act-footer-right {
  display: flex;
  align-items: center;
}

.act-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  margin-right: 16rpx;
}

.act-time {
  font-size: 20rpx;
  color: $text-tertiary;
}

.act-location {
  font-size: 20rpx;
  color: $text-tertiary;
}

.act-join-btn {
  background: $primary;
  border-radius: 32rpx;
  padding: 12rpx 28rpx;

  &.disabled {
    background: #d1d5db;
  }

  &.joined {
    background: #10b981;
  }
}

.act-join-text {
  color: #fff;
  font-size: 24rpx;
  font-weight: 600;
}

// ==================== AI Match Tab ====================
.ai-match-count {
  font-size: 24rpx;
  color: $primary;
  font-weight: 500;
}

// Empty State
.ai-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx 40rpx;
}

.ai-empty-icon {
  font-size: 80rpx;
  margin-bottom: 24rpx;
}

.ai-empty-title {
  font-size: 32rpx;
  font-weight: 700;
  color: $text-primary;
  margin-bottom: 12rpx;
}

.ai-empty-desc {
  font-size: 26rpx;
  color: $text-tertiary;
  margin-bottom: 40rpx;
  text-align: center;
}

.ai-empty-btn {
  background: $primary;
  border-radius: 48rpx;
  padding: 20rpx 60rpx;
}

.ai-empty-btn-text {
  color: #fff;
  font-size: 28rpx;
  font-weight: 600;
}

// Match Cards
.ai-match-list {
  padding: 8rpx 24rpx;
}

.match-card {
  background: $bg-card;
  border-radius: $radius-lg;
  padding: 28rpx;
  margin-bottom: 24rpx;
  box-shadow: $shadow-card;
}

.match-header {
  display: flex;
  align-items: center;
  margin-bottom: 18rpx;
}

.match-avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  margin-right: 20rpx;
  background: #f0f0f0;
}

.match-basic {
  flex: 1;
}

.match-name-row {
  display: flex;
  align-items: center;
  margin-bottom: 6rpx;
}

.match-name {
  font-size: 30rpx;
  font-weight: 700;
  color: $text-primary;
}

.match-rate-badge {
  margin-left: 12rpx;
  background: $primary-light;
  padding: 4rpx 14rpx;
  border-radius: 16rpx;
}

.match-rate-text {
  font-size: 22rpx;
  color: $primary;
  font-weight: 700;
}

.match-school {
  font-size: 24rpx;
  color: $text-secondary;
  display: block;
  margin-bottom: 4rpx;
}

.match-distance {
  font-size: 22rpx;
  color: $text-tertiary;
}

.match-bio {
  font-size: 26rpx;
  color: $text-secondary;
  line-height: 1.5;
  display: block;
  margin-bottom: 18rpx;
}

.match-tags {
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 14rpx;
}

.match-tag {
  background: #f3f4f6;
  color: $text-secondary;
  font-size: 22rpx;
  padding: 6rpx 16rpx;
  border-radius: 16rpx;
  margin-right: 10rpx;
  margin-bottom: 8rpx;
}

.match-personality {
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 22rpx;
}

.match-personality-tag {
  background: #fef3c7;
  color: #92400e;
  font-size: 20rpx;
  padding: 4rpx 14rpx;
  border-radius: 12rpx;
  margin-right: 8rpx;
  margin-bottom: 6rpx;
}

.match-actions {
  display: flex;
  gap: 16rpx;
}

.match-skip-btn {
  flex: 1;
  border: 2rpx solid #d1d5db;
  border-radius: 40rpx;
  padding: 18rpx 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:active {
    background: #f9fafb;
  }
}

.match-skip-text {
  font-size: 28rpx;
  color: $text-secondary;
  font-weight: 500;
}

.match-chat-btn {
  flex: 1;
  background: $primary;
  border-radius: 40rpx;
  padding: 18rpx 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:active {
    background: $primary-dark;
  }
}

.match-chat-text {
  font-size: 28rpx;
  color: #fff;
  font-weight: 600;
}

// ==================== Nearby Tab ====================
.nearby-list {
  padding: 0 24rpx;
}

.nearby-card {
  display: flex;
  background: $bg-card;
  border-radius: $radius-md;
  padding: 20rpx;
  margin-bottom: 16rpx;
  box-shadow: $shadow-card;
  align-items: center;
}

.nearby-img {
  width: 120rpx;
  height: 120rpx;
  border-radius: $radius-sm;
  flex-shrink: 0;
  margin-right: 20rpx;
  background: #f0f0f0;
}

.nearby-info {
  flex: 1;
  min-width: 0;
}

.nearby-title {
  font-size: 28rpx;
  font-weight: 600;
  color: $text-primary;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 6rpx;
}

.nearby-desc {
  font-size: 22rpx;
  color: $text-tertiary;
  display: block;
  margin-bottom: 8rpx;
}

.nearby-meta {
  display: flex;
  align-items: center;
}

.nearby-time {
  font-size: 20rpx;
  color: $text-tertiary;
  margin-right: 16rpx;
}

.nearby-loc {
  font-size: 20rpx;
  color: $text-tertiary;
}

.nearby-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex-shrink: 0;
  margin-left: 16rpx;
}

.nearby-distance-badge {
  background: $primary-light;
  padding: 6rpx 16rpx;
  border-radius: 16rpx;
  margin-bottom: 8rpx;
}

.nearby-distance-text {
  font-size: 22rpx;
  color: $primary;
  font-weight: 600;
}

.nearby-people {
  background: #f3f4f6;
  padding: 4rpx 12rpx;
  border-radius: 12rpx;
}

.nearby-people-text {
  font-size: 20rpx;
  color: $text-tertiary;
}

// Nearby Peers
.nearby-peer-list {
  padding: 0 24rpx;
}

.nearby-peer-card {
  display: flex;
  align-items: center;
  background: $bg-card;
  border-radius: $radius-md;
  padding: 20rpx 24rpx;
  margin-bottom: 14rpx;
  box-shadow: $shadow-card;
}

.nearby-peer-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  margin-right: 20rpx;
  background: #f0f0f0;
}

.nearby-peer-info {
  flex: 1;
}

.nearby-peer-name {
  font-size: 28rpx;
  font-weight: 600;
  color: $text-primary;
  display: block;
  margin-bottom: 6rpx;
}

.nearby-peer-tags {
  display: flex;
}

.nearby-peer-tag {
  font-size: 20rpx;
  color: $text-tertiary;
  background: #f3f4f6;
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
  margin-right: 8rpx;
}

.nearby-peer-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.nearby-peer-distance {
  font-size: 22rpx;
  color: $text-tertiary;
  margin-bottom: 8rpx;
}

.nearby-peer-chat {
  background: $primary;
  padding: 8rpx 24rpx;
  border-radius: 28rpx;
}

.nearby-peer-chat-text {
  font-size: 22rpx;
  color: #fff;
  font-weight: 600;
}

// ==================== Theme Week Tab ====================
.theme-list {
  padding: 0 24rpx;
}

.theme-card {
  position: relative;
  border-radius: $radius-lg;
  overflow: hidden;
  margin-bottom: 28rpx;
  box-shadow: $shadow-card;
  background: $bg-card;
}

.theme-card-img {
  width: 100%;
  height: 320rpx;
}

.theme-card-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.65) 100%);
}

.theme-card-content {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 40rpx 24rpx 24rpx;
}

.theme-card-badge {
  display: inline-block;
  background: $primary;
  color: #fff;
  font-size: 20rpx;
  font-weight: 600;
  padding: 4rpx 14rpx;
  border-radius: 8rpx;
  margin-bottom: 10rpx;
}

.theme-card-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #fff;
  display: block;
  margin-bottom: 8rpx;
}

.theme-card-desc {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
  display: block;
  margin-bottom: 12rpx;
  line-height: 1.4;
}

.theme-card-stats {
  display: flex;
  align-items: center;
}

.theme-card-stat {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.7);
}

.theme-card-stat-dot {
  width: 4rpx;
  height: 4rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.4);
  margin: 0 12rpx;
}

.theme-register-btn {
  position: absolute;
  top: 20rpx;
  right: 20rpx;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 32rpx;
  padding: 12rpx 28rpx;

  &.registered {
    background: #10b981;
  }
}

.theme-register-text {
  font-size: 24rpx;
  font-weight: 600;
  color: $primary;

  .registered & {
    color: #fff;
  }
}

// ==================== Search Results ====================
.empty-search {
  display: flex;
  justify-content: center;
  padding: 80rpx 0;
}

.empty-search-text {
  font-size: 26rpx;
  color: $text-tertiary;
}

.search-section-label {
  padding: 24rpx 24rpx 12rpx;
}

.search-activity-card {
  display: flex;
  align-items: center;
  margin: 8rpx 24rpx;
  background: $bg-card;
  border-radius: $radius-md;
  padding: 16rpx;
  box-shadow: $shadow-card;
}

.search-act-img {
  width: 96rpx;
  height: 96rpx;
  border-radius: $radius-sm;
  margin-right: 16rpx;
  background: #f0f0f0;
}

.search-act-info {
  flex: 1;
  min-width: 0;
}

.search-act-title {
  font-size: 28rpx;
  font-weight: 600;
  color: $text-primary;
  display: block;
  margin-bottom: 8rpx;
}

.search-act-meta {
  display: flex;
  justify-content: space-between;
}

.search-act-loc {
  font-size: 22rpx;
  color: $text-tertiary;
}

.search-act-count {
  font-size: 22rpx;
  color: $primary;
  font-weight: 500;
}

.search-match-card {
  display: flex;
  align-items: center;
  margin: 8rpx 24rpx;
  background: $bg-card;
  border-radius: $radius-md;
  padding: 20rpx;
  box-shadow: $shadow-card;
}

.search-match-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  margin-right: 18rpx;
  background: #f0f0f0;
}

.search-match-info {
  flex: 1;
}

.search-match-name {
  font-size: 28rpx;
  font-weight: 600;
  color: $text-primary;
  display: block;
  margin-bottom: 4rpx;
}

.search-match-school {
  font-size: 22rpx;
  color: $text-tertiary;
  display: block;
  margin-bottom: 6rpx;
}

.search-match-interests {
  display: flex;
  flex-wrap: wrap;
}

.search-match-tag {
  font-size: 20rpx;
  color: $primary;
  background: $primary-light;
  padding: 2rpx 10rpx;
  border-radius: 8rpx;
  margin-right: 8rpx;
}

.search-match-rate {
  font-size: 26rpx;
  font-weight: 700;
  color: $primary;
  flex-shrink: 0;
  margin-left: 16rpx;
}

// ==================== Detail Overlay ====================
.detail-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 100;
  visibility: hidden;

  &.visible {
    visibility: visible;
  }
}

.detail-overlay-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  opacity: 0;
  transition: opacity 0.3s ease;

  .visible & {
    opacity: 1;
  }
}

.detail-panel {
  position: absolute;
  top: 80rpx;
  left: 0;
  right: 0;
  bottom: 0;
  background: $bg-card;
  border-radius: $radius-lg $radius-lg 0 0;
  transform: translateY(100%);
  transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;

  &.panel-visible {
    transform: translateY(0);
  }
}

.detail-panel-header {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20rpx 24rpx 16rpx;
  position: relative;
  border-bottom: 2rpx solid $border-color;
}

.detail-panel-handle {
  width: 64rpx;
  height: 6rpx;
  border-radius: 3rpx;
  background: #d9d9d9;
  position: absolute;
  top: 10rpx;
  left: 50%;
  transform: translateX(-50%);
}

.detail-panel-title {
  font-size: 30rpx;
  font-weight: 700;
  color: $text-primary;
}

.detail-panel-close {
  position: absolute;
  right: 24rpx;
  top: 50%;
  transform: translateY(-50%);
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  color: $text-secondary;
}

.match-load-more {
  height: 88rpx;
  margin: 8rpx 24rpx 28rpx;
  border-radius: 44rpx;
  border: 2rpx solid #bfdbfe;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  box-shadow: 0 4rpx 14rpx rgba(37, 99, 235, 0.08);
}

.match-load-more-text,
.match-load-more-arrow {
  color: $primary;
  font-size: 27rpx;
  font-weight: 600;
}

.match-list-finished {
  padding: 14rpx 0 32rpx;
  color: $text-tertiary;
  font-size: 23rpx;
  text-align: center;
}

.detail-panel-back {
  position: absolute;
  left: 24rpx;
  top: 50%;
  transform: translateY(-50%);
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.detail-panel-back-icon {
  font-size: 40rpx;
  line-height: 1;
  color: $text-primary;
}

.theme-detail-highlights {
  margin-top: 28rpx;
  padding: 24rpx;
  border-radius: 20rpx;
  background: linear-gradient(135deg, #eff6ff, #f8fafc);
}

.theme-detail-section-title {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: $text-primary;
  margin-bottom: 16rpx;
}

.theme-detail-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.theme-detail-chip {
  padding: 8rpx 18rpx;
  border-radius: 20rpx;
  color: $primary;
  background: #dbeafe;
  font-size: 22rpx;
}

.theme-detail-tip {
  display: block;
  color: $text-secondary;
  font-size: 24rpx;
  line-height: 1.6;
}

.detail-panel-body {
  flex: 1;
}

.detail-hero-img {
  width: 100%;
  height: 360rpx;
  display: block;
}

.detail-hero-badge {
  position: absolute;
  top: 380rpx;
  left: 24rpx;
  background: $primary;
  color: #fff;
  font-size: 22rpx;
  font-weight: 600;
  padding: 6rpx 18rpx;
  border-radius: 10rpx;
}

.detail-hero-gradient {
  position: absolute;
  top: 220rpx;
  left: 0;
  right: 0;
  height: 140rpx;
  background: linear-gradient(transparent, rgba(0,0,0,0.4));
}

.detail-content {
  padding: 28rpx 24rpx 40rpx;
}

.detail-title {
  font-size: 34rpx;
  font-weight: 700;
  color: $text-primary;
  display: block;
  margin-bottom: 16rpx;
  line-height: 1.4;
}

.detail-creator {
  display: flex;
  align-items: center;
  background: #f9fafb;
  border-radius: $radius-md;
  padding: 20rpx;
  margin-bottom: 20rpx;
}

.detail-creator-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  margin-right: 16rpx;
  background: #f0f0f0;
}

.detail-creator-info {
  flex: 1;
}

.detail-creator-name {
  font-size: 28rpx;
  font-weight: 600;
  color: $text-primary;
  display: block;
}

.detail-creator-school {
  font-size: 22rpx;
  color: $text-tertiary;
}

.detail-creator-arrow {
  font-size: 32rpx;
  color: $text-tertiary;
}

.detail-desc {
  font-size: 26rpx;
  color: $text-secondary;
  line-height: 1.6;
  margin-bottom: 28rpx;
  display: block;
}

// Info Grid
.detail-info-grid {
  display: flex;
  flex-wrap: wrap;
  background: #f9fafb;
  border-radius: $radius-md;
  padding: 16rpx;
  margin-bottom: 24rpx;
}

.detail-info-item {
  width: 50%;
  padding: 12rpx;
}

.detail-info-label {
  font-size: 22rpx;
  color: $text-tertiary;
  display: block;
  margin-bottom: 4rpx;
}

.detail-info-value {
  font-size: 26rpx;
  color: $text-primary;
  font-weight: 500;
}

.detail-info-tags {
  display: flex;
  flex-wrap: wrap;
}

.detail-info-tag {
  font-size: 20rpx;
  color: $primary;
  background: $primary-light;
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
  margin-right: 8rpx;
  margin-bottom: 4rpx;
}

// Detail Progress
.detail-progress-section {
  margin-bottom: 24rpx;
}

.detail-progress-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10rpx;
}

.detail-progress-label {
  font-size: 24rpx;
  color: $text-secondary;
  font-weight: 500;
}

.detail-progress-percent {
  font-size: 24rpx;
  color: $primary;
  font-weight: 700;
}

.detail-progress-bar {
  height: 12rpx;
  background: #e5e7eb;
  border-radius: 6rpx;
  overflow: hidden;
}

.detail-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, $primary, #6366f1);
  border-radius: 6rpx;
  transition: width 0.6s ease;
}

// Detail Members
.detail-members {
  margin-bottom: 24rpx;
}

.detail-members-label {
  font-size: 24rpx;
  color: $text-secondary;
  font-weight: 500;
  display: block;
  margin-bottom: 12rpx;
}

.detail-members-list {
  display: flex;
}

.detail-member-avatar {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  margin-right: 8rpx;
  background: #f0f0f0;
  border: 3rpx solid $bg-card;
}

// Detail Join Button
.detail-join-btn {
  background: $primary;
  border-radius: 48rpx;
  padding: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 20rpx;

  &.disabled {
    background: #d1d5db;
  }

  &.joined {
    background: #10b981;
  }
}

.detail-join-text {
  color: #fff;
  font-size: 30rpx;
  font-weight: 700;
}

// Long-term Checkbox
.detail-longterm {
  display: flex;
  align-items: center;
  margin-bottom: 28rpx;
  padding: 16rpx 0;
}

.detail-checkbox {
  width: 40rpx;
  height: 40rpx;
  border-radius: 6rpx;
  border: 3rpx solid #d1d5db;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 14rpx;
  flex-shrink: 0;
  transition: all 0.2s ease;

  &.checked {
    background: $primary;
    border-color: $primary;
  }
}

.detail-checkmark {
  font-size: 24rpx;
  color: #fff;
  font-weight: 700;
}

.detail-longterm-text {
  font-size: 26rpx;
  color: $text-secondary;
}

// Detail Register Button
.detail-register-btn {
  background: $primary;
  border-radius: 48rpx;
  padding: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;

  &.registered {
    background: #f3f4f6;
  }
}

.detail-register-text {
  color: #fff;
  font-size: 30rpx;
  font-weight: 700;

  .registered & {
    color: $text-secondary;
  }
}

// Stats Row
.detail-stats-row {
  display: flex;
  background: $primary-light;
  border-radius: $radius-md;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.detail-stat-item {
  flex: 1;
  text-align: center;
}

.detail-stat-num {
  font-size: 36rpx;
  font-weight: 800;
  color: $primary;
  display: block;
}

.detail-stat-label {
  font-size: 22rpx;
  color: $text-tertiary;
  margin-top: 4rpx;
  display: block;
}

// ==================== Reputation Modal ====================
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  opacity: 0;
  transition: opacity 0.3s ease;

  &.visible {
    opacity: 1;
  }
}

.reputation-modal {
  background: $bg-card;
  border-radius: $radius-lg;
  padding: 48rpx 40rpx 36rpx;
  width: 560rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  box-shadow: $shadow-lg;
  transform: scale(0.9);
  transition: transform 0.3s ease;

  .modal-backdrop.visible & {
    transform: scale(1);
  }
}

.modal-close {
  position: absolute;
  top: 16rpx;
  right: 16rpx;
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
  color: $text-secondary;
}

.reputation-avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  margin-bottom: 16rpx;
  background: #f0f0f0;
  border: 4rpx solid $primary-light;
}

.reputation-name {
  font-size: 32rpx;
  font-weight: 700;
  color: $text-primary;
  margin-bottom: 6rpx;
}

.reputation-school {
  font-size: 24rpx;
  color: $text-tertiary;
  margin-bottom: 28rpx;
}

// Credit Score Ring
.credit-ring-wrap {
  margin-bottom: 20rpx;
}

.credit-ring {
  width: 140rpx;
  height: 140rpx;
  border-radius: 50%;
  background: $primary-light;
  border: 5rpx solid $primary;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.credit-score-num {
  font-size: 44rpx;
  font-weight: 800;
  color: $primary;
  line-height: 1.1;
}

.credit-score-label {
  font-size: 20rpx;
  color: $primary;
  font-weight: 600;
}

// Credit Scale
.credit-scale {
  width: 100%;
  margin-bottom: 16rpx;
}

.credit-scale-bar {
  height: 10rpx;
  background: #e5e7eb;
  border-radius: 5rpx;
  overflow: hidden;
  margin-bottom: 6rpx;
}

.credit-scale-fill {
  height: 100%;
  background: linear-gradient(90deg, #ef4444, #f59e0b, #10b981, $primary);
  border-radius: 5rpx;
  transition: width 0.6s ease;
}

.credit-scale-labels {
  display: flex;
  justify-content: space-between;
}

.credit-scale-label {
  font-size: 20rpx;
  color: $text-tertiary;

  &.excellent {
    color: #10b981;
    font-weight: 700;
  }
}

.credit-desc {
  font-size: 24rpx;
  color: $text-secondary;
  text-align: center;
  line-height: 1.5;
}

// ==================== Utility Truncate ====================
.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>

