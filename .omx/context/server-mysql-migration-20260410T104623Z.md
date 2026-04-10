## Task Statement

从当前仓库迁到“服务器部署 + MySQL”的形态，输出执行前的深度澄清问题与边界。

## Desired Outcome

形成后续规划可直接消费的需求澄清基础，明确为什么要迁、迁到什么程度、哪些能力必须保留、哪些能力可以延后。

## Stated Solution

用户提出的目标方案是：前后端都部署到服务器，数据库改为 MySQL。

## Probable Intent Hypothesis

用户大概率想把当前偏本地 MVP 提升为可正式部署、可扩展、可多设备使用的在线产品，同时保留现有 AI 能力并降低 RN 重写成本。

## Known Facts / Evidence

- 当前项目是 Next.js App Router 单仓，页面和 API route 同仓。
- 当前 Prisma datasource 使用 sqlite，项目还依赖 `@prisma/adapter-better-sqlite3`。
- 文章主内容当前来自 `content/articles/*.json`，服务端通过 Node 文件系统读取。
- 文章生成功能会抓 URL / 解析文件 / 调 LLM / 把生成结果写回 `content/articles/*.json`。
- 阅读进度、生词、学习事件的核心实现当前主要在 `localStorage`。
- `words` 与 `events` API route 当前使用 cookie，不是数据库。
- `reader/explain` 与 `generate` 依赖服务端 LLM key，迁到服务端部署后安全性更好。

## Constraints

- 需要基于当前仓库演进，而不是抽象讨论新系统。
- 还未确认是否需要用户体系、管理后台、文章运营流程、多环境部署、历史数据迁移。
- 还未确认是否追求“最小可上线”还是“生产级完整改造”。

## Unknowns / Open Questions

- 迁移动机的主排序是什么：上线、稳定性、多设备同步、运营后台、团队协作、AI 能力安全托管，还是别的。
- 哪些现有功能必须在迁移后首版保留。
- 是否需要登录与账号体系。
- 文章内容是否仍以仓库 JSON 为主，还是改为数据库驱动。
- 生成文章是否要成为正式在线能力。
- 是否需要后台管理、审核、配额、监控、埋点。
- 目标部署环境是什么。

## Decision-Boundary Unknowns

- OMX/我是否可以默认把“localStorage/cookie 方案”统一替换为数据库持久化。
- 是否可以默认把“文章内容”从文件存储迁到 MySQL。
- 是否可以默认引入登录体系。
- 是否可以默认把“生成文章”改为异步任务化。

## Likely Codebase Touchpoints

- `prisma/schema.prisma`
- `prisma.config.ts`
- `src/lib/db.ts`
- `src/lib/content/load-article.ts`
- `src/features/articles/article-service.ts`
- `src/features/generation/article-generator.ts`
- `src/features/generation/generation-job-service.ts`
- `src/app/api/generate/route.ts`
- `src/app/api/generate/[jobId]/route.ts`
- `src/features/reader/progress-service.ts`
- `src/features/words/saved-word-service.ts`
- `src/features/analytics/event-service.ts`
- `src/app/api/words/route.ts`
- `src/app/api/events/route.ts`
