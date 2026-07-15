<template>
  <view class="profile-page">
    <!-- Header -->
    <view class="profile-header">
      <text class="profile-title">我的</text>
      <view class="header-actions">
        <view class="header-btn" @click="showEditProfileModal = true">
          <text class="header-btn-text">编辑</text>
        </view>
        <view class="header-btn settings-btn" @click="showSidebar = true">
          <text class="header-btn-text">设置</text>
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="profile-body">
      <!-- Profile Card -->
      <view class="profile-card">
        <view class="profile-card-top">
          <view class="avatar-wrap">
            <image :src="store.userProfile?.avatar || ''" class="profile-avatar" mode="aspectFill" />
            <view class="credit-badge">
              <text class="credit-badge-text">{{ store.userProfile?.creditScore || 0 }}</text>
            </view>
          </view>
          <view class="profile-info">
            <view class="nickname-row">
              <text class="nickname">{{ store.userProfile?.nickname || '未登录' }}</text>
              <text class="verified-mark">已认证</text>
            </view>
            <text class="dida-id">DIDA ID: {{ store.userProfile?.uid || '---' }}</text>
            <text class="school-name">{{ store.userProfile?.school || '' }}</text>
          </view>
        </view>
        <!-- Interest Tags -->
        <view v-if="store.userProfile?.interests?.length" class="interest-tags">
          <text v-for="tag in store.userProfile.interests" :key="tag" class="interest-tag">{{ tag }}</text>
        </view>
      </view>

      <!-- Stats Row -->
      <view class="stats-row">
        <view class="stat-item">
          <text class="stat-num">{{ joinedActivityCount }}</text>
          <text class="stat-label">已参加活动</text>
        </view>
        <view class="stat-divider" />
        <view class="stat-item">
          <text class="stat-num">{{ partnerCount }}</text>
          <text class="stat-label">我的搭子</text>
        </view>
        <view class="stat-divider" />
        <view class="stat-item">
          <text class="stat-num">{{ companionRating }}</text>
          <text class="stat-label">搭子评分</text>
        </view>
      </view>

      <!-- Sub Tabs -->
      <view class="sub-tabs">
        <view
          v-for="tab in subTabs"
          :key="tab.key"
          :class="['sub-tab', { active: profileSubTab === tab.key }]"
          @click="profileSubTab = tab.key"
        >
          <text class="sub-tab-text">{{ tab.label }}</text>
        </view>
      </view>

      <!-- Tab Content -->
      <!-- Activities Tab -->
      <view v-if="profileSubTab === 'activities'" class="tab-content">
        <view v-if="allMyActivities.length === 0" class="tab-empty">
          <text class="tab-empty-text">暂无活动记录</text>
        </view>
        <view v-for="act in allMyActivities" :key="act.id" class="activity-card">
          <image :src="act.coverImage" class="act-cover" mode="aspectFill" />
          <view class="act-info">
            <view class="act-top-row">
              <text class="act-title">{{ act.title }}</text>
              <view :class="['act-status', getActivityStatusClass(act)]">
                <text class="act-status-text">{{ getActivityStatus(act) }}</text>
              </view>
            </view>
            <text class="act-detail">{{ act.time }} · {{ act.location }}</text>
            <text class="act-members">{{ act.joinedCount }}/{{ act.limit }} 人已加入</text>
            <!-- Rating button for finished activities -->
            <view
              v-if="isActivityFinished(act)"
              class="rate-btn"
              @click="openRatingModal(act.id)"
            >
              <text class="rate-btn-text">{{ activityRatings[act.id] ? '已评分' : '评价搭子' }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- Posts Tab -->
      <view v-if="profileSubTab === 'posts'" class="tab-content">
        <view v-if="store.myPublishedPosts.length === 0" class="tab-empty">
          <text class="tab-empty-text">暂未发布帖子</text>
        </view>
        <view v-for="post in store.myPublishedPosts" :key="post.id" class="post-card-sm">
          <view class="post-sm-top">
            <text class="post-sm-title">{{ post.title }}</text>
            <view class="post-sm-tag">
              <text class="post-sm-tag-text">{{ post.category || '综合' }}</text>
            </view>
          </view>
          <text class="post-sm-content">{{ post.content.substring(0, 80) }}{{ post.content.length > 80 ? '...' : '' }}</text>
          <view v-if="post.images?.length" class="post-sm-images">
            <image
              v-for="(img, idx) in post.images.slice(0, 3)"
              :key="idx"
              :src="img"
              class="post-sm-img"
              mode="aspectFill"
            />
          </view>
          <view class="post-sm-footer">
            <text class="post-sm-time">{{ post.createdAt }}</text>
            <text class="post-sm-likes">❤️ {{ post.likes }} · 💬 {{ post.comments.length }}</text>
          </view>
        </view>
      </view>

      <!-- Longterm Tab -->
      <view v-if="profileSubTab === 'longterm'" class="tab-content">
        <view v-if="longtermList.length === 0" class="tab-empty">
          <text class="tab-empty-text">暂无固定参加的主题活动</text>
          <text class="tab-empty-sub">在首页主题活动中报名即可加入</text>
        </view>
        <view v-for="theme in longtermList" :key="theme.id" class="longterm-card">
          <image :src="theme.image" class="longterm-cover" mode="aspectFill" />
          <view class="longterm-info">
            <text class="longterm-title">{{ theme.title }}</text>
            <text class="longterm-badge">{{ theme.badge }}</text>
            <text class="longterm-desc">{{ theme.description }}</text>
            <view class="longterm-stats">
              <text class="longterm-stat">{{ theme.partnerCount }} 搭子 · {{ theme.activitiesCount }} 活动</text>
            </view>
            <view class="longterm-remind-btn">
              <text class="remind-btn-text">设置提醒</text>
            </view>
          </view>
        </view>
      </view>

      <!-- Liked Tab -->
      <view v-if="profileSubTab === 'liked'" class="tab-content">
        <view v-if="store.myLikedPosts.length === 0" class="tab-empty">
          <text class="tab-empty-text">暂无点赞的帖子</text>
        </view>
        <view v-for="post in store.myLikedPosts" :key="post.id" class="liked-card">
          <image :src="post.authorAvatar" class="liked-avatar" mode="aspectFill" />
          <view class="liked-info">
            <text class="liked-title">{{ post.title }}</text>
            <text class="liked-author">{{ post.authorName }}</text>
          </view>
          <text class="liked-heart">❤️</text>
        </view>
      </view>

      <view style="height: 40rpx;" />
    </scroll-view>

    <!-- ==================== SIDEBAR DRAWER ==================== -->
    <view v-show="showSidebar" class="sidebar-overlay" @click="showSidebar = false">
      <view :class="['sidebar-panel', { 'sidebar-open': showSidebar }]" @click.stop>
        <view class="sidebar-header">
          <text class="sidebar-title">设置中心</text>
          <view class="sidebar-close" @click="showSidebar = false">
            <text class="sidebar-close-text">✕</text>
          </view>
        </view>

        <view class="sidebar-section">
          <view class="sidebar-item" @click="showSidebar = false; showCreditLogModal = true">
            <text class="sidebar-item-text">信用评分</text>
            <text class="sidebar-item-value">{{ store.userProfile?.creditScore || 0 }} 分</text>
          </view>
          <view class="sidebar-item" @click="showSidebar = false; showEditProfileModal = true">
            <text class="sidebar-item-text">编辑资料</text>
            <text class="sidebar-item-arrow">›</text>
          </view>
          <view class="sidebar-item" @click="showSidebar = false; showEmergencyContactModal = true">
            <text class="sidebar-item-text">紧急联系人</text>
            <text class="sidebar-item-arrow">›</text>
          </view>
          <view class="sidebar-item">
            <text class="sidebar-item-text">隐藏SOS功能</text>
            <switch
              :checked="store.userProfile?.hideSOS || false"
              color="#2563eb"
              @change="toggleHideSOS"
            />
          </view>
          <view class="sidebar-item" @click="showSidebar = false; showDraftsModal = true">
            <text class="sidebar-item-text">草稿箱</text>
            <text class="sidebar-item-value">{{ store.myDraftPosts.length }} 篇</text>
          </view>
          <view class="sidebar-item" @click="openService('浏览痕迹')">
            <text class="sidebar-item-text">浏览痕迹</text><text class="sidebar-item-arrow">›</text>
          </view>
          <view class="sidebar-item" @click="openService('出行记录')">
            <text class="sidebar-item-text">出行记录</text><text class="sidebar-item-arrow">›</text>
          </view>
          <view class="sidebar-item" @click="openService('荣誉体系')">
            <text class="sidebar-item-text">荣誉体系</text><text class="sidebar-item-arrow">›</text>
          </view>
        </view>

        <view class="sidebar-divider" />

        <view class="sidebar-section">
          <view class="sidebar-item" @click="showSidebar = false; showCustomerSupportModal = true">
            <text class="sidebar-item-text">联系客服</text>
            <text class="sidebar-item-arrow">›</text>
          </view>
          <view class="sidebar-item" @click="showSidebar = false; showGuidelinesModal = true">
            <text class="sidebar-item-text">社区规范</text>
            <text class="sidebar-item-arrow">›</text>
          </view>
          <view class="sidebar-item" @click="openService('隐私政策')">
            <text class="sidebar-item-text">隐私政策</text>
            <text class="sidebar-item-arrow">›</text>
          </view>
          <view class="sidebar-item" @click="showSidebar = false; showSettingsModal = true">
            <text class="sidebar-item-text">通用设置</text>
            <text class="sidebar-item-arrow">›</text>
          </view>
        </view>

        <view class="sidebar-footer">
          <text class="sidebar-version">滴答 v1.0.0</text>
        </view>
      </view>
    </view>

    <!-- ==================== MODALS ==================== -->

    <!-- Edit Profile Modal -->
    <view v-if="showEditProfileModal" class="modal-overlay" @click="showEditProfileModal = false">
      <view class="modal-card" @click.stop>
        <text class="modal-title">编辑资料</text>
        <view class="form-group">
          <text class="form-label">昵称</text>
          <input v-model="editForm.nickname" class="form-input" placeholder="输入昵称" />
        </view>
        <view class="form-group">
          <text class="form-label">学校</text>
          <input v-model="editForm.school" class="form-input" placeholder="输入学校" />
        </view>
        <view class="form-group">
          <text class="form-label">微信</text>
          <input v-model="editForm.wechat" class="form-input" placeholder="输入微信号" />
        </view>
        <view class="form-group">
          <text class="form-label">手机号</text>
          <input v-model="editForm.phone" class="form-input" placeholder="输入手机号" />
        </view>
        <view class="modal-actions">
          <view class="modal-btn cancel-btn" @click="showEditProfileModal = false">
            <text class="modal-btn-text">取消</text>
          </view>
          <view class="modal-btn confirm-btn" @click="saveProfile">
            <text class="modal-btn-text-white">保存</text>
          </view>
        </view>
      </view>
    </view>

    <!-- Credit Logs Modal -->
    <view v-if="showCreditLogModal" class="modal-overlay" @click="showCreditLogModal = false">
      <view class="modal-card" @click.stop>
        <text class="modal-title">信用记录</text>
        <text class="modal-subtitle">当前信用分：{{ store.userProfile?.creditScore || 0 }}</text>
        <scroll-view scroll-y class="credit-log-list">
          <view v-for="log in store.creditLogs" :key="log.id" class="credit-log-item">
            <view class="credit-log-left">
              <text class="credit-log-reason">{{ log.reason }}</text>
              <text class="credit-log-date">{{ log.date }}</text>
            </view>
            <text :class="['credit-log-change', log.change >= 0 ? 'positive' : 'negative']">
              {{ log.change >= 0 ? '+' : '' }}{{ log.change }}
            </text>
          </view>
        </scroll-view>
        <view class="modal-actions modal-actions-center">
          <view class="modal-btn cancel-btn" @click="showCreditLogModal = false">
            <text class="modal-btn-text">关闭</text>
          </view>
        </view>
      </view>
    </view>

    <!-- Emergency Contact Modal -->
    <view v-if="showEmergencyContactModal" class="modal-overlay" @click="showEmergencyContactModal = false">
      <view class="modal-card" @click.stop>
        <text class="modal-title">紧急联系人</text>
        <view class="form-group">
          <text class="form-label">联系人姓名</text>
          <input v-model="emergencyForm.name" class="form-input" placeholder="输入紧急联系人姓名" />
        </view>
        <view class="form-group">
          <text class="form-label">联系人电话</text>
          <input v-model="emergencyForm.phone" class="form-input" placeholder="输入紧急联系人电话" />
        </view>
        <view class="modal-actions">
          <view class="modal-btn cancel-btn" @click="showEmergencyContactModal = false">
            <text class="modal-btn-text">取消</text>
          </view>
          <view class="modal-btn confirm-btn" @click="saveEmergencyContact">
            <text class="modal-btn-text-white">保存</text>
          </view>
        </view>
      </view>
    </view>

    <!-- Customer Support Modal -->
    <view v-if="showCustomerSupportModal" class="modal-overlay" @click="showCustomerSupportModal = false">
      <view class="modal-card" @click.stop>
        <text class="modal-title">联系客服</text>
        <text class="modal-subtitle">如有问题，请通过以下方式联系我们</text>
        <view class="support-info">
          <text class="support-item">邮箱：support@dida-app.com</text>
          <text class="support-item">微信客服：dida_helper</text>
          <text class="support-item">工作时间：工作日 9:00 - 21:00</text>
        </view>
        <textarea v-model="feedbackText" class="review-textarea" placeholder="也可以直接填写问题或建议..." :maxlength="300" />
        <view class="modal-actions modal-actions-center">
          <view class="modal-btn cancel-btn" @click="showCustomerSupportModal = false"><text class="modal-btn-text">关闭</text></view>
          <view class="modal-btn confirm-btn" @click="submitFeedback">
            <text class="modal-btn-text-white">提交反馈</text>
          </view>
        </view>
      </view>
    </view>

    <!-- Community Guidelines Modal -->
    <view v-if="showGuidelinesModal" class="modal-overlay" @click="showGuidelinesModal = false">
      <view class="modal-card" @click.stop>
        <text class="modal-title">社区规范</text>
        <scroll-view scroll-y class="guidelines-content">
          <text class="guidelines-text">
            1. 尊重他人，文明交流，不得发布侮辱、歧视性言论。
            {'\n\n'}
            2. 禁止发布违法违规内容，包括但不限于色情、暴力、诈骗信息。
            {'\n\n'}
            3. 活动发起人和参与者应遵守约定，按时赴约。无故爽约将影响信用评分。
            {'\n\n'}
            4. 保护个人隐私，不要在公开区域透露过多个人信息。
            {'\n\n'}
            5. 发现违规行为请及时举报，我们将迅速处理。
            {'\n\n'}
            6. 鼓励积极健康的校园社交，共同维护滴答社区的良好氛围。
          </text>
        </scroll-view>
        <view class="modal-actions modal-actions-center">
          <view class="modal-btn cancel-btn" @click="showGuidelinesModal = false">
            <text class="modal-btn-text">我知道了</text>
          </view>
        </view>
      </view>
    </view>

    <!-- Drafts Box Modal -->
    <view v-if="showDraftsModal" class="modal-overlay" @click="showDraftsModal = false">
      <view class="modal-card modal-card-wide" @click.stop>
        <text class="modal-title">草稿箱</text>
        <scroll-view scroll-y class="drafts-list">
          <!-- Real Drafts -->
          <view v-if="store.myDraftPosts.length > 0">
            <text class="draft-section-label">我的草稿</text>
            <view v-for="draft in store.myDraftPosts" :key="draft.id" class="draft-card">
              <view class="draft-info">
                <text class="draft-title">{{ draft.title }}</text>
                <text class="draft-preview">{{ draft.content.substring(0, 60) }}...</text>
              </view>
              <view class="draft-actions">
                <view class="draft-btn delete-btn" @click="deleteDraft(draft.id)">
                  <text class="draft-btn-delete">删除</text>
                </view>
                <view class="draft-btn publish-btn" @click="publishDraft(draft.id)">
                  <text class="draft-btn-publish">发布</text>
                </view>
              </view>
            </view>
          </view>
          <!-- Mock Drafts -->
          <text class="draft-section-label">系统草稿模板</text>
          <view v-for="md in mockDrafts" :key="md.id" class="draft-card draft-mock">
            <view class="draft-info">
              <text class="draft-title">{{ md.title }}</text>
              <text class="draft-preview">{{ md.content }}</text>
            </view>
            <view class="draft-actions">
              <view class="draft-btn publish-btn" @click="useMockDraft(md)">
                <text class="draft-btn-publish">使用</text>
              </view>
            </view>
          </view>
          <view v-if="store.myDraftPosts.length === 0 && mockDrafts.length === 0" class="draft-empty">
            <text class="draft-empty-text">暂无草稿</text>
          </view>
        </scroll-view>
        <view class="modal-actions modal-actions-center">
          <view class="modal-btn cancel-btn" @click="showDraftsModal = false">
            <text class="modal-btn-text">关闭</text>
          </view>
        </view>
      </view>
    </view>

    <!-- Rating Modal -->
    <view v-if="showRatingModal" class="modal-overlay" @click="showRatingModal = false">
      <view class="modal-card" @click.stop>
        <text class="modal-title">评价搭子</text>
        <text class="modal-subtitle">为本次活动体验打分</text>
        <view class="star-row">
          <text
            v-for="s in 5"
            :key="s"
            :class="s <= ratingStars ? 'star filled' : 'star'"
            @click="ratingStars = s"
          >★</text>
        </view>
        <textarea
          v-model="ratingComment"
          class="review-textarea"
          placeholder="写下你的评价..."
          :maxlength="200"
        />
        <view class="modal-actions">
          <view class="modal-btn cancel-btn" @click="showRatingModal = false">
            <text class="modal-btn-text">取消</text>
          </view>
          <view class="modal-btn confirm-btn" @click="submitRating">
            <text class="modal-btn-text-white">提交</text>
          </view>
        </view>
      </view>
    </view>

    <view v-if="servicePanel" class="modal-overlay" @click="servicePanel = ''">
      <view class="modal-card" @click.stop>
        <text class="modal-title">{{ servicePanel }}</text>
        <view v-if="servicePanel === '浏览痕迹'" class="support-info">
          <text class="support-item">今天 · 查看了「周末咖啡手冲交流」</text>
          <text class="support-item">昨天 · 浏览了校园夜跑活动</text>
          <text class="support-item">07-10 · 查看了主题周「夏夜电影」</text>
        </view>
        <view v-else-if="servicePanel === '出行记录'" class="support-info">
          <text class="support-item">已完成 3 次搭子活动</text>
          <text class="support-item">累计守约 3 次 · 爽约 0 次</text>
          <text class="support-item">最近出行：中心校区咖啡碰面</text>
        </view>
        <view v-else-if="servicePanel === '荣誉体系'" class="support-info">
          <text class="support-item">🏅 守时搭子 · 连续守约 3 次</text>
          <text class="support-item">🌟 校园探索者 · 参与 3 类活动</text>
          <text class="support-item">🔒 安全先锋 · 已设置紧急联系人</text>
        </view>
        <view v-else class="support-info">
          <text class="support-item">滴答仅收集完成身份认证、活动匹配和安全保障所必需的信息。</text>
          <text class="support-item">未经你的授权，我们不会向无关第三方共享个人资料。</text>
          <text class="support-item">你可以在设置中申请注销账户和删除个人信息。</text>
        </view>
        <view class="modal-actions modal-actions-center"><view class="modal-btn cancel-btn" @click="servicePanel = ''"><text class="modal-btn-text">关闭</text></view></view>
      </view>
    </view>

    <view v-if="showSettingsModal" class="modal-overlay" @click="showSettingsModal = false">
      <view class="modal-card" @click.stop>
        <text class="modal-title">通用设置</text>
        <view class="support-info">
          <text class="support-item">消息通知　已开启</text>
          <text class="support-item">仅 Wi-Fi 自动加载图片　已关闭</text>
          <text class="support-item">当前版本　v1.0.0</text>
        </view>
        <view class="modal-actions">
          <view class="modal-btn cancel-btn" @click="showSettingsModal = false"><text class="modal-btn-text">取消</text></view>
          <view class="modal-btn confirm-btn" @click="logoutAccount"><text class="modal-btn-text-white">退出登录</text></view>
        </view>
      </view>
    </view>
    <GlobalSOS v-if="!store.userProfile || !store.userProfile.hideSOS" />
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useAppStore } from '@/stores/app'
import GlobalSOS from '@/components/GlobalSOS.vue'
import { MOCK_THEMES } from '@/data/mock'
import type { UserProfile, Activity, Post } from '@/data/types'

