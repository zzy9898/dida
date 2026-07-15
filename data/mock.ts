import type { Activity, Post, ClassmateMatch, Conversation, CreditLog, Question, ThemeEvent } from './types'

export const MOCK_SCHOOLS = [
  { name: "山东大学", domain: "sdu.edu.cn", campuses: ["中心校区", "千佛山校区", "威海校区", "青岛校区"] },
  { name: "北京大学", domain: "pku.edu.cn", campuses: ["燕园", "医学部"] },
  { name: "复旦大学", domain: "fudan.edu.cn", campuses: ["邯郸校区", "枫林校区"] },
  { name: "上海交通大学", domain: "sjtu.edu.cn", campuses: ["闵行校区", "徐汇校区"] },
  { name: "浙江大学", domain: "zju.edu.cn", campuses: ["紫金港", "玉泉", "西溪"] },
  { name: "中国科学技术大学", domain: "ustc.edu.cn", campuses: ["东区", "西区"] },
  { name: "南京大学", domain: "nju.edu.cn", campuses: ["仙林校区", "鼓楼校区"] },
  { name: "同济大学", domain: "tongji.edu.cn", campuses: ["四平路校区", "嘉定校区"] }
]

export const QUESTIONNAIRE_QUESTIONS: Question[] = [
  {
    id: "interests",
    text: "你在生活中的兴趣爱好是？(多选)",
    type: "multiple",
    options: [
      "☕ 咖啡探店", "🎬 经典电影", "🎮 射击/竞技手游", "🏸 羽毛球/网球",
      "🎸 摇滚/民谣乐器", "📚 寂静自习室", "📷 胶片摄影", "✈️ 特种兵旅游",
      "🍳 下厨烹饪", "🧗 攀岩/滑板", "🎤 K歌/音乐节", "📖 阅读/书友会",
      "🏃 跑步/徒步", "🏋️ 健身/塑形", "🏀 篮球/足球", "🏓 乒乓球",
      "🎲 桌游/剧本杀", "🎨 绘画/手工", "🎭 话剧/脱口秀", "🧩 动漫/二次元",
      "🐾 萌宠交流", "🌿 露营/野餐", "💻 编程/数码", "🗣️ 外语交流"
    ]
  },
  {
    id: "activity_prefs",
    text: "你通常更偏爱哪种类型的线下搭子活动？",
    type: "multiple",
    options: ["两人轻巧碰面聊天", "4-6人的温馨桌游局", "户外运动或长途徒步", "大兵团的讲座与展览", "周末的美食探店巡礼"]
  },
  {
    id: "personality",
    text: "你的性格属性更倾向于？(单选/多选)",
    type: "multiple",
    options: ["✨ 社牛 (E人属性)", "🪵 社恐 (I人属性)", "🧐 逻辑缜密的技术控", "🎨 浪漫感性的艺术派", "🦄 古灵精怪的脑洞选手", "🧗 正能量的硬核狂人"]
  }
]

export const MOCK_THEMES: ThemeEvent[] = [
  {
    id: "theme_1",
    title: "微醺咖啡与探店手作季",
    badge: "本周推荐",
    description: "本期主打本校周边3家小众宝藏咖啡。和搭子一起持学籍折页即可享受买一赠一，享受午夜电影与手作下午茶！",
    image: "https://images.unsplash.com/photo-1507133750040-4a8f57021571?auto=format&fit=crop&w=400&q=80",
    partnerCount: 148,
    activitiesCount: 12
  },
  {
    id: "theme_2",
    title: "夏日志愿荧光跑 & 星空夜谈",
    badge: "高校联谊",
    description: "多校联合发起的奥森荧光竞速跑。避开白日酷暑，用荧光点亮暗夜，并在终点大草坪上听吉他、看极光星空！",
    image: "https://images.unsplash.com/photo-1502224562085-639556652f33?auto=format&fit=crop&w=400&q=80",
    partnerCount: 325,
    activitiesCount: 8
  },
  {
    id: "theme_3",
    title: "夏夜老旧电影露天微电影周",
    badge: "文艺巡礼",
    description: "学校草坪将架起巨大幕布，播放《爱在黎明破晓前》等三部经典老片。提供精巧小马扎与爆米花，与你的文艺搭子静坐微醺。",
    image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=400&q=80",
    partnerCount: 96,
    activitiesCount: 4
  }
]

