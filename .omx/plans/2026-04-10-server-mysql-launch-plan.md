## Requirements Summary

基于 [deep-interview-server-mysql-migration.md](/Users/pipilu/Documents/MaDun/ai-english-read/.omx/specs/deep-interview-server-mysql-migration.md)，将当前本地优先的 Next.js MVP 改造成可部署到 ECS 的在线产品。

必须达成：

- 邮箱验证码登录
- JWT 鉴权
- MySQL 作为唯一运行时数据源
- 文章列表与阅读器主流程保留
- 生词本保留并支持跨设备同步
- AI 选词解释保留
- 在线生成文章保留，生成结果仅自己可见
- 部署后核心页面稳定可访问

非目标：

- 管理后台
- 支付/订阅
- 管理员审核生成内容
- 复杂数据统计报表
- 旧 `localStorage/cookie` 数据迁移

## Acceptance Criteria

- 用户可通过邮箱验证码完成注册/登录，并获取有效 JWT 会话。
- 登录用户在设备 A 产生的阅读进度与生词，在设备 B 登录同一账号后可见。
- 首页、阅读页、生成页、生词页在部署环境中可访问且返回正确内容。
- AI 选词解释接口在登录态下可正常返回讲解结果。
- 用户可提交在线生成任务，客户端轮询任务状态，完成后可打开生成文章。
- 生成文章仅创建者本人可见，其他未登录用户或其他账号无法读取。
- 运行时不再依赖 `localStorage` 或 cookie 作为进度、生词、生成结果的真实数据源。
- 运行时不再依赖将文章写回服务器文件系统。

## RALPLAN-DR Summary

### Principles

- 先把真实数据源统一到服务端，再做页面适配。
- 保留单仓 Next.js 架构，避免首版上线前拆服务。
- 所有跨设备能力必须以账号归属为核心，而不是 `deviceId` 兼容层。
- 先满足上线主链路，拒绝把后台与运营能力混进首版。

### Decision Drivers

- 形式上线可用是第一优先级。
- 多设备同步是硬验收项，不是增强项。
- 现有代码已具备 Next.js 服务端与 AI 路由基础，适合原地演进。

### Viable Options

#### Option A: 保留 Next.js 单仓，直接引入 MySQL + Auth + 服务端持久化

- 优点：改造路径最短；可复用现有页面、API route、AI 服务；最符合当前代码结构。
- 缺点：需要在现有仓库内同时处理 schema、auth、页面数据流重构。

#### Option B: 拆分独立前后端，再迁移数据库与鉴权

- 优点：长期架构边界更清晰。
- 缺点：显著扩大首版范围；与“尽快正式上线”目标冲突；当前仓库没有现成 auth/backend 分层基础。

### Decision

采用 Option A。

### Invalidation Rationale

- 拆分前后端不是当前验收要求，且会引入额外部署、鉴权、接口契约和联调成本，不适合作为首版上线策略。

## ADR

### Decision

在当前 Next.js 单仓中，引入 MySQL、JWT、邮箱验证码登录，并把文章、进度、生词、生成任务与生成文章全部迁到数据库驱动的服务端模型。

### Drivers

- 需要尽快上线而不是重构架构边界。
- 多设备同步要求账号体系和服务端持久化。
- AI 能力已在服务端，保留该方向更安全。

### Alternatives Considered

- 保留本地存储，只迁部署和数据库
- 拆分前后端
- 继续文件系统存储文章/生成结果

### Why Chosen

- 仅迁部署/数据库但保留本地存储，无法满足跨设备同步。
- 拆分前后端超出首版范围。
- 文件系统存储不适合 ECS 上的正式运行时持久化。

### Consequences

- 数据模型需要以 `userId` 为核心重建部分服务层。
- 客户端页面需要从本地状态源切换为 authenticated server state。
- 需要新增登录页、验证码发送/校验流程、JWT 中间件或鉴权工具层。

### Follow-ups

- 首版后再评估后台与内容运营工具。
- 首版后再补充监控、备份、限流等硬化项。

## Implementation Steps

### 1. 重建数据模型与数据库接入