const store = useAppStore()

// Profile sub-tab
const subTabs = [
  { key: 'activities' as const, label: '活动' },
  { key: 'posts' as const, label: '帖子' },
  { key: 'longterm' as const, label: '固定参加' },
  { key: 'liked' as const, label: '点赞' }
]
const profileSubTab = ref<'activities' | 'posts' | 'longterm' | 'liked'>('activities')

// Sidebar
const showSidebar = ref<boolean>(false)

// Modal visibility
const showEditProfileModal = ref<boolean>(false)
const showCreditLogModal = ref<boolean>(false)
const showEmergencyContactModal = ref<boolean>(false)
const showCustomerSupportModal = ref<boolean>(false)
const showGuidelinesModal = ref<boolean>(false)
const showDraftsModal = ref<boolean>(false)
const showRatingModal = ref<boolean>(false)
const showSettingsModal = ref<boolean>(false)
const servicePanel = ref<string>('')
const feedbackText = ref<string>('')

function openService(name: string) {
  showSidebar.value = false
  servicePanel.value = name
}

async function logoutAccount() {
  await store.logout()
  uni.reLaunch({ url: '/pages/verify/verify' })
}

function submitFeedback() {
  if (!feedbackText.value.trim()) return uni.showToast({ title: '请填写反馈内容', icon: 'none' })
  feedbackText.value = ''
  showCustomerSupportModal.value = false
  uni.showToast({ title: '反馈已提交', icon: 'success' })
}