export const MOCK_ACTIVITIES: Activity[] = [
  {
    id: "act_1",
    title: "【咖啡漫步】本周六15:00 山大中心校区西门手工研磨豆子碰面",
    description: "打算去打卡新开的手工咖啡馆，顺便闲聊，AA制。男女不限，欢迎喜欢喝深度烘焙的朋友来，可以一起交流咖啡豆，也可以畅聊学业吐槽！",
    coverImage: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=400&q=80",
    time: "2026-06-13 15:00",
    location: "山东大学中心校区西门 莫扎咖啡馆",
    limit: 4,
    joinedCount: 2,
    members: ["user_123", "user_mock_peer_1"],
    tags: ["☕ 咖啡探店", "两人轻巧碰面聊天"],
    school: "山东大学",
    creatorUid: "user_mock_peer_1",
    creatorName: "林舒 (山大化院)",
    creatorAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80"
  },
  {
    id: "act_2",
    title: "【羽球竞技】山大中心校区体育馆 约2男2女温馨混双双打",
    description: "已经提前预订了周日晚19-21点的3号场地。来技术中等的朋友就好，不用太强也不要新手，打完球可以去东门恰夜宵砂锅粥！",
    coverImage: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=400&q=80",
    time: "2026-06-14 19:00",
    location: "山东大学中心校区风雨操场羽毛球馆",
    limit: 4,
    joinedCount: 3,
    members: ["user_123", "user_mock_peer_2", "user_mock_peer_3"],
    tags: ["🏸 羽毛球/网球", "4-6人的温馨桌游局"],
    school: "山东大学",
    creatorUid: "user_mock_peer_2",
    creatorName: "张扬 (山大控制学院)",
    creatorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80"
  },
  {
    id: "act_3",
    title: "【硬核自习】图书馆一楼静音高光区，周一整天抱团复习期末",
    description: "微积分真的顶不住了，求一个理工科的大神抱团复习，顺便互相监督手机。不玩手机者来，中午可以一起吃教工二食堂。",
    coverImage: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=400&q=80",
    time: "2026-06-08 08:30",
    location: "山东大学蒋震图书馆 3楼自习区",
    limit: 2,
    joinedCount: 1,
    members: ["user_mock_peer_4"],
    tags: ["📚 寂静自习室", "两人轻巧碰面聊天"],
    school: "山东大学",
    creatorUid: "user_mock_peer_4",
    creatorName: "夏晴 (山大管理学院)",
    creatorAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80"
  },
  {
    id: "act_4",
    title: "【桌游局】惊险阿瓦隆/血染钟楼新手快乐局 招募4人",
    description: "周五下午5点，校外拾光桌游俱乐部走起。已经有两个车头（带本带配置），绝对不会冷场。纯白玩家也十分欢迎，我们耐心教！",
    coverImage: "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&w=400&q=80",
    time: "2026-06-12 17:00",
    location: "山大周边拾光轰趴馆 B02房间",
    limit: 8,
    joinedCount: 5,
    members: ["user_mock_peer_1", "user_mock_peer_3", "user_mock_peer_5"],
    tags: ["🎮 射击/竞技手游", "4-6人的温馨桌游局"],
    school: "山东大学",
    creatorUid: "user_mock_peer_5",
    creatorName: "刘帅 (山大土木)",
    creatorAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80"
  }
]

export const MOCK_MATCHES: ClassmateMatch[] = [
  {
    uid: "user_mock_peer_1",
    nickname: "陈思涵 (山大生科)",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
    school: "山东大学",
    interests: ["☕ 咖啡探店", "🎬 经典电影", "📷 胶片摄影"],
    personalityTags: ["🧐 逻辑缜密的技术控", "🎨 浪漫感性的艺术派"],
    matchRate: 95,
    bio: "平时喜欢泡实验室，偶尔背着胶片相机随处抓拍。想找一个可以随时约一杯咖啡、交流新奇脑洞的搭子！",
    distance: "500m"
  },
  {
    uid: "user_mock_peer_2",
    nickname: "王浩然 (山大能动学院)",
    avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&q=80",
    school: "山东大学",
    interests: ["🏸 羽毛球/网球", "🧗 攀岩/滑板", "🎮 射击/竞技手游"],
    personalityTags: ["✨ 社牛 (E人属性)", "🧗 正能量的硬核狂人"],
    matchRate: 88,
    bio: "山大羽毛球二队咸鱼选手，热衷一切肾上腺素暴风飙升的运动。最近在研究滑板，想在风雨操场找人一起battle！",
    distance: "1.2km"
  },
  {
    uid: "user_mock_peer_3",
    nickname: "苏可欣 (山大社会)",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80",
    school: "山东大学",
    interests: ["🎬 经典电影", "🎸 摇滚/民谣乐器", "☕ 咖啡探店"],
    personalityTags: ["🎨 浪漫感性的艺术派", "🦄 古灵精怪的脑洞选手"],
    matchRate: 92,
    bio: "在山大读研的老学姐（22级）。喜欢北野武 and 落日飞车，不定期写写乐评和手帐。希望周末一起去大明湖老式黑胶馆踩雷探店！",
    distance: "800m"
  },
  {
    uid: "user_mock_peer_4",
    nickname: "陆少秋 (山大软件学院)",
    avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=150&q=80",
    school: "山东大学",
    interests: ["📚 寂静自习室", "🎮 射击/竞技手游", "🧗 攀岩/滑板"],
    personalityTags: ["🧐 逻辑缜密的技术控", "🪵 社恐 (I人属性)"],
    matchRate: 84,
    bio: "终极算法做题家。喜欢代码跑通那一刻的快乐，社恐平时不怎么爱多说话。一起在图书馆闭麦复习、安静刷LeetCode不？",
    distance: "2.5km"
  }
]