目标：先把运行时基础从 sqlite/file/localStorage 切到 MySQL + Prisma。

涉及文件：
- [prisma/schema.prisma](/Users/pipilu/Documents/MaDun/ai-english-read/prisma/schema.prisma)
- [prisma.config.ts](/Users/pipilu/Documents/MaDun/ai-english-read/prisma.config.ts)
- [src/lib/db.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/lib/db.ts)
- [prisma/seed.ts](/Users/pipilu/Documents/MaDun/ai-english-read/prisma/seed.ts)
- [content/articles/welcome-to-deep-reading.json](/Users/pipilu/Documents/MaDun/ai-english-read/content/articles/welcome-to-deep-reading.json)

工作内容：
- 将 datasource 从 sqlite 改为 MySQL。
- 删除 `@prisma/adapter-better-sqlite3` 运行时依赖及相关配置。
- 在 Prisma 中新增或重构以下实体：
  - `User`
  - `EmailVerificationCode` 或等价验证码表
  - `Article`
  - `ReadingProgress`
  - `SavedWord`
  - `GenerationJob`
  - 可选保留 `LearningEvent`，但不作为首版阻塞项
- 为 `Article` 增加所有权/可见性字段，区分系统文章与用户私有生成文章。
- 重写 seed 流程：把 `content/articles/*.json` 导入 MySQL，作为初始内容。

完成标准：
- 本地开发环境可通过 MySQL 迁移与 seed 启动。
- 现有文章数据可在数据库中查询到。

### 2. 引入最小可用认证体系

目标：建立邮箱验证码 + JWT 的首版登录链路。

涉及新增/改造区域：
- `src/app` 下新增认证相关页面和 API routes
- `src/lib` 下新增 JWT / auth 工具模块
- 可能新增 `src/middleware.ts`

当前证据：
- 代码库中不存在现成 auth/login/session/jwt 体系，`rg` 结果为空。

工作内容：
- 设计邮箱验证码发送、验证、登录/注册合一流程。
- 增加 JWT 签发与验证工具。
- 约定鉴权入口：
  - API route 鉴权工具
  - 页面级登录态校验
  - 需要时用 `middleware` 保护私有页面
- 将“谁是当前用户”的读取接口沉淀成统一服务，不再以 `deviceId` 代表身份。

完成标准：
- 用户可注册/登录并维持会话。
- 服务端能稳定解析当前用户身份。

### 3. 迁移文章读取与可见性模型

目标：文章列表、阅读页、生成结果全部改为数据库读取。

涉及文件：
- [src/lib/content/load-article.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/lib/content/load-article.ts)
- [src/features/articles/article-service.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/features/articles/article-service.ts)
- [src/app/page.tsx](/Users/pipilu/Documents/MaDun/ai-english-read/src/app/page.tsx)
- [src/app/reader/[slug]/page.tsx](/Users/pipilu/Documents/MaDun/ai-english-read/src/app/reader/[slug]/page.tsx)

工作内容：
- 用 Prisma 查询替换基于 `node:fs` 的文章加载。
- 首页仅展示公开系统文章与当前用户可访问的私有文章策略需明确实现。
- 阅读页读取时校验访问权限：
  - 系统文章：所有登录用户可见
  - 用户生成文章：仅所有者可见
- 将当前 `Article` JSON 结构映射到数据库字段，必要时保留 JSON 字段承载复杂结构，避免过早拆得过细。

完成标准：
- 首页和阅读页完全脱离文件系统读路径。
- 用户私有生成文章无法被他人直接读取。

### 4. 把本地阅读进度迁到账号持久化

目标：移除 `deviceId/localStorage` 作为阅读状态源。

涉及文件：
- [src/features/reader/progress-service.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/features/reader/progress-service.ts)
- [src/components/home/continue-reading.tsx](/Users/pipilu/Documents/MaDun/ai-english-read/src/components/home/continue-reading.tsx)
- [src/components/reader/reader-shell.tsx](/Users/pipilu/Documents/MaDun/ai-english-read/src/components/reader/reader-shell.tsx)

当前证据：
- `ContinueReading` 直接用 `window.localStorage` + `deviceId` 取最近进度。
- `ReaderShell` 多处直接读写 `window.localStorage`。

