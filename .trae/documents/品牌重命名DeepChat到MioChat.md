# 品牌重命名：DeepChat → MioChat（仅品牌文案）

## Context

定制分发场景需要把应用品牌从 "DeepChat" 改为 "MioChat"。用户已确认边界：
- **改**：用户可见品牌文案（package.json name/description、APP_NAME、i18n 值、splash 文本、托盘菜单文本）+ appId/包名（全新身份）。
- **保留**：wire identifier（`deepchat://` 协议、`window.deepchat` 全局桥、`DEEPCHAT_*` IPC 通道、`'deepchat'` agent 类型、`deepchatSessions` DB 表、`DEEPCHAT_VUE_DEVTOOLS_OVERLAY` 环境变量等）。
- **不改**：文件名/目录名、文档（README/AGENTS/CHANGELOG/docs/）、URL 域名（`deepchat.thinkinai.xyz`）。

**关键安全保证**：项目里 "DeepChat"（首字母大写 D+C）只出现在品牌文案和 i18n JSON 值中；所有 wire identifier 都是小写 `deepchat` 或带下划线 `DEEPCHAT_*`。因此对 "DeepChat"（精确大小写）做全局替换，天然不会误伤 wire identifier。

## 改动点

### 1. i18n JSON 值（20 种语言，~180 文件）

目录：`src/renderer/src/i18n/{locale}/*.json`，覆盖 da-DK / de-DE / en-US / es-ES / fa-IR / fr-FR / he-IL / id-ID / it-IT / ja-JP / ko-KR / ms-MY / pl-PL / pt-BR / ru-RU / tr-TR / vi-VN / zh-CN / zh-HK / zh-TW。

操作：对每个 JSON 文件，把字符串值中的 "DeepChat" 替换为 "MioChat"。JSON 键全小写（如 `deepchatSettings`），不会被命中。典型文件：`about.json`、`chat.json`、`mcp.json`、`settings.json`、`welcome.json`、`login.json`、`dialog.json`、`routes.json`、`sync.json`、`update.json`。

### 2. 托盘菜单文案

文件：`src/shared/i18n.ts`（11 处）

每个语言块的 `showHide` 字段值含 "DeepChat"：
- zh-CN L45: `'显示/隐藏 DeepChat'` → `'显示/隐藏 MioChat'`
- zh-TW L78、en-US L111、es-ES L227、de-DE L260、tr-TR L293、id-ID L326、ms-MY L359、it-IT L392、pl-PL L425、vi-VN L458 — 同样替换。

### 3. Splash 启动页

文件：`src/renderer/splash/loading.vue`（5 处）

L18/L67/L126 `<div class="unlock-title">DeepChat</div>` → MioChat；L129/L138 aria 文本 → MioChat。

### 4. 主进程应用名常量

文件：`src/main/appMain.ts`

L20 `const APP_NAME = 'DeepChat'` → `'MioChat'`（影响 `app.setName`、macOS 菜单栏、窗口标题默认值）。

### 5. package.json 身份字段

文件：`package.json`

- L2 `"name": "DeepChat"` → `"MioChat"`（npm 包名 = 全新身份）
- L4 `"description": "DeepChat，一个简单易用的 Agent 客户端"` → `"MioChat，一个简单易用的 Agent 客户端"`

**保留不动**：L45 `DEEPCHAT_VUE_DEVTOOLS_OVERLAY` 环境变量（wire identifier）。

注意：项目 package.json 中无 `build.appId`/`build.productName` 字段（build 配置不在 package.json 内，或打包时由外部流程注入），本次只改 package.json 内可见的 DeepChat 字眼。

### 6. i18n 类型重新生成

运行 `pnpm i18n:types` 重新生成 `src/types/i18n.d.ts`（值变化不影响键，但保持一致性）。

## 执行方式

用 PowerShell 脚本对 "DeepChat"（精确大小写匹配）做批量替换，目标范围限定：
- `src/renderer/src/i18n/**/*.json`
- `src/shared/i18n.ts`
- `src/renderer/splash/loading.vue`
- `src/main/appMain.ts`（仅 APP_NAME 行）
- `package.json`（仅 name/description 行）

不对 test/、docs/、build/、*.md、resources/skills/ 等做任何改动。

## 验证

1. `pnpm i18n:types` → `pnpm typecheck` → `pnpm lint` → `pnpm format:check`
2. `pnpm format`（如有格式问题自动修复后复检）
3. 抽查：`rg "DeepChat" src/renderer/src/i18n src/shared/i18n.ts src/renderer/splash/loading.vue src/main/appMain.ts package.json` 应返回 0 结果
4. 反向验证 wire identifier 未被误伤：`rg "deepchat://" src/main/deeplink` 仍存在、`rg "window.deepchat" src/preload` 仍存在、`rg "DEEPCHAT_ROUTE_INVOKE_CHANNEL" src/shared` 仍存在
5. 跑受影响测试：`pnpm vitest run test/renderer/components/App.startup.test.ts test/renderer/components/SettingsApp.test.ts`（i18n 值变了但键没变，测试用 key 调用 t() 不受影响）