// Edit profile form
const editForm = reactive({
  nickname: '',
  school: '',
  wechat: '',
  phone: ''
})

// Emergency contact form
const emergencyForm = reactive({
  name: '',
  phone: ''
})

// Rating state
const ratingActivityId = ref<string>('')
const ratingStars = ref<number>(0)
const ratingComment = ref<string>('')
const activityRatings = reactive<Record<string, boolean>>({})

// Mock drafts
const mockDrafts = ref([
  { id: 'md_1', title: '周末咖啡探店约伴', content: '想找个搭子一起去学校附近的猫咖，AA制...' },
  { id: 'md_2', title: '夜跑打卡求队友', content: '每天晚上8点操场5公里，找跑友互相监督...' },
  { id: 'md_3', title: '图书馆自习搭子', content: '期末复习，求一个可以互相监督的自习搭子...' }
])

// Computed: all my activities (created + joined)
const allMyActivities = computed<Activity[]>(() => {
  return [...store.myCreatedActivities, ...store.myJoinedActivities]
})

// Computed: joined activity count
const joinedActivityCount = computed(() => {
  return store.myCreatedActivities.length + store.myJoinedActivities.length
})

// Computed: partner count (P2P conversations)
const partnerCount = computed(() => {
  return store.conversations.filter((c) => !c.isGroup).length
})

