# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

滴答 (DIDA) — a real-name-verified college social/activity platform built as a **uni-app** project (Vue 3 + Composition API), targeting WeChat Mini Program, H5, and App from one codebase. It is a port of an earlier React version (see the comparison table in `README.md`). The repo contains two independent halves: the uni-app frontend (source files live at the **project root** — HBuilderX standard layout, no `src/`) and a standalone Express AI backend (`server/`).

## Commands

**Frontend is an HBuilderX project** (uni framework is built into HBuilderX; not a CLI/Vite project). There are no `npm run dev/build` scripts — build & run from the HBuilderX GUI:
- 文件 → 打开目录 → select the project root.
- Run from root `npm install` once — this installs **only** business deps (`vue`, `pinia`, `@tencentcloud/chat`); `@dcloudio/*` is NOT in `package.json` because HBuilderX provides the framework.
- 运行 → 运行到小程序模拟器 (compiles to `unpackage/` and launches 微信开发者工具). Other targets (H5 / App) are sibling entries in the 运行 menu.

Backend (run from `server/`, separate `package.json` / `node_modules`):
```bash
cd server && npm install && npm run dev   # tsx index.ts, listens on :3000
```

No test runner, linter, or formatter is configured. There is no typecheck script; `tsconfig.json` is `noEmit` and used only for editor/IDE typing.

## Environment

Copy `.env.example` → `.env` in the **server** and set `GEMINI_API_KEY`. The key is optional: when missing (or left as the placeholder), the server returns hardcoded mock responses (`fallback: true`) instead of calling Gemini, so the whole app runs end-to-end with no key.

## Architecture

**State lives in one Pinia store.** `stores/app.ts` (`useAppStore`) is the heart of the app — it holds the current user, all activity/post/conversation/credit lists, and nearly all business logic as actions (`handleJoinActivity`, `handleProcessJoinRequest`, `handleInitiateChat`, `publishActivity`, etc.). Pages are mostly thin views over this store.

**Auth is real; business data is still mock.** The **authentication module** (login / register / SMS login) calls the real backend (`docs/API.md`) through the store actions `loginWithPassword` / `loginWithSms` / `registerUser` / `logout` / `restoreSession`, persists the Sa-Token + IM credentials via `uni.setStorageSync` (keys in `config`), logs into Tencent Cloud IM with the returned `userSig`, and auto-restores the session on launch (`pages/index/index.vue` → `restoreSession`). **Everything else** (activities / posts / conversations / credit logs) is still **in-memory mock**, seeded from `data/mock.ts` on launch and reset on reload — no persistence, no backend for that data yet.

**Mock-first for business data.** `data/mock.ts` provides seed content and `data/types.ts` defines every domain type (`UserProfile`, `Activity`, `Post`, `Conversation`, `GroupJoinRequest`, the backend VOs `UserLoginVO`/`UserInfoVO`/`RegisterParam`, etc.). A new *business* feature generally means: add/extend a type, seed mock data, add a store action — not a network call. A new *backend-backed* feature means: add an `api/*` function and a store action that maps the VO into the in-store shape (see `mapVoToProfile`).

**Navigation is two-layered.** There is the native uni-app TabBar (home / forum / chat / profile, declared in `pages.json`), switched with `uni.switchTab`. *Separately*, individual pages keep their own in-page sub-tab state (e.g. `home.vue` has 推荐 / AI偏好 / 附近 / 主题周 driven by a local `currentTab`). `store.activeTab` exists but the canonical page switching is via `uni.*` navigation APIs, not the store. App entry flows through `pages/index/index.vue`, which redirects to `pages/verify/verify.vue` (the **login page** — phone+password / phone+SMS only; SMS login on an unregistered phone auto-enters a **single-page 基本信息 register form** — 昵称/真实姓名/密码/性别 required, 兴趣标签/头像 optional, **no 学籍认证**; the avatar uploads via an Aliyun OSS presigned URL through `utils/upload.ts`, which returns `''` as a placeholder until the backend presign endpoint exists) when there is no `userProfile`, otherwise to home.

**AI backend is decoupled and optional.** `server/index.ts` exposes `POST /api/gemini/icebreaker` and `POST /api/gemini/venue` (model `gemini-3.5-flash`, lazily-constructed client). The frontend calls these from `pages/chat/chat.vue` via `uni.request` using **relative** URLs (`/api/gemini/...`) — there is no proxy or base-URL configured for these, and `mp-weixin` has `urlCheck: false` set in `manifest.json`. If you wire up real cross-origin calls, expect to configure a dev proxy (H5) or request domains (mini program). Every AI call in the UI already has a client-side fallback string, so failures degrade gracefully.

