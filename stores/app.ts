import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  UserProfile, Activity, Conversation, CreditLog, ChatMessage, GroupJoinRequest,
  UserLoginVO, UserInfoVO, RegisterParam, GenderType,
  ForumCategoryVO, CreatePostParam,
} from '@/data/types'
import { MOCK_ACTIVITIES, MOCK_CONVERSATIONS, MOCK_CREDIT_LOGS } from '@/data/mock'
import * as userApi from '@/api/user'
import * as postApi from '@/api/post'
import { imLogin, imLogout } from '@/utils/im'
import { clearAuthStorage } from '@/utils/request'
import { STORAGE_KEYS } from '@/config'

/** 后端 Gender(UNKNOWN) → 前端 GenderType(OTHER) */
function normalizeGender(g: GenderType): GenderType {
  return g === 'UNKNOWN' ? 'OTHER' : g
}

/** 后端用户 VO → 前端 UserProfile（后端缺失的字段给合理默认值） */
function mapVoToProfile(vo: UserLoginVO | UserInfoVO): UserProfile {
  return {
    uid: vo.id,
    nickname: vo.nickname,
    avatar: vo.imageUrl || '',
    gender: normalizeGender(vo.gender),
    age: 20,
    school: '',
    email: '',
    interests: vo.interestTags || [],
    personalityTags: [],
    activityPrefs: [],
    phone: vo.phone,
    wechat: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    creditScore: typeof vo.reputationScore === 'number' ? vo.reputationScore : 100,
    // 后端 boolean 字段 isXxx 经 Jackson 序列化后可能去掉 is 前缀（→ idVerified/schoolVerified），两种拼写都兼容
    isIdVerified: !!(vo.isIdVerified ?? (vo as any).idVerified),
    isSchoolVerified: !!(vo.isSchoolVerified ?? (vo as any).schoolVerified),
  }
}