// Computed: companion rating (derived from credit score)
const companionRating = computed(() => {
  const score = store.userProfile?.creditScore || 0
  if (score >= 100) return '5.0'
  if (score >= 80) return '4.5'
  if (score >= 60) return '4.0'
  if (score >= 40) return '3.5'
  return '3.0'
})

// Longterm themes list
const longtermList = computed(() => {
  const themes: any[] = []
  for (const key in store.registeredThemes) {
    if (store.registeredThemes[key]) {
      const theme = MOCK_THEMES.find((t) => t.id === key)
      if (theme) themes.push(theme)
    }
  }
  for (const key in store.longtermThemes) {
    if (store.longtermThemes[key]) {
      const theme = MOCK_THEMES.find((t) => t.id === key)
      if (theme && !themes.find((x) => x.id === key)) themes.push(theme)
    }
  }
  return themes
})

// Activity status helpers
function getActivityStatus(act: Activity): string {
  const now = new Date()
  // Very rough time parsing - just check if the date string seems past
  if (act.time.includes('2026-06-0') || act.time.includes('2026-05-')) {
    return '已结束'
  }
  if (act.time.includes('2026-06-1') || act.time.includes('2026-06-2')) {
    return '进行中'
  }
  return '即将开始'
}

function getActivityStatusClass(act: Activity): string {
  const status = getActivityStatus(act)
  if (status === '已结束') return 'status-finished'
  if (status === '进行中') return 'status-active'
  return 'status-upcoming'
}