**Auth & network layer.**
- `config/index.ts` — central config with **dev/prod split** chosen by `process.env.NODE_ENV` (development → `dev`, production/发行 → `prod`). Use `process.env.NODE_ENV`, **not** vite-only `import.meta.env` — HBuilderX may compile via webpack, which has no `import.meta.env`. Holds `API_BASE_URL`, `IM_SDK_APP_ID`, `CAPTCHA_ID`, and `STORAGE_KEYS`. Keep the **named exports stable** — `request.ts`/`im.ts`/`captcha.ts` import them directly.
- `utils/request.ts` — `uni.request` wrapper: prepends `API_BASE_URL`, injects the Sa-Token header (key = stored `tokenName`, default `satoken`), unwraps the unified `Result<T>` (`code===200` → resolve `data`; else toast + reject), and on `code===401` clears auth storage and `reLaunch`s to verify. **Error toasts are friendly by code** via the internal `friendlyMessage(code, rawMessage)` map: 401→"登录已过期，请重新登录", 403→"没有操作权限", 404→backend `message` (user-facing per `docs/API.md`), 500→"服务器繁忙，请稍后重试" (**raw Java exception is hidden**), other→backend `message` or generic fallback. **This is the single place for centralized error feedback** — callers should rely on it (use `catch {}` and let request toast) rather than re-toasting `err.message`, which double-toasts and leaks technical 500 messages. Pass `showError: false` only when a caller wants to own the messaging.
- `api/user.ts` — the 6 backend endpoints (`login`, `register`, `loginSms`, `getSmsCode`, `logout`, `getUserInfo`); POST-with-query endpoints build their own query string via `toQuery`.
- `utils/im.ts` — Tencent Cloud IM (`@tencentcloud/chat`) singleton; `imLogin(userID, userSig)` / `imLogout()`. When `IM_SDK_APP_ID` is the placeholder `0`, IM is **silently skipped** so backend login still works.
- `utils/captcha.ts` — Aliyun CAPTCHA v2.0, **mp-weixin only**. Returns `{lot_number, captcha_output, pass_token, gen_time}` (exactly the `GET /auth/sms-verify-code` params). Uses the native `captcha4` custom component declared in `pages.json` (`verify.vue` hosts the `<captcha4>` tag and bridges its events to a promise via `beginMpCaptcha`/`settleMpCaptcha`, gated by `#ifdef MP-WEIXIN`). Other platforms have no captcha, so `verify.vue`'s `requestCaptcha` toasts "请在微信小程序中使用" and rejects (the old H5 `ct4.js`/`getCaptchaResult` path has been removed).

## uni-app conventions to follow

- Pages are `.vue` SFCs under `pages/<name>/<name>.vue` and **must be registered in `pages.json`** (and the TabBar list there for tab pages).
- Use uni-app APIs (`uni.request`, `uni.switchTab`, `uni.showToast`, `uni.createAnimation`, …) rather than browser/DOM APIs — code must compile to mini-program as well as H5.
- Styling is SCSS with `rpx` units; global styles in `styles/global.scss` (imported in `App.vue`). `transformPx` is off in `manifest.json`.
- Path alias `@/*` → the **project root** (HBuilderX default; `tsconfig.json` `paths` mirrors it as `@/* → ./*`). So `@/stores/app` etc. resolve from the root.
- `easycom` autoscan is on, so components under `components/` resolve by tag name without manual import.

## Notable details

- Credit-score system: scores are clamped 0–120 and changed only through `addCreditLog(change, reason)` in the store; mirror that pattern rather than mutating `creditScore` directly.
- `components/GlobalSOS.vue` (long-press emergency SOS) exists but is not currently mounted by any page.
- The mini-program `appid` in `manifest.json` is set to `wx7979c77605c59d41`.
- **`manifest.json` must declare `"vueVersion": "3"`** — this is what makes HBuilderX use the Vue3 + vite compiler. Without it HBuilderX falls back to Vue2 + webpack + ts-loader and strict-type-checks the *entire* project (breaks `ref`/`computed` imports, `import.meta.env`, dozens of implicit-any, and even pulls in `server/`). Do not remove it.
- `tsconfig.json` intentionally has `noImplicitAny: false` and `exclude`s `server` — legacy mock/page code has many untyped callbacks, and `server/` is an independent backend that must not enter the frontend type-check.
- **WeChat devtools setup**: enable 设置 → 安全设置 → 服务端口 so HBuilderX can auto-open the project (otherwise it connects to a stale instance and the project never opens — fallback is importing `unpackage/dist/dev/mp-weixin` manually). During dev, tick 详情 → 本地设置 → 不校验合法域名 so `:8080` / captcha / IM hosts aren't blocked.
- **Framework comes from HBuilderX, not npm**: `package.json` deliberately has **no `@dcloudio/*`** (HBuilderX bundles the uni framework). Only `vue` / `pinia` / `@tencentcloud/chat` are declared. Don't re-add `@dcloudio` deps — that's what made `npm install` fail under the old CLI layout.
- **Mini-program SMS-login prerequisites**: download the Aliyun `captcha4` SDK from the console and unzip it into `wxcomponents/captcha4/` (the `<captcha4>` tag won't render without it). For real devices/release, whitelist `https://captcha.alicaptcha.com` plus the Tencent Cloud IM request/socket domains in the WeChat mini-program console (`urlCheck:false` in `manifest.json` only covers the dev tool).
- Before deploying, fill the real `API_BASE_URL` / `IM_SDK_APP_ID` / `CAPTCHA_ID` for both `dev` and `prod` in `config/index.ts`.