export const useAppStore = defineStore('app', () => {
  // User state
  const userProfile = ref<UserProfile | null>(null)
  const activeTab = ref<string>('home')
  const prevTab = ref<string>('home')

  // Data lists
  const activityList = ref<Activity[]>([...MOCK_ACTIVITIES])
  const conversations = ref<Conversation[]>([...MOCK_CONVERSATIONS])
  const creditLogs = ref<CreditLog[]>([...MOCK_CREDIT_LOGS])

  // 帖子分类缓存（论坛 & 发帖共用，见 docs/API.md §4.1）
  const postCategories = ref<ForumCategoryVO[]>([])

  // Group join requests
  const groupJoinRequests = ref<GroupJoinRequest[]>([
    {
      id: "req_mock_1",
      activityId: "act_1",
      activityTitle: "【中心校区咖啡碰面】周六莫扎咖啡手工冲泡研习交流",
      requesterId: "user_mock_peer_1",
      requesterName: "陈思涵 (山大生科)",
      requesterAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
      ownerId: "user_123",
      status: "pending"
    },
    {
      id: "req_mock_2",
      activityId: "act_2",
      activityTitle: "【洪家楼夜跑约起】操场 5KM 稳配慢跑有氧搭子",
      requesterId: "user_mock_peer_2",
      requesterName: "周杰 (山大计算机)",
      requesterAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
      ownerId: "user_123",
      status: "pending"
    }
  ])

  // Theme states
  const registeredThemes = ref<Record<string, boolean>>({})
  const longtermThemes = ref<Record<string, boolean>>({})

  // Chat state
  const activeConvId = ref<string | null>(null)

  // Auth state（后端鉴权 + IM）
  const satoken = ref<string>('')
  const imUserId = ref<string>('')
  const userSig = ref<string>('')

  // ID counter
  let idCounter = 0
  const genId = (prefix: string) => `${prefix}${Date.now()}_${idCounter++}`

  // Actions
  function setUserProfile(profile: UserProfile | null) {
    userProfile.value = profile
  }

  // ==================== 认证（后端 + IM） ====================

  /** 登录/注册成功后：持久化令牌、应用 profile、登录 IM */
  async function applySession(vo: UserLoginVO) {
    satoken.value = vo.tokenInfo?.tokenValue || ''
    imUserId.value = vo.id
    userSig.value = vo.userSig || ''

    uni.setStorageSync(STORAGE_KEYS.TOKEN, satoken.value)
    uni.setStorageSync(STORAGE_KEYS.TOKEN_NAME, vo.tokenInfo?.tokenName || 'satoken')
    uni.setStorageSync(STORAGE_KEYS.USER_ID, vo.id)
    uni.setStorageSync(STORAGE_KEYS.USER_SIG, userSig.value)

    const profile = mapVoToProfile(vo)
    setUserProfile(profile)
    uni.setStorageSync(STORAGE_KEYS.PROFILE, profile)

    await imLogin(vo.id, vo.userSig)
  }

  /** 账号密码登录 */
  async function loginWithPassword(phone: string, password: string) {
    const vo = await userApi.login(phone, password)
    await applySession(vo)
  }

  /**
   * 手机号 + 短信验证码登录。
   * @returns true 已登录；false 该手机号未注册（前端引导去注册）
   */
  async function loginWithSms(phoneNumber: string, code: string): Promise<boolean> {
    const vo = await userApi.loginSms(phoneNumber, code)
    if (!vo) return false
    await applySession(vo)
    return true
  }

  /** 注册（成功后即登录态 + IM 登录） */
  async function registerUser(param: RegisterParam) {
    const vo = await userApi.register(param)
    await applySession(vo)
  }

  /** 退出登录：后端登出 + IM 登出 + 清本地态 */
  async function logout() {
    const uid = imUserId.value || uni.getStorageSync(STORAGE_KEYS.USER_ID)
    if (uid) {
      try { await userApi.logout(uid) } catch { /* 忽略登出失败 */ }
    }
    await imLogout()
    clearAuthStorage()
    satoken.value = ''
    imUserId.value = ''
    userSig.value = ''
    setUserProfile(null)
  }

  /**
   * 启动时恢复登录态：校验 token 有效性 + 重新登录 IM。
   * @returns 是否成功恢复
   */
  async function restoreSession(): Promise<boolean> {
    const token = uni.getStorageSync(STORAGE_KEYS.TOKEN)
    if (!token) return false
    try {
      const info = await userApi.getUserInfo() // 401 会在 request 层清态并跳转
      satoken.value = token
      imUserId.value = info.id
      userSig.value = uni.getStorageSync(STORAGE_KEYS.USER_SIG) || ''
      setUserProfile(mapVoToProfile(info))
      await imLogin(info.id, userSig.value)
      return true
    } catch {
      clearAuthStorage()
      return false
    }
  }

  /**
   * 重新拉取当前登录用户信息并刷新 profile（如实名/学籍认证状态变更后）。
   * 未登录时直接跳过；失败静默（request 层已处理 401）。
   * @returns 是否刷新成功
   */
  async function refreshUserInfo(): Promise<boolean> {
    if (!satoken.value && !uni.getStorageSync(STORAGE_KEYS.TOKEN)) return false
    try {
      const info = await userApi.getUserInfo()
      const profile = mapVoToProfile(info)
      setUserProfile(profile)
      uni.setStorageSync(STORAGE_KEYS.PROFILE, profile)
      return true
    } catch {
      return false
    }
  }

  function setActiveTab(tab: string) {
    prevTab.value = activeTab.value
    activeTab.value = tab
  }

  function addCreditLog(change: number, reason: string) {
    if (!userProfile.value) return
    const newLog: CreditLog = {
      id: genId('log_'),
      reason,
      change,
      date: new Date().toISOString().split('T')[0]
    }
    creditLogs.value = [newLog, ...creditLogs.value]
    userProfile.value = {
      ...userProfile.value,
      creditScore: Math.min(Math.max(userProfile.value.creditScore + change, 0), 120)
    }
  }

  function handleJoinActivity(activityId: string) {
    if (!userProfile.value) return
    const act = activityList.value.find((a) => a.id === activityId)
    if (!act) return

    if (act.members.includes(userProfile.value.uid)) {
      uni.showToast({ title: '你已经在该活动的出游计划中啦！', icon: 'none' })
      return
    }
    if (act.joinedCount >= act.limit) {
      uni.showToast({ title: '抱歉，该拼团席位已满！', icon: 'none' })
      return
    }

    const ownerId = act.creatorUid
    if (ownerId === userProfile.value.uid) {
      uni.showToast({ title: '您是该活动的发起人，已经在多人群聊中了噢！', icon: 'none' })
      return
    }

    const existingReq = groupJoinRequests.value.find(
      (r) => r.activityId === activityId && r.requesterId === userProfile.value!.uid
    )
    if (existingReq) {
      if (existingReq.status === 'pending') {
        uni.showToast({ title: '您的申请正在等待合拍，请耐心等待！', icon: 'none' })
      } else if (existingReq.status === 'approved') {
        uni.showToast({ title: '您的申请已通过！请前往消息板块查看。', icon: 'none' })
      } else {
        uni.showToast({ title: '抱歉，对方谢绝了本次申请。', icon: 'none' })
      }
      return
    }

    const newRequest: GroupJoinRequest = {
      id: genId('req_'),
      activityId: act.id,
      activityTitle: act.title,
      requesterId: userProfile.value.uid,
      requesterName: userProfile.value.nickname,
      requesterAvatar: userProfile.value.avatar,
      ownerId,
      status: 'pending'
    }
    groupJoinRequests.value = [newRequest, ...groupJoinRequests.value]
    uni.showToast({ title: '申请已提交！请等待群主审批。', icon: 'success' })
  }

  function handleProcessJoinRequest(requestId: string, approve: boolean) {
    groupJoinRequests.value = groupJoinRequests.value.map((req) => {
      if (req.id !== requestId) return req
      const nextStatus = approve ? 'approved' as const : 'rejected' as const

      if (approve) {
        activityList.value = activityList.value.map((act) => {
          if (act.id === req.activityId) {
            if (act.members.includes(req.requesterId)) return act
            return {
              ...act,
              joinedCount: act.joinedCount + 1,
              members: [...act.members, req.requesterId]
            }
          }
          return act
        })

        conversations.value = conversations.value.map((conv) => {
          if (conv.activityId === req.activityId) {
            const newMsg: ChatMessage = {
              id: genId('sys_'),
              senderId: 'system',
              senderName: '系统',
              senderAvatar: '',
              text: `🎉 "${req.requesterName}"已成功获得校友身份核准加入本拼跑互动群。`,
              createdAt: '刚刚'
            }
            return {
              ...conv,
              memberIds: conv.memberIds.includes(req.requesterId)
                ? conv.memberIds
                : [...conv.memberIds, req.requesterId],
              messages: [...conv.messages, newMsg],
              lastMessage: `🎉 欢迎"${req.requesterName}"加入群聊！`,
              lastMessageTime: '刚刚'
            }
          }
          return conv
        })
      }

      return { ...req, status: nextStatus }
    })

    if (approve) {
      uni.showToast({ title: '已批准！对方已自动加入群聊。', icon: 'success' })
    } else {
      uni.showToast({ title: '已谢绝该用户的群聊申请。', icon: 'none' })
    }
  }

  function handleInitiateChat(peer: { uid: string; name?: string; nickname?: string; avatar: string }) {
    if (!userProfile.value) return
    const peerName = peer.nickname || peer.name || 'TA'
    const existing = conversations.value.find((c) => c.id === peer.uid)
    if (existing) {
      activeConvId.value = existing.id
      activeTab.value = 'chat'
      return
    }

    const newConv: Conversation = {
      id: peer.uid,
      name: peerName,
      avatar: peer.avatar,
      isGroup: false,
      memberIds: [userProfile.value.uid, peer.uid],
      lastMessage: '你们已经在滴答配对合规雷达下接通会话。打个招呼破开尴尬吧！',
      lastMessageTime: '现在',
      messages: [{
        id: genId('m_init_'),
        senderId: 'system',
        senderName: '系统',
        senderAvatar: '',
        text: `[双向合拍匹配] 您与学友「${peerName}」匹配率高达 95%！聊天已接入安全保护。`,
        createdAt: '现在'
      }],
      unreadCount: 0,
      zeroSugarEnabled: false
    }

    conversations.value = [newConv, ...conversations.value]
    activeConvId.value = newConv.id
    activeTab.value = 'chat'
  }

  function handleDisconnectConversation(convId: string) {
    const conv = conversations.value.find((c) => c.id === convId)
    conversations.value = conversations.value.filter((c) => c.id !== convId)
    if (conv?.activityId) {
      groupJoinRequests.value = groupJoinRequests.value.filter((r) => r.activityId !== conv.activityId)
    }
    addCreditLog(-2, '开启零糖断联模式销毁本场会话')
    uni.showToast({ title: '已拦截。对方无法再发送消息。', icon: 'none' })
  }

  function handleSendMessage(convId: string, text: string) {
    if (!userProfile.value) return
    const newMessage: ChatMessage = {
      id: genId('raw_'),
      senderId: userProfile.value.uid,
      senderName: userProfile.value.nickname,
      senderAvatar: userProfile.value.avatar,
      text,
      createdAt: '刚刚'
    }
    conversations.value = conversations.value.map((c) => {
      if (c.id === convId) {
        return {
          ...c,
          lastMessage: text,
          lastMessageTime: '刚刚',
          messages: [...c.messages, newMessage]
        }
      }
      return c
    })
  }

  function publishActivity(act: Activity) {
    activityList.value = [act, ...activityList.value]
    const newConv: Conversation = {
      id: 'group_' + act.id,
      name: `【拼团】${act.title.substring(0, 10)}... 群聊`,
      avatar: act.coverImage,
      isGroup: true,
      activityId: act.id,
      memberIds: [userProfile.value!.uid],
      lastMessage: '拼游群组会话创建成功！其他同学申请加入后即可自动进群。',
      lastMessageTime: '现在',
      messages: [{
        id: genId('gm_m_'),
        senderId: 'system',
        senderName: '系统',
        senderAvatar: '',
        text: `[系统群通知] 您已成功发起了本团。伙伴点击申请拼客即可进组交流！`,
        createdAt: '现在'
      }],
      unreadCount: 0,
      zeroSugarEnabled: false
    }
    conversations.value = [newConv, ...conversations.value]
    addCreditLog(3, `发起了拼团活动："${act.title.substring(0, 10)}..."`)
  }

  /** 加载帖子分类（带缓存；force 时强制刷新） */
  async function loadCategories(force = false): Promise<ForumCategoryVO[]> {
    if (!force && postCategories.value.length) return postCategories.value
    const list = await postApi.getCategories()
    postCategories.value = list
    return list
  }

  /**
   * 发帖：调后端 createPost，成功后加信誉分，返回新帖 ID。
   * 失败（含无 `post` 权限的 403）向上抛，由页面 catch 引导认证。
   */
  async function publishPost(param: CreatePostParam): Promise<number> {
    const postId = await postApi.createPost(param)
    addCreditLog(2, `发布图文帖子："${param.title.substring(0, 12)}"`)
    return postId
  }

  function updateActivityList(list: Activity[]) {
    activityList.value = list
  }

  function updateProfile(profile: UserProfile) {
    userProfile.value = profile
  }

  // Getters
  const myCreatedActivities = computed(() =>
    activityList.value.filter((a) => a.creatorUid === userProfile.value?.uid)
  )
  const myJoinedActivities = computed(() =>
    activityList.value.filter((a) =>
      a.members.includes(userProfile.value?.uid || '') && a.creatorUid !== userProfile.value?.uid
    )
  )

  return {
    userProfile, activeTab, prevTab,
    activityList, conversations, creditLogs,
    postCategories,
    groupJoinRequests,
    registeredThemes, longtermThemes,
    activeConvId, genId,
    satoken, imUserId, userSig,
    setUserProfile, setActiveTab, addCreditLog,
    loginWithPassword, loginWithSms, registerUser, logout, restoreSession, refreshUserInfo,
    handleJoinActivity, handleProcessJoinRequest,
    handleInitiateChat, handleDisconnectConversation,
    handleSendMessage,
    publishActivity, publishPost, loadCategories,
    updateActivityList, updateProfile,
    myCreatedActivities, myJoinedActivities,
  }
})