function isActivityFinished(act: Activity): boolean {
  return getActivityStatus(act) === '已结束'
}

// Initialize edit form
onMounted(() => {
  if (store.userProfile) {
    editForm.nickname = store.userProfile.nickname
    editForm.school = store.userProfile.school
    editForm.wechat = store.userProfile.wechat || ''
    editForm.phone = store.userProfile.phone || ''
    emergencyForm.name = store.userProfile.emergencyContactName || ''
    emergencyForm.phone = store.userProfile.emergencyContactPhone || ''
  }
})

// Save profile
function saveProfile() {
  if (!store.userProfile) return
  const updated: UserProfile = {
    ...store.userProfile,
    nickname: editForm.nickname,
    school: editForm.school,
    wechat: editForm.wechat,
    phone: editForm.phone
  }
  store.updateProfile(updated)
  uni.showToast({ title: '资料已保存', icon: 'success' })
  showEditProfileModal.value = false
}

// Save emergency contact
function saveEmergencyContact() {
  if (!store.userProfile) return
  const updated: UserProfile = {
    ...store.userProfile,
    emergencyContactName: emergencyForm.name,
    emergencyContactPhone: emergencyForm.phone
  }
  store.updateProfile(updated)
  uni.showToast({ title: '紧急联系人已保存', icon: 'success' })
  showEmergencyContactModal.value = false
}

// Toggle hide SOS
function toggleHideSOS(e: any) {
  if (!store.userProfile) return
  const updated: UserProfile = {
    ...store.userProfile,
    hideSOS: e.detail.value
  }
  store.updateProfile(updated)
  uni.showToast({ title: e.detail.value ? 'SOS已隐藏' : 'SOS已开启', icon: 'none' })
}