export const MOCK_POSTS: Post[] = [
  {
    id: "user_post_1",
    title: "🏸 热力球友！这周日中心校区羽毛球馆双打求拼搭子",
    content: "目前有3个人，两男一女，都是基础比较扎实、能拉高远球和网前截击的主。还缺一个活力球友，男女不限，大家AA平摊场地费噢，打完还能吃个西门漫步下午茶！",
    images: ["https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=400&q=80"],
    school: "山东大学",
    authorName: "山大羽球小王子",
    authorAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80",
    authorVerified: true,
    likes: 8,
    likedBy: ["user_dida_existing_ph"],
    category: "运动打卡",
    comments: [
      {
        id: "com_u1_1",
        authorName: "周周不爱喝茶",
        authorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
        content: "哇塞，球王发帖了！可惜这周末要赶实验报告，下周求带飞！",
        createdAt: "3小时前"
      }
    ],
    createdAt: "2小时前"
  },
  {
    id: "user_post_2",
    title: "☕ 洪楼附近宝藏治愈系猫咖！有拼手冲咖啡闲聊的小伙伴吗",
    content: "下午刚挖掘到这家超级安静的咖啡馆。老板收集了好多绝版复古黑胶，猫咪也非常温顺！想找1-2个周末也喜欢安静享受咖啡或者带电脑自修的朋友一起自习，大家互不打扰或累了能简单聊两句就好，期待在校生合拍朋友~",
    images: ["https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=400&q=80"],
    school: "山东大学",
    authorName: "山大漫步女孩",
    authorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
    authorVerified: true,
    likes: 15,
    likedBy: ["user_dida_existing_wc"],
    category: "美味探店",
    comments: [],
    createdAt: "昨天"
  },
  {
    id: "user_post_3",
    title: "🎨 【草稿】关于在校园开展趣味胶片互拍企划的想法",
    content: "一直很想用我的胶片机帮校内可爱的同学们记录青春瞬间。完全免费！希望拼到一些表现力好的搭子，我们可以约在洪家楼老教堂或者操场，互相探讨构图和光影...",
    images: ["https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80"],
    school: "山东大学",
    authorName: "山大漫步女孩",
    authorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
    authorVerified: true,
    likes: 0,
    likedBy: [],
    category: "美味探店",
    isDraft: true,
    comments: [],
    createdAt: "草稿"
  },
  {
    id: "user_post_4",
    title: "🏸 【草稿】周末南外环体育中心夜跑打卡求赞",
    content: "听说学校附近的南外环绿道修好了，晚上有微风非常舒服。打算下周一晚上八点组一个夜跑拼，大约5公里，配速5分半到6分左右，跑完可以一起喝冰可乐！",
    images: ["https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=400&q=80"],
    school: "山东大学",
    authorName: "山大羽球小王子",
    authorAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80",
    authorVerified: true,
    likes: 0,
    likedBy: [],
    category: "运动打卡",
    isDraft: true,
    comments: [],
    createdAt: "草稿"
  },
  {
    id: "post_1",
    title: "这周末山大中心校区大草坪的微电影露天看片，有人组队拼个位置吗？🍿",
    content: "露天荧幕已经立起来啦！这次放的都是老文艺片，听说有《爱在》三部曲 and 王家卫的精选。去过的姐妹们知道需要自带野餐垫吗？求拼一两个看电影拼坐，顺便分享一包甜辣芝士味爆米花！",
    images: ["https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=400&q=80"],
    school: "山东大学",
    authorName: "周周不爱喝茶",
    authorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
    authorVerified: true,
    likes: 24,
    likedBy: ["user_dida_existing_wc", "user_dida_existing_ph"],
    comments: [
      {
        id: "com_1_1",
        authorName: "李明学弟",
        authorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
        content: "自带个报纸也行，那边草丛可能会有蚊子，记得带驱蚊水噢！加我一个拼坐！",
        createdAt: "2026-06-06 10:15"
      },
      {
        id: "com_1_2",
        authorName: "甜心棉花糖",
        authorAvatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80",
        content: "好文艺呀！不愧是我们山大，下周我也要去蹭草坪！🥺",
        createdAt: "2026-06-06 10:30"
      }
    ],
    createdAt: "2026-06-06 09:20"
  },
  {
    id: "post_2",
    title: "吐血排雷指南！宇宙中心极地这边的新概念桌游馆太坑了！",
    content: "首先声明我不是黑子，是真的很生气。这家老板服务态度极其散漫，本子居然是盗版，翻译错漏百出，还要收八十块一个头印子，真当大学生的钱都是大风刮来的啊！喜欢拼本格本的好好避坑这家！",
    images: ["https://images.unsplash.com/photo-1585504198199-20277593b94f?auto=format&fit=crop&w=400&q=80"],
    school: "山东大学",
    authorName: "不愿透漏姓名的高校生",
    authorAvatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=150&q=80",
    authorVerified: true,
    likes: 42,
    likedBy: ["user_dida_existing_wc"],
    comments: [
      {
        id: "com_2_1",
        authorName: "张三本尊",
        authorAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80",
        content: "卧槽，这店之前还上过推荐单，幸好师姐排雷，周日本来预谋去的...",
        createdAt: "2026-06-06 09:55"
      }
    ],
    createdAt: "2026-06-05 18:40"
  }
]

