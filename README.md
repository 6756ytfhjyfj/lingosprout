# 语芽 LingoSprout

**每天一小步，让新语言慢慢发芽。**

语芽是面向中文母语初学者的游戏化多语言学习 Web App。用每次约 5–10 分钟的课程，把“学习新内容 → 练习 → 间隔复习 → 对话运用”串成日常习惯。首版提供英语、日语和韩语入门体验，适配手机与桌面。

- **三语入门课程**：36 关、216 道练习，支持多语言切换与独立学习进度。
- **清晰的学习反馈**：知识介绍、五种题型、错题重练、通关结算与可解释的间隔复习。
- **轻量游戏化**：关卡路径、经验等级、每日目标、连续打卡与成就。
- **免费跟读练习**：浏览器示范音、慢速播放、主动录音与回放，不提供发音评分。
- **场景对话陪练**：DeepSeek 服务端接入、翻译、提示与温和纠错；未配置 API 时明确展示演示模式。

游客无需配置外部服务即可在开发模式体验课程、复习、打卡、跟读及演示陪练。真实 AI 调用需要 DeepSeek、Supabase 账户与数据库；支付尚未接入，课程跨设备同步尚未启用。详细限制见[演示与真实功能的边界](#演示与真实功能的边界)。

## 界面预览

### 桌面

![语芽桌面学习首页，展示语言切换、学习路径与每日目标](screenshots/desktop-preview.png)

### 手机

<img src="screenshots/mobile-preview.png" alt="语芽手机学习首页，展示关卡路径与底部导航" width="390" />

品牌、芽芽吉祥物、插画、界面与中文文案均在本项目中制作。移动端以“学习、复习、陪练、我的”为主导航，桌面增加学习侧栏。技术栈为 Next.js 16.4.2、React 19.3.1、TypeScript、原生 CSS，依赖版本已锁定。

## 本地运行

需要 **Node.js 22+** 和 npm。Windows 可双击同目录的 [启动语芽.cmd](启动语芽.cmd)。脚本会在尚无配置时复制 `.env.example` 为 `.env.local`，缺少依赖时安装依赖，然后启动开发服务。

也可以在本目录运行：

```powershell
Copy-Item .env.example .env.local  # 首次运行；已有配置时不要覆盖
npm ci
npm run dev
```

打开终端显示的地址，通常为 **http://127.0.0.1:3000**。如端口被占用，Next.js 会提示新地址。录音要求 localhost 或 HTTPS。

生产构建：

```powershell
npm run build
npm start
```

**注意：生产模式始终禁止演示订阅，也不使用开发文件存储。** 未配置 Supabase 时，游客课程、复习、打卡和跟读仍可使用；生产 AI 接口要求真实登录与持久数据库。完整无外部服务体验请使用 `npm run dev`。

## 可以体验什么

- 四步引导：选择语言、起点、学习目标、每日目标。三门语言都可随时添加或切换。
- **英语、日语、韩语各 4 单元 × 3 关 × 6 题，共 36 关、216 道练习。** 英语包括问候、日常、点餐、旅行；日语、韩语各有文字选段、礼貌问候、日常表达和点餐。
- 日语文字入门明确只选学 6 个平假名、3 个片假名；韩语选学 3 个元音及 6 个拼读音节。均不是完整字母课程或语言等级体系。
- 课程目标、知识介绍、选择题、三组匹配、选词组句、填空和听音选择。假名和字母题根据内容选用题型。
- 提交后反馈与中文解释，错题在稍后重现。匹配题按实际错误配对记录知识点。
- 首次正确率与重练正确率分开统计；未完成关卡可确认保留后退出，刷新后继续。
- 每门语言独立保存课程、XP 和复习；同一表达跨课程共用知识点。按设备本地日期打卡，跨语言同一天只记录一次。
- 间隔复习：答错约 10 分钟后复习；连续答对逐步安排到 1、3、7、14 天。记录学习时间、复习时间、下次时间、错误次数、连续答对与掌握状态。
- 首次通关 30 XP；每关每天前两次重复通关各 2 XP；复习每个知识点每天最多 1 XP、每天总上限 10 XP。达到奖励上限后仍可继续学习。
- 每 100 XP 提升一级；每日目标、连续天数、28 天学习日历、首次通关/连续 3 天/累计经验/多语言成就。
- 系统示范音与慢速播放；主动开启麦克风、停止、回放和清除录音。无对应语言声音、录音权限拒绝、不支持录音均有明确提示。录音不上传、不长期保存，离开页面清除；**只做跟读，不提供发音评分**。
- 五种陪练场景、两档难度、中文翻译、提示、可折叠纠错、主动收藏表达到对应语言复习。
- Premium 权益页、开发环境演示开通、完整历史及会话总结；价格尚未确定，不会收取费用。
- 资料与学习设置、关闭读音辅助、导出 JSON 学习记录；响应式布局、键盘焦点、原生对话框、减少动画偏好。

## 演示与真实功能的边界

未设置 `DEEPSEEK_API_KEY` 时，陪练始终显示“演示陪练”。开场、回复、提示和总结是固定脚本；不是实时 AI，也不评估用户能力。英语 `I name …` 可触发固定规则演示纠错；真实模式纠错由模型生成。

开发游客由 HttpOnly Cookie 标识；演示会话、演示订阅、额度和请求回执保存在 `.runtime/server.json`。课程/作答/复习/打卡保存在浏览器 `lingosprout.learning.v1` 中，**本地学习数据不包含可信订阅或 AI 额度**。开发文件存储只适合单进程演示，不能当生产账户体系使用。

开发演示订阅需要 `NODE_ENV=development` 且 `ENABLE_DEMO_SUBSCRIPTIONS=true`；游客演示开通有效 24 小时，无扣款、无自动续费。真实账户不能获得演示权益。生产环境即使设置该开关也会返回 403。

免费默认每天 5 条；Premium 默认每天 100 条，可通过服务端环境变量配置。**用户消息、提示和总结各计 1 条，失败不扣额度。** 开场示例不占额度。额度按 `AI_QUOTA_TIMEZONE` 的每日零点重置，默认北京时间；学习打卡仍按设备本地日期。

免费只提供当前会话，Premium 最多保留最近 50 次、每次最多 202 条消息。当前版本不启用课程跨设备同步。账户仅用于真实 AI 调用和服务端权益；访问令牌到期后需要重新登录。

## 配置真实 DeepSeek 与 Supabase

1. 选择一个专用 Supabase 项目，在 SQL Editor 执行 `database/schema.sql`。本交付没有创建、修改任何远程项目。
2. 启用邮箱/密码登录和合适的邮箱验证配置；按需配置邮件服务。在 `.env.local` 或部署平台私有环境变量中填写：

```dotenv
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-server-service-role-key
DEEPSEEK_API_KEY=your-private-deepseek-key
DEEPSEEK_MODEL=deepseek-flash
AI_FREE_DAILY_LIMIT=5
AI_PREMIUM_DAILY_LIMIT=100
AI_QUOTA_TIMEZONE=Asia/Shanghai
```

3. 重启服务，到“我的”注册、确认邮箱并登录。**一旦配置真实 DeepSeek 密钥，游客不能发送真实 API 请求。** 服务端通过 Supabase `/auth/v1/user` 验证用户，拒绝匿名账户。
4. 生产环境设置 `APP_ORIGIN=https://你的实际域名`，不要末尾斜杠；不要通过 `NEXT_PUBLIC_` 变量暴露任何密钥。
5. API 使用服务器端固定官方地址 `https://api.deepseek.com/chat/completions`。2026-10-17 查阅官方文档，当前模型包括 `deepseek-flash`、`deepseek-v4-pro`；默认使用 Flash，非思考模式、JSON 输出、最多 1200 输出 token。模型可配置，官方变更后需再次核实。

API 规则：每次请求验证身份、所有权、订阅、长度和额度；每用户每分钟最多 12 次陪练操作；最多 1000 字符、16 KB 请求体；上游 25 秒超时。先原子预留，成功后计数，失败释放。以用户 + requestId + 内容指纹去重，重放成功回执不重复计费；同会话同时只能有一个生成请求。客户端保留失败请求 ID，可安全重试。用户不能提交历史覆盖服务端消息或更改服务端场景、额度与权益。

生产存储使用数据库版本号与 CAS（比较后更新）事务，避免多实例同时突破额度。订阅从独立的 `subscriptions` 表读取，不使用可编辑的用户元数据。RLS 已启用；服务状态表及两个 RPC 只授权 service_role；用户只可读取自己的订阅。数据库 SQL 尚未在真实 Supabase 上执行验证，接入时应运行 advisors 与并发测试。

普通日志不输出密钥、完整请求或私人对话。真实陪练文字会发送至 DeepSeek，并保存为服务端会话；音频始终只在浏览器中处理。

## 支付、同步与部署

**真实支付尚未接入。** 已有独立订阅结构、服务端权益验证与价格配置 `PREMIUM_PRICE_LABEL`，但没有支付链接或真实扣费。上线前需要选择支付商，实现验签、防重放的支付 Webhook，只有该可信服务可以写入 `subscriptions` 的 `source=payment` 权益；前端没有写权限。

可以作为普通 Next.js 项目部署至 Vercel。项目根目录选择本目录，使用 Node.js 22+；设置上述私有环境变量和实际 `APP_ORIGIN`。所有生产实例必须使用同一个 Supabase 数据库；不要使用本地 JSON 保存生产额度。没有自动创建 GitHub 仓库、Vercel 项目或付费服务。

正式上线还需：真实 DeepSeek/邮箱/Auth 与数据库联调、原子额度压力测试、支付接入、课程母语审校、浏览器/真机音频验证、隐私与数据保留/删除流程、持久认证及课程同步。当前 MVP 不宣称这些服务已上线。

## 代码结构

```text
src/app/                     页面入口、全局样式、服务端 API
src/components/              引导、学习路径、练习、跟读、陪练、统计与权益页
src/lib/curriculum.ts        三语独立编写的单元、知识点与题目
src/lib/types.ts             学习记录、作答、复习、会话、订阅的独立类型
src/lib/learning.ts          解锁、判题、重练、结算、XP、打卡和间隔复习
src/lib/repository.ts        浏览器存储适配器，与界面分离
src/server/                 身份、权限、存储、DeepSeek 适配器与提示词
database/schema.sql         Supabase RLS、订阅表与原子持久状态接口
tests/                      业务、上游模拟、浏览器与真实 HTTP 测试
screenshots/                实际浏览器截图
```

## 验证

```powershell
npm run typecheck
npm test
npm run build
# 另一个终端先运行 npm run dev，启用开发演示订阅
npx playwright install chromium
npm run test:e2e
```

也可使用系统 Chrome，避免下载浏览器：

```powershell
$env:PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH='C:/Program Files/Google/Chrome/Application/chrome.exe'
npm run test:e2e
```

`scripts/accessibility.ts` 检查七个桌面页面、手机学习页及桌面/手机答题反馈；`scripts/capture.ts` 可重新生成截图。当前有 16 项业务/传输测试及 16 项浏览器/HTTP 测试。详细验收记录见 `验收记录.md`。没有真实密钥、账户和数据库时，测试会使用本地演示、模拟上游错误和浏览器假麦克风，不能替代真实第三方联调。

官方资料：[DeepSeek 首次调用](https://api-docs.deepseek.com/)、[JSON 输出](https://api-docs.deepseek.com/guides/json_mode/)、[思考模式参数](https://api-docs.deepseek.com/guides/thinking_mode/)、[Supabase 密码登录](https://supabase.com/docs/guides/auth/passwords)。Next.js 实现亦对照安装版本附带的 `node_modules/next/dist/docs/`。