// Open rating modal
function openRatingModal(activityId: string) {
  ratingActivityId.value = activityId
  ratingStars.value = 0
  ratingComment.value = ''
  showRatingModal.value = true
}

// Submit rating
function submitRating() {
  if (ratingStars.value === 0) {
    uni.showToast({ title: '请先选择评分', icon: 'none' })
    return
  }
  activityRatings[ratingActivityId.value] = true
  store.addCreditLog(1, `完成活动搭子评价：${ratingStars.value}星`)
  uni.showToast({ title: '评价已提交', icon: 'success' })
  showRatingModal.value = false
}

// Draft operations
function publishDraft(draftId: string) {
  const updatedList = store.postList.map((p) => {
    if (p.id === draftId) return { ...p, isDraft: false, createdAt: '刚刚' }
    return p
  })
  store.updatePostList(updatedList)
  uni.showToast({ title: '草稿已发布', icon: 'success' })
}

function deleteDraft(draftId: string) {
  const updatedList = store.postList.filter((p) => p.id !== draftId)
  store.updatePostList(updatedList)
  uni.showToast({ title: '草稿已删除', icon: 'success' })
}

function useMockDraft(md: { title: string; content: string }) {
  // Navigate to publish post page with mock draft data
  uni.showToast({ title: '请前往发帖页面发布', icon: 'none' })
}
</script>

<style lang="scss" scoped>
.profile-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f5f5;
}

// ================== HEADER ==================
.profile-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #fff;
  padding: 24rpx 32rpx;
  border-bottom: 1px solid #eee;

  .profile-title {
    font-size: 36rpx;
    font-weight: 700;
    color: #1a1a1a;
  }

  .header-actions {
    display: flex;
    gap: 16rpx;

    .header-btn {
      padding: 10rpx 24rpx;
      border-radius: 24rpx;
      background-color: #f0f5ff;

      &.settings-btn {
        background-color: #f5f5f5;
      }

      .header-btn-text {
        font-size: 26rpx;
        color: #2563eb;
      }
    }
  }
}

.profile-body {
  flex: 1;
}

// ================== PROFILE CARD ==================
.profile-card {
  background-color: #fff;
  margin: 20rpx 24rpx;
  border-radius: 20rpx;
  padding: 32rpx;
  box-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.04);

  .profile-card-top {
    display: flex;
    align-items: center;

    .avatar-wrap {
      position: relative;

      .profile-avatar {
        width: 120rpx;
        height: 120rpx;
        border-radius: 50%;
      }

      .credit-badge {
        position: absolute;
        bottom: -6rpx;
        right: -6rpx;
        width: 48rpx;
        height: 48rpx;
        background-color: #2563eb;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 4rpx solid #fff;

        .credit-badge-text {
          font-size: 20rpx;
          color: #fff;
          font-weight: 700;
        }
      }
    }

    .profile-info {
      margin-left: 28rpx;
      flex: 1;

      .nickname-row {
        display: flex;
        align-items: center;

        .nickname {
          font-size: 34rpx;
          font-weight: 700;
          color: #1a1a1a;
        }

        .verified-mark {
          margin-left: 14rpx;
          padding: 4rpx 16rpx;
          font-size: 20rpx;
          color: #2563eb;
          background-color: #eff6ff;
          border-radius: 10rpx;
          border: 1px solid #bfdbfe;
        }
      }

      .dida-id {
        font-size: 22rpx;
        color: #999;
        margin-top: 6rpx;
        display: block;
      }

      .school-name {
        font-size: 24rpx;
        color: #666;
        margin-top: 4rpx;
        display: block;
      }
    }
  }

  .interest-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 12rpx;
    margin-top: 24rpx;
    padding-top: 20rpx;
    border-top: 1px solid #f0f0f0;

    .interest-tag {
      padding: 8rpx 20rpx;
      background-color: #f0f5ff;
      border-radius: 20rpx;
      font-size: 22rpx;
      color: #2563eb;
    }
  }
}

// ================== STATS ROW ==================
.stats-row {
  display: flex;
  align-items: center;
  background-color: #fff;
  margin: 0 24rpx 20rpx;
  border-radius: 20rpx;
  padding: 28rpx 0;
  box-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.04);

  .stat-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;

    .stat-num {
      font-size: 44rpx;
      font-weight: 700;
      color: #2563eb;
    }

    .stat-label {
      font-size: 22rpx;
      color: #999;
      margin-top: 8rpx;
    }
  }

  .stat-divider {
    width: 2rpx;
    height: 56rpx;
    background-color: #f0f0f0;
  }
}

// ================== SUB TABS ==================
.sub-tabs {
  display: flex;
  background-color: #fff;
  margin: 0 24rpx;
  border-radius: 20rpx;
  padding: 8rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.03);

  .sub-tab {
    flex: 1;
    text-align: center;
    padding: 18rpx 0;
    border-radius: 16rpx;

    &.active {
      background-color: #2563eb;

      .sub-tab-text {
        color: #fff;
        font-weight: 600;
      }
    }

    .sub-tab-text {
      font-size: 26rpx;
      color: #666;
    }
  }
}

// ================== TAB CONTENT ==================
.tab-content {
  padding: 20rpx 24rpx;
}

.tab-empty {
  text-align: center;
  padding: 80rpx 0;

  .tab-empty-text {
    font-size: 28rpx;
    color: #999;
  }

  .tab-empty-sub {
    font-size: 22rpx;
    color: #bbb;
    margin-top: 8rpx;
    display: block;
  }
}

