# 滴答 (DIDA) - uni-app 小程序版

基于实名认证的高校社交活动平台，支持微信小程序、H5、App 等多端运行。

## 技术栈

| 类别 | 技术 |
|------|------|
| 前端框架 | uni-app (Vue 3 + Composition API) |
| 状态管理 | Pinia |
| 构建工具 | Vite 5 + @dcloudio/vite-plugin-uni |
| 样式 | SCSS |
| 后端 API | Express.js (Node.js, 独立部署) |
| AI 服务 | Google Gemini API |

## 项目结构

```
dida-uniapp/
├── src/
│   ├── pages/           # 页面
│   │   ├── index/       # 启动页
│   │   ├── verify/      # 学籍认证流程
│   │   ├── home/        # 首页（推荐/AI匹配/附近/主题周）
│   │   ├── forum/       # 校园论坛
│   │   ├── chat/        # 消息中心
│   │   ├── profile/     # 个人中心
│   │   ├── publish-activity/  # 发布活动
│   │   └── publish-post/      # 发布帖子
│   ├── components/      # 公共组件 (GlobalSOS)
│   ├── stores/          # Pinia 状态管理
│   ├── data/            # 类型定义 + Mock 数据
│   ├── styles/          # 全局样式
│   └── static/          # 静态资源（图标等）
├── server/              # Express 后端（独立运行）
└── pages.json           # 路由和 TabBar 配置
```

## 快速开始

### 前置要求

- Node.js >= 18
- 微信开发者工具（如需运行小程序）

### 安装与运行

1. 安装前端依赖
```bash
npm install
```

2. 安装后端依赖并启动
```bash
cd server && npm install && npm run dev
```

3. 启动小程序开发模式
```bash
# 微信小程序
npm run dev:mp-weixin

# H5 浏览器
npm run dev:h5
```

4. 打开微信开发者工具，导入 `dist/dev/mp-weixin` 目录

### 环境变量

复制 `.env.example` 为 `.env`，填入 Gemini API Key（可选，无 Key 时使用 Mock 数据）。

## TabBar 图标

需要自行准备 4 组图标文件（普通态 + 选中态），放入 `src/static/` 目录：
- tab-home.png / tab-home-active.png
- tab-forum.png / tab-forum-active.png
- tab-chat.png / tab-chat-active.png
- tab-profile.png / tab-profile-active.png

准备好后，在 `pages.json` 的 `tabBar.list` 中为每项添加 `iconPath` 和 `selectedIconPath` 字段。

## 与原 React 版的区别

| React 版 | uni-app 版 |
|----------|-----------|
| React 19 + TSX | Vue 3 + SFC |
| useState 本地状态 | Pinia 全局 store |
| Tailwind CSS | SCSS |
| framer-motion | CSS transitions + uni.createAnimation |
| SPA 单页切换 | 原生页面导航 + TabBar |
| Express 内嵌 | Express 独立后端 |