export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: "user_mock_peer_1",
    name: "陈思涵 (山大生科)",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
    isGroup: false,
    memberIds: ["user_123", "user_mock_peer_1"],
    lastMessage: "要不明天下午四点咖啡馆碰面？你可以带上你的相机嘛📷",
    lastMessageTime: "11:24",
    messages: [
      {
        id: "m_1_1",
        senderId: "user_mock_peer_1",
        senderName: "陈思涵",
        senderAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
        text: "嗨！系统匹配到咱们俩了，看了看你写的卡片信息，觉得你对荒木经惟的摄影风格分析超级独特！",
        createdAt: "2026-06-06 11:10"
      },
      {
        id: "m_1_2",
        senderId: "user_123",
        senderName: "你",
        senderAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
        text: "哈哈，受宠若惊！我其实也就是纯业余随便拍拍，你那张落日胶卷是在什么胶卷下的？色彩颗粒感好棒！",
        createdAt: "2026-06-06 11:15"
      },
      {
        id: "m_1_3",
        senderId: "user_mock_peer_1",
        senderName: "陈思涵",
        senderAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
        text: "那个是用柯达200拍的，在晴天下拉偏曝光一两档。要不明天下午四点咖啡馆碰面？你可以带上你的相机嘛📷",
        createdAt: "2026-06-06 11:24"
      }
    ],
    unreadCount: 1,
    zeroSugarEnabled: false
  },
  {
    id: "group_act_1",
    name: "【咖啡漫步】本周六咖啡社交群组",
    avatar: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=150&q=80",
    isGroup: true,
    activityId: "act_1",
    memberIds: ["user_123", "user_mock_peer_1", "user_mock_peer_3"],
    lastMessage: "[系统消息] 用户加入活动后，已自动激活本活动对应的拼群会话！快跟拼友们打个招呼吧～",
    lastMessageTime: "昨日",
    messages: [
      {
        id: "gm_1_1",
        senderId: "system",
        senderName: "系统",
        senderAvatar: "",
        text: "[系统消息] 用户加入活动后，已自动激活本活动对应的拼群会话！快跟拼友们打个招呼吧～",
        createdAt: "2026-06-05 15:05"
      }
    ],
    unreadCount: 0,
    zeroSugarEnabled: false
  }
]

export const MOCK_CREDIT_LOGS: CreditLog[] = [
  { id: "log_1", reason: "成功守约完成「周末咖啡探店活动」", change: 5, date: "2026-06-04" },
  { id: "log_2", reason: "完成真实的高校在校生学籍认证", change: 10, date: "2026-06-02" },
  { id: "log_3", reason: "发布积极活泼的活动拼贴未发生任何纠纷", change: 3, date: "2026-05-30" },
  { id: "log_4", reason: "被对方匿名好评：极具学者风度和幽默感", change: 5, date: "2026-05-28" }
]