// Activity Card
.activity-card {
  display: flex;
  background-color: #fff;
  border-radius: 16rpx;
  padding: 20rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.03);

  .act-cover {
    width: 160rpx;
    height: 140rpx;
    border-radius: 12rpx;
    flex-shrink: 0;
  }

  .act-info {
    flex: 1;
    margin-left: 20rpx;
    overflow: hidden;

    .act-top-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;

      .act-title {
        font-size: 26rpx;
        font-weight: 600;
        color: #1a1a1a;
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        margin-right: 12rpx;
      }

      .act-status {
        flex-shrink: 0;
        padding: 4rpx 14rpx;
        border-radius: 10rpx;

        .act-status-text {
          font-size: 20rpx;
        }

        &.status-upcoming {
          background-color: #dcfce7;
          .act-status-text { color: #16a34a; }
        }

        &.status-active {
          background-color: #eff6ff;
          .act-status-text { color: #2563eb; }
        }

        &.status-finished {
          background-color: #f5f5f5;
          .act-status-text { color: #999; }
        }
      }
    }

    .act-detail {
      font-size: 22rpx;
      color: #999;
      margin-top: 6rpx;
      display: block;
    }

    .act-members {
      font-size: 20rpx;
      color: #bbb;
      margin-top: 4rpx;
      display: block;
    }

    .rate-btn {
      margin-top: 10rpx;
      padding: 8rpx 20rpx;
      background-color: #fef3c7;
      border-radius: 16rpx;
      align-self: flex-start;
      display: inline-block;

      .rate-btn-text {
        font-size: 22rpx;
        color: #d97706;
      }
    }
  }
}

// Post Card Small
.post-card-sm {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.03);

  .post-sm-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;

    .post-sm-title {
      font-size: 28rpx;
      font-weight: 600;
      color: #1a1a1a;
      flex: 1;
      margin-right: 12rpx;
    }

    .post-sm-tag {
      padding: 4rpx 16rpx;
      background-color: #fef3c7;
      border-radius: 12rpx;
      flex-shrink: 0;

      .post-sm-tag-text {
        font-size: 20rpx;
        color: #d97706;
      }
    }
  }

  .post-sm-content {
    font-size: 24rpx;
    color: #777;
    margin-top: 12rpx;
    display: block;
    line-height: 1.5;
  }

  .post-sm-images {
    display: flex;
    gap: 8rpx;
    margin-top: 16rpx;

    .post-sm-img {
      width: 100rpx;
      height: 100rpx;
      border-radius: 8rpx;
    }
  }

  .post-sm-footer {
    display: flex;
    justify-content: space-between;
    margin-top: 16rpx;

    .post-sm-time, .post-sm-likes {
      font-size: 20rpx;
      color: #bbb;
    }
  }
}

// Longterm Card
.longterm-card {
  display: flex;
  background-color: #fff;
  border-radius: 16rpx;
  padding: 20rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.03);

  .longterm-cover {
    width: 160rpx;
    height: 160rpx;
    border-radius: 12rpx;
    flex-shrink: 0;
  }

  .longterm-info {
    flex: 1;
    margin-left: 20rpx;

    .longterm-title {
      font-size: 26rpx;
      font-weight: 600;
      color: #1a1a1a;
      display: block;
    }

    .longterm-badge {
      font-size: 20rpx;
      color: #2563eb;
      background-color: #eff6ff;
      padding: 2rpx 12rpx;
      border-radius: 8rpx;
      margin-top: 6rpx;
      display: inline-block;
    }

    .longterm-desc {
      font-size: 22rpx;
      color: #888;
      margin-top: 10rpx;
      display: block;
      line-height: 1.4;
    }

    .longterm-stats {
      margin-top: 10rpx;
      .longterm-stat {
        font-size: 20rpx;
        color: #bbb;
      }
    }

    .longterm-remind-btn {
      margin-top: 16rpx;
      padding: 10rpx 24rpx;
      background-color: #2563eb;
      border-radius: 24rpx;
      display: inline-block;

      .remind-btn-text {
        font-size: 22rpx;
        color: #fff;
      }
    }
  }
}

// Liked Card
.liked-card {
  display: flex;
  align-items: center;
  background-color: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 12rpx;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.03);

  .liked-avatar {
    width: 72rpx;
    height: 72rpx;
    border-radius: 50%;
  }

  .liked-info {
    flex: 1;
    margin-left: 18rpx;
    overflow: hidden;

    .liked-title {
      font-size: 26rpx;
      font-weight: 600;
      color: #1a1a1a;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      display: block;
    }

    .liked-author {
      font-size: 22rpx;
      color: #999;
      margin-top: 4rpx;
    }
  }

  .liked-heart {
    font-size: 36rpx;
    color: #ef4444;
    flex-shrink: 0;
  }
}

// ================== SIDEBAR ==================
.sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.4);
  z-index: 2000;
}

.sidebar-panel {
  position: absolute;
  top: 0;
  right: -560rpx;
  bottom: 0;
  width: 520rpx;
  background-color: #fff;
  box-shadow: -4rpx 0 24rpx rgba(0, 0, 0, 0.08);
  transition: right 0.3s ease;
  display: flex;
  flex-direction: column;

  &.sidebar-open {
    right: 0;
  }
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 48rpx 32rpx 24rpx;
  border-bottom: 1px solid #f0f0f0;

  .sidebar-title {
    font-size: 34rpx;
    font-weight: 700;
    color: #1a1a1a;
  }

  .sidebar-close {
    padding: 8rpx;

    .sidebar-close-text {
      font-size: 32rpx;
      color: #999;
    }
  }
}

