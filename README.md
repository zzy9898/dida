# 滴答 (DIDA)

基于实名认证的高校社交活动平台，使用 **uni-app** 一套代码多端运行，**以微信小程序为主**，同时兼容 H5 / App。

---

## 技术栈

| 类别 | 技术 |
|------|------|
| 前端框架 | uni-app（Vue 3 + Composition API） |
| 状态管理 | Pinia |
| 样式 | SCSS（`rpx` 单位） |
| 即时通讯 | 腾讯云 IM `@tencentcloud/chat` |
| 图形验证码 | 阿里云图形验证码 2.0（微信小程序原生组件 `captcha4`） |
| 鉴权 | Sa-Token（后端下发 `satoken`，前端持久化注入请求头） |
| AI 服务 | Google Gemini（`server/`，独立可选，无 Key 时返回 mock） |
| 开发 / 调试 | HBuilderX + 微信开发者工具 |
| 目标平台 | 微信小程序（主） / H5 / App |

> 本项目为 **HBuilderX 标准工程**：uni 框架由 HBuilderX 内置，`package.json` 不含 `@dcloudio/*`，只声明业务依赖（`vue` / `pinia` / `@tencentcloud/chat`）。

---

## 项目结构

源码位于**项目根目录**（HBuilderX 标准布局，无 `src/`）：

```
dida/
├── pages/            # 页面（index 启动页 / verify 认证 / home / forum / chat / profile / publish-*）
├── components/       # 公共组件
├── stores/           # Pinia 状态（app.ts，应用核心 + 鉴权 actions）
├── data/             # 类型定义(types.ts) + Mock 数据(mock.ts)
├── api/              # 后端接口封装（user.ts）
├── utils/            # request(HTTP) / im(腾讯云IM) / captcha(图形验证码)
├── config/           # 环境配置（dev / prod）
├── styles/           # 全局 SCSS
├── wxcomponents/     # 微信小程序原生组件（captcha4 阿里云验证码 SDK）
├── App.vue  main.ts  pages.json  manifest.json  uni.scss  index.html
└── server/           # 独立 Express AI 后端（与前端分开运行）
```

---

## 环境准备

| 工具 | 说明 |
|------|------|
| [HBuilderX](https://www.dcloud.io/hbuilderx.html) | 主开发工具；首次编译 Vue3 会提示安装「**uni-app (Vue3) 编译器**」插件，按提示装上 |
| [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html) | 小程序模拟器 / 真机调试，需用微信扫码登录 |
| Node.js ≥ 18 | 安装业务三方依赖、运行 AI 后端 |

---

## 配置

运行前按需修改以下占位项：

1. **`config/index.ts`** —— 分 `dev` / `prod` 两套（按 `process.env.NODE_ENV` 自动选择）：
   - `API_BASE_URL` 后端地址（默认 `http://127.0.0.1:8080`）
   - `IM_SDK_APP_ID` 腾讯云 IM SDKAppID（[IM 控制台](https://console.cloud.tencent.com/im)获取）
   - `CAPTCHA_ID` 阿里云图形验证码 appId（小程序端原生 `captcha4` 组件使用）
2. **`manifest.json`**
   - 必须保留 `"vueVersion": "3"`（否则 HBuilderX 退回 Vue2 + webpack 编译，会报一堆错）
   - `mp-weixin.appid`：当前为 `wx7979c77605c59d41`
3. **`wxcomponents/captcha4/`** —— 微信小程序短信登录所需。从阿里云号码认证控制台下载图形验证码小程序 SDK，解压组件文件到此目录（`captcha4.js/json/wxml/wxss`）。

---

## 调试方式（HBuilderX + 微信开发者工具）

### 1. 在 HBuilderX 中运行
1. **文件 → 打开目录**，选择项目根目录。
2. 在项目根执行一次依赖安装（HBuilderX 内置终端或外部命令行）：
   ```bash
   npm install
   ```
   只会安装 `vue` / `pinia` / `@tencentcloud/chat`（框架来自 HBuilderX，不装 `@dcloudio/*`）。
3. **运行 → 运行到小程序模拟器 → 微信开发者工具**。HBuilderX 会编译到 `unpackage/dist/dev/mp-weixin` 并自动拉起微信开发者工具。
   - 其他端：同一「运行」菜单下选 H5 / App。

### 2. 微信开发者工具设置
- **设置 → 安全设置 → 开启「服务端口」**：HBuilderX 才能自动打开/刷新项目；否则可能停在工具首页（连到了旧实例）。
- **详情 → 本地设置 → 勾「不校验合法域名、web-view、TLS、HTTPS 证书」**：开发期放行 `:8080` 后端、验证码、IM 等域名请求。
- 确保已用**微信扫码登录**开发者工具。

### 3. 自动联动失败时的兜底
若 HBuilderX 没能自动打开项目：**完全关闭所有微信开发者工具窗口**后重新运行；仍不行则手动导入——
微信开发者工具 → 导入项目 → 目录选 `unpackage/dist/dev/mp-weixin`，AppID 填 `wx7979c77605c59d41`。
导入打开后保持工具开着，HBuilderX 改文件保存即自动热刷新。

### 4. 联调登录功能
- 启动**登录后端**（监听 `:8080`，前端经 `API_BASE_URL` 连接）。
- 进登录页测试：账号密码登录 / 短信验证码登录（点「获取验证码」会弹 `captcha4` 滑块）/ 注册。
- IM 是否登录成功看 Console：成功会打印 `[IM] login 成功` / `[IM] SDK_READY`。

### 5. 真机预览 / 上线
开发者工具的「不校验合法域名」仅对本地预览有效。真机/发布需在 **微信公众平台 → 开发管理 → 服务器域名** 的 request 合法域名中加入（均需 HTTPS）：
- 后端域名
- `https://captcha.alicaptcha.com`（阿里云图形验证码）
- 腾讯云 IM 的 request / socket 域名

---

## AI 后端（可选，独立运行）

`server/` 是与前端解耦的 Express 服务，提供破冰话术 / 选址推荐接口。

```bash
cd server
npm install
npm run dev        # tsx index.ts，监听 :3000
```

复制 `.env.example` → `.env` 并填 `GEMINI_API_KEY`；**不填也能跑**——缺 Key 时接口返回 mock 数据（`fallback: true`），全流程无需 Key 即可体验。