工作内容：
- 设计读取/保存进度的服务端 API 或 server action。
- 将“继续阅读”入口改成按当前用户查询最近进度。
- 阅读页内阶段切换、段落定位等状态写入服务端。
- 仅保留临时 UI state 在客户端，本地存储不再作为真实源。

完成标准：
- 同一账号在不同设备登录后能看到最近阅读进度。

### 5. 把生词本迁到账号持久化

目标：让生词本完全由用户账号驱动，并支持跨设备同步。

涉及文件：
- [src/features/words/saved-word-service.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/features/words/saved-word-service.ts)
- [src/app/api/words/route.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/app/api/words/route.ts)
- [src/app/words/page.tsx](/Users/pipilu/Documents/MaDun/ai-english-read/src/app/words/page.tsx)
- [src/components/words/word-list.tsx](/Users/pipilu/Documents/MaDun/ai-english-read/src/components/words/word-list.tsx)
- [src/components/reader/reader-shell.tsx](/Users/pipilu/Documents/MaDun/ai-english-read/src/components/reader/reader-shell.tsx)

当前证据：
- 生词服务以 `localStorage` 为主。
- `/api/words` 目前是 cookie 存储，不支持真正跨设备。

工作内容：
- 用数据库实现生词增删查。
- 生词页改为服务端拉取当前用户数据。
- 阅读页的“保存/取消保存单词”改为鉴权后的服务端写入。
- 统一去掉 `deviceId` 作为生词归属主键。

完成标准：
- 生词本在不同设备登录同一账号后保持一致。

### 6. 重构 AI 选词解释链路为登录态服务

目标：保留现有服务端 AI 解释能力，同时纳入用户体系。

涉及文件：
- [src/app/api/reader/explain/route.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/app/api/reader/explain/route.ts)
- [src/features/reader/reader-explain-service.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/features/reader/reader-explain-service.ts)
- [src/components/reader/reader-shell.tsx](/Users/pipilu/Documents/MaDun/ai-english-read/src/components/reader/reader-shell.tsx)

工作内容：
- 保持 explain 逻辑服务端执行。
- 为 explain API 增加登录态校验。
- 若需要记录配额或事件，预留用户维度字段，但不把复杂配额系统纳入首版。

完成标准：
- 登录用户在阅读页可继续进行 AI 选词解释。

### 7. 重构在线生成文章为数据库任务流

目标：保留当前轮询式生成体验，但把任务与结果迁到数据库。

涉及文件：
- [src/app/generate/page.tsx](/Users/pipilu/Documents/MaDun/ai-english-read/src/app/generate/page.tsx)
- [src/app/api/generate/route.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/app/api/generate/route.ts)
- [src/app/api/generate/[jobId]/route.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/app/api/generate/[jobId]/route.ts)
- [src/features/generation/generation-job-service.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/features/generation/generation-job-service.ts)
- [src/features/generation/article-generator.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/features/generation/article-generator.ts)
- [src/features/generation/extract-content.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/features/generation/extract-content.ts)

当前证据：
- 生成页以 `deviceId` 标识提交者。
- 生成服务完成后把文章 JSON 写到 `content/articles`。

工作内容：
- 生成任务归属改为 `userId`。
- 任务状态继续用轮询，不做实时流式。
- 文章生成完成后直接写 MySQL 的 `Article` 记录，而不是写文件。
- `/api/generate/[jobId]` 返回结果时校验任务所有权。
- 生成页移除 `deviceId` 依赖，改为登录用户上下文。

完成标准：
- 用户只能看到自己的生成任务与生成文章。

### 8. 收敛页面数据流并清理本地优先遗留逻辑

目标：把“本地状态 + cookie + 文件系统 + db”的混合模型收敛成单一线上模型。