.sidebar-section {
  padding: 16rpx 0;
}

.sidebar-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 28rpx 32rpx;

  .sidebar-item-text {
    font-size: 28rpx;
    color: #333;
  }

  .sidebar-item-value {
    font-size: 26rpx;
    color: #2563eb;
    font-weight: 500;
  }

  .sidebar-item-arrow {
    font-size: 32rpx;
    color: #ccc;
  }
}

.sidebar-divider {
  height: 12rpx;
  background-color: #f5f5f5;
}

.sidebar-footer {
  margin-top: auto;
  text-align: center;
  padding: 40rpx 0;

  .sidebar-version {
    font-size: 22rpx;
    color: #ccc;
  }
}

// ================== MODALS ==================
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-card {
  background-color: #fff;
  border-radius: 24rpx;
  padding: 40rpx 32rpx;
  width: 600rpx;
  max-height: 80vh;
  overflow-y: auto;

  &.modal-card-wide {
    width: 640rpx;
  }

  .modal-title {
    font-size: 34rpx;
    font-weight: 700;
    color: #1a1a1a;
    text-align: center;
    display: block;
    margin-bottom: 8rpx;
  }

  .modal-subtitle {
    font-size: 24rpx;
    color: #999;
    text-align: center;
    display: block;
    margin-bottom: 24rpx;
  }
}

.form-group {
  margin-bottom: 24rpx;

  .form-label {
    font-size: 26rpx;
    color: #666;
    margin-bottom: 10rpx;
    display: block;
  }

  .form-input {
    height: 76rpx;
    background-color: #f5f5f5;
    border-radius: 12rpx;
    padding: 0 24rpx;
    font-size: 28rpx;
  }
}

.modal-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 28rpx;

  &.modal-actions-center {
    justify-content: center;
  }

  .modal-btn {
    padding: 18rpx 48rpx;
    border-radius: 32rpx;
    text-align: center;

    &.cancel-btn {
      background-color: #f5f5f5;
    }

    &.confirm-btn {
      background-color: #2563eb;
    }

    .modal-btn-text {
      font-size: 28rpx;
      color: #666;
      font-weight: 500;
    }

    .modal-btn-text-white {
      font-size: 28rpx;
      color: #fff;
      font-weight: 500;
    }
  }
}

.star-row {
  display: flex;
  justify-content: center;
  gap: 12rpx;
  margin-bottom: 24rpx;

  .star {
    font-size: 52rpx;
    color: #ddd;

    &.filled {
      color: #f59e0b;
    }
  }
}

.review-textarea {
  width: 100%;
  height: 140rpx;
  background-color: #f5f5f5;
  border-radius: 12rpx;
  padding: 20rpx;
  font-size: 26rpx;
  box-sizing: border-box;
}

// Credit Logs
.credit-log-list {
  max-height: 400rpx;
}

.credit-log-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18rpx 0;
  border-bottom: 1px solid #f5f5f5;

  .credit-log-left {
    flex: 1;
    margin-right: 16rpx;

    .credit-log-reason {
      font-size: 26rpx;
      color: #333;
      display: block;
    }

    .credit-log-date {
      font-size: 20rpx;
      color: #bbb;
      margin-top: 4rpx;
    }
  }

  .credit-log-change {
    font-size: 28rpx;
    font-weight: 600;
    flex-shrink: 0;

    &.positive {
      color: #16a34a;
    }

    &.negative {
      color: #ef4444;
    }
  }
}

// Support
.support-info {
  .support-item {
    font-size: 26rpx;
    color: #555;
    display: block;
    padding: 12rpx 0;
    border-bottom: 1px solid #f5f5f5;
  }
}

// Guidelines
.guidelines-content {
  max-height: 400rpx;

  .guidelines-text {
    font-size: 26rpx;
    color: #444;
    line-height: 1.8;
    white-space: pre-wrap;
  }
}

// Drafts
.drafts-list {
  max-height: 500rpx;
}

.draft-section-label {
  font-size: 24rpx;
  color: #999;
  font-weight: 500;
  margin: 16rpx 0 10rpx;
  display: block;
}

.draft-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx;
  background-color: #f9fafb;
  border-radius: 12rpx;
  margin-bottom: 12rpx;

  &.draft-mock {
    background-color: #fefce8;
  }

  .draft-info {
    flex: 1;
    margin-right: 16rpx;
    overflow: hidden;

    .draft-title {
      font-size: 26rpx;
      font-weight: 600;
      color: #1a1a1a;
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .draft-preview {
      font-size: 22rpx;
      color: #999;
      margin-top: 6rpx;
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .draft-actions {
    display: flex;
    gap: 12rpx;
    flex-shrink: 0;

    .draft-btn {
      padding: 10rpx 20rpx;
      border-radius: 16rpx;

      &.delete-btn {
        background-color: #fef2f2;

        .draft-btn-delete {
          font-size: 22rpx;
          color: #ef4444;
        }
      }

      &.publish-btn {
        background-color: #2563eb;

        .draft-btn-publish {
          font-size: 22rpx;
          color: #fff;
        }
      }
    }
  }
}

.draft-empty {
  text-align: center;
  padding: 60rpx 0;

  .draft-empty-text {
    font-size: 26rpx;
    color: #ccc;
  }
}
</style>

