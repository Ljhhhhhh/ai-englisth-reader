## Metadata

- Profile: standard
- Rounds: 4
- Final Ambiguity: 6%
- Threshold: 20%
- Context Type: brownfield
- Context Snapshot: [server-mysql-migration-20260411T121443Z.md](/Users/pipilu/Documents/MaDun/ai-english-read/.omx/context/server-mysql-migration-20260411T121443Z.md)
- Interview Transcript: [server-mysql-migration-20260411T122309Z.md](/Users/pipilu/Documents/MaDun/ai-english-read/.omx/interviews/server-mysql-migration-20260411T122309Z.md)
- Prior High-Confidence Spec: [deep-interview-server-mysql-migration.md](/Users/pipilu/Documents/MaDun/ai-english-read/.omx/specs/deep-interview-server-mysql-migration.md)

## Clarity Breakdown

| Dimension | Score |
| --- | --- |
| Intent | 0.95 |
| Outcome | 0.95 |
| Scope | 0.95 |
| Constraints | 0.92 |
| Success | 0.92 |
| Context | 0.95 |

## Intent

把当前本地优先的英语精读 MVP 升级为一个可以正式上线的在线产品，而不是只完成数据库替换或服务器部署动作本身。

## Desired Outcome

交付一个可部署到 ECS Ubuntu 服务器上的 v1，满足：

- 正式账号登录
- 多设备同步
- MySQL 作为核心业务数据真源
- 文章内容与生成内容服务端化
- 现有核心阅读与 AI 能力保持可用

## In-Scope

- Next.js 应用部署到 ECS
- MySQL 替代 SQLite
- 去除 SQLite 运行时适配依赖
- 邮箱验证码登录
- JWT 会话
- 账号绑定的阅读进度同步
- 账号绑定的生词同步
- 现有内置文章入库
- 生成文章入库
- 生成文章按用户私有可见
- 保留文章列表、阅读器、生词页
- 保留 AI 划词解释
- 保留在线生成文章

## Out-of-Scope / Non-goals

- 后台管理
- 支付 / 订阅
- 复杂分析 / 运营看板
- 历史 localStorage / cookie 数据迁移

## Decision Boundaries

下游阶段可直接默认：

- 保持单体 Next.js 架构
- 使用邮箱验证码登录
- 使用 JWT
- 用数据库替代 localStorage / cookie / 文件系统作为运行时真源
- 文章内容与生成内容都迁移到 MySQL
- 生成文章仅对生成用户可见
- 生成流程保持异步服务端任务 + 前端轮询
- 目标部署环境是 ECS，服务器环境是 Ubuntu

## Constraints

- 基于当前仓库演进，不重写成全新系统
- 数据库必须是 MySQL
- 部署目标必须兼容 ECS Ubuntu
- 首版不做后台
- 首版不做支付
- 首版不做复杂分析
- 首版不迁移历史浏览器本地数据

## Testable Acceptance Criteria

- 新用户可以通过邮箱验证码完成注册 / 登录并建立 JWT 会话
- 同一账号在设备 A 创建的阅读进度和生词，可在设备 B 登录后看到
- 首页、阅读器、生词页在 ECS 部署环境中都可访问
- AI 划词解释可在登录态下正常工作
- 在线生成文章可提交、异步处理、写入 MySQL，并且仅生成用户可见
- 核心主路径不再依赖 localStorage、cookie-only 或服务器本地文件作为真源

## Assumptions Exposed + Resolutions

- 假设：多设备同步可以继续依赖匿名 `deviceId`
  Resolution: 否。已明确需要正式账号登录。
- 假设：只迁移用户状态即可，文章内容仍可保留 JSON / 文件系统
  Resolution: 否。已明确文章内容与生成内容都要入 MySQL。
- 假设：首版可以顺带加入后台、支付或历史数据迁移
  Resolution: 否。已明确排除这些范围。

## Pressure-Pass Findings

这次复压确认了“上线形态”的真实含义不是单点技术迁移，而是四件事同时成立：

- 有正式账号体系
- 有跨设备同步
- 有服务端内容真源
- 有可部署的生产运行形态

少掉任何一个，都会让后续计划偏回“只是工程改造”，而不是“可上线产品”。

## Brownfield Evidence vs Inference

Evidence:
- `prisma/schema.prisma` 当前 datasource 是 sqlite
- `src/lib/db.ts` 当前使用 `@prisma/adapter-better-sqlite3`
- `src/features/reader/progress-service.ts` 当前读写 localStorage
- `src/features/words/saved-word-service.ts` 当前读写 localStorage
- `src/app/api/words/route.ts` 与 `src/app/api/events/route.ts` 当前用 cookie 持久化
- `src/lib/device-id.ts` 当前使用匿名本地 `deviceId`
- 文章内容和生成文章当前存在文件系统读写路径

Inference:
- 在 ECS 多实例 Ubuntu 环境下，本地文件系统不能继续作为文章与生成内容的可靠真源
- 账号体系是跨设备同步所需的必要前提，而不是可选增强

## Technical Context Findings

- [prisma/schema.prisma](/Users/pipilu/Documents/MaDun/ai-english-read/prisma/schema.prisma)
- [src/lib/db.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/lib/db.ts)
- [src/lib/device-id.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/lib/device-id.ts)
- [src/features/reader/progress-service.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/features/reader/progress-service.ts)
- [src/features/words/saved-word-service.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/features/words/saved-word-service.ts)
- [src/app/api/words/route.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/app/api/words/route.ts)
- [src/app/api/events/route.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/app/api/events/route.ts)
- [src/lib/content/load-article.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/lib/content/load-article.ts)
- [src/features/articles/article-service.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/features/articles/article-service.ts)
- [src/features/generation/article-generator.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/features/generation/article-generator.ts)
- [src/features/generation/generation-job-service.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/features/generation/generation-job-service.ts)
- [src/app/api/generate/route.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/app/api/generate/route.ts)
- [src/app/api/generate/[jobId]/route.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/app/api/generate/[jobId]/route.ts)

## Recommended Handoff

Recommended next step: `$ralplan`

Suggested invocation:

```text
$plan --consensus --direct .omx/specs/deep-interview-server-mysql-migration-20260411.md
```

Alternative handoffs:

- `$autopilot` for direct planning + execution from this clarified brief
- `$ralph` for one-owner persistent execution against this brief
- `$team` for parallel lanes across auth, data migration, content migration, and deployment