涉及文件：
- [src/app/page.tsx](/Users/pipilu/Documents/MaDun/ai-english-read/src/app/page.tsx)
- [src/app/words/page.tsx](/Users/pipilu/Documents/MaDun/ai-english-read/src/app/words/page.tsx)
- [src/app/generate/page.tsx](/Users/pipilu/Documents/MaDun/ai-english-read/src/app/generate/page.tsx)
- [src/components/home/continue-reading.tsx](/Users/pipilu/Documents/MaDun/ai-english-read/src/components/home/continue-reading.tsx)
- [src/components/words/word-list.tsx](/Users/pipilu/Documents/MaDun/ai-english-read/src/components/words/word-list.tsx)
- [src/components/reader/reader-shell.tsx](/Users/pipilu/Documents/MaDun/ai-english-read/src/components/reader/reader-shell.tsx)
- [src/lib/device-id.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/lib/device-id.ts)

工作内容：
- 移除或降级 `deviceId` 到非核心兼容角色；首版主链路不再依赖它。
- 清理继续阅读、生词页、阅读页、生成页中的本地数据读取逻辑。
- 统一错误态与未登录态处理。

完成标准：
- 用户主链路在登录态下完整运行，不依赖浏览器本地数据存在。

### 9. 准备 ECS 部署与环境配置

目标：让项目具备可重复部署能力。

涉及文件：
- [package.json](/Users/pipilu/Documents/MaDun/ai-english-read/package.json)
- [README.md](/Users/pipilu/Documents/MaDun/ai-english-read/README.md)
- 可能新增 Dockerfile / 部署脚本 / 环境示例文件

工作内容：
- 定义 ECS 所需环境变量：
  - `DATABASE_URL`
  - JWT secret
  - 邮件服务配置
  - LLM 配置
- 确认构建、启动、迁移、seed 命令。
- 更新 README 的部署说明。

完成标准：
- 团队可按文档在 ECS 上完成部署。

## Risks and Mitigations

- 风险：认证与数据迁移同时进行，改动面较大。
  缓解：先完成 schema/auth 基础，再逐条迁移页面数据源，不混做。

- 风险：`Article` 结构复杂，完全规范化会拖慢进度。
  缓解：首版优先允许部分结构化 JSON 字段，先完成数据库化与权限控制。

- 风险：页面还残留本地状态源，导致跨设备表现不一致。
  缓解：在计划中明确把 `localStorage/cookie` 降为非真实源，并在验证环节用双设备测试抓出残留点。

- 风险：ECS 多实例或重启场景下文件系统写入丢失。
  缓解：彻底移除运行时文章文件写入。

- 风险：邮箱验证码链路引入外部依赖，影响联调。
  缓解：先抽象邮件发送接口，本地开发允许测试桩/控制台输出。

## Verification Steps

### Unit

- Prisma 服务层测试覆盖用户、验证码、进度、生词、生成任务核心读写。
- JWT 签发/校验测试。
- 文章可见性判断测试。

### Integration

- 认证 API：发送验证码、校验验证码、建立会话。
- 进度 API：登录用户保存并读取最近进度。
- 生词 API：登录用户保存、列出、删除生词。
- 生成任务 API：提交、轮询、权限校验。
- 文章读取：公开文章与私有文章的权限测试。

### E2E

- 新用户登录 -> 打开首页 -> 进入文章阅读 -> 保存进度 -> 进入生词页。
- 同账号双设备验证进度同步。
- 同账号双设备验证生词同步。
- 提交生成任务 -> 轮询完成 -> 打开生成文章。
- 其他账号或未登录用户访问私有生成文章被拒绝。

### Deployment

- ECS 环境成功执行迁移与 seed。
- 首页、阅读页、生词页、生成页在部署环境可访问。
- 选词解释与生成文章在部署环境可用。

## Teaming Guidance

可并行的工作面：
- Auth / JWT / 邮箱验证码
- Prisma schema / MySQL 迁移 / seed
- 文章与生成链路数据库化
- 进度与生词的前后端数据流替换
- ECS 部署脚本与环境整理

建议顺序：
- 先做 schema + auth 基础
- 再迁文章读取和生成链路
- 再迁进度与生词
- 最后收口页面与部署

## Recommended Next Step

如果继续执行，优先按此计划进入实现，不再回到需求澄清。对于执行方式：

- 单人串行：适合 `$ralph`
- 多 lane 并行：适合 `$team`

当前这份计划已经足够作为执行输入。
