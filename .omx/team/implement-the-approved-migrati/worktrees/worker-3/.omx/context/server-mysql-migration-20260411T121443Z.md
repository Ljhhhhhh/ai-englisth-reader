## Task Statement

让当前项目升级为“服务器部署 + 多设备同步 + MySQL”的形态，并通过 deep-interview 明确这次升级的真实目标、边界和可默认决策。

## Desired Outcome

基于当前 brownfield 仓库，形成一个可直接交给后续规划阶段消费的最新需求澄清基线；如果历史同主题结论仍然成立，则尽量复用而不是重复采访。

## Stated Solution

用户明确给出三项方向：
- 服务器部署
- 多设备同步
- 数据库使用 MySQL

## Probable Intent Hypothesis

用户想把当前偏 MVP / 本地优先的英语精读产品，升级成可正式部署、可跨设备连续使用的在线产品，并接受把核心状态迁到服务端。

## Known Facts / Evidence

- 当前项目是 Next.js App Router 单仓，页面和 API routes 同仓。
- Prisma 已接入，但 datasource 仍是 `sqlite`，运行时使用 `@prisma/adapter-better-sqlite3`。
- `README.md` 明确写着 MVP 的阅读进度、生词、学习事件主要保存在同一设备的 `localStorage`。
- `src/features/reader/progress-service.ts` 当前直接读写 `localStorage`。
- `src/features/words/saved-word-service.ts` 当前直接读写 `localStorage`。
- `src/app/api/words/route.ts` 和 `src/app/api/events/route.ts` 当前仍是 cookie 持久化，不是数据库真源。
- `src/lib/device-id.ts` 当前身份模型是浏览器本地生成的匿名 `deviceId`，不是账号体系。
- 历史访谈产物 `.omx/specs/deep-interview-server-mysql-migration.md` 已存在，并把 v1 方向收敛到“ECS + MySQL + 邮箱验证码登录 + JWT + 全量数据库持久化 + 跨设备同步”。

## Constraints

- 必须从现有仓库演进，不能把问题抽象成一张全新系统白纸。
- 当前用户这次输入没有重新确认历史访谈中的全部边界，尤其是“是否必须引入登录账号体系”。
- 这次 deep-interview 只做澄清与交接，不直接实施改造。

## Unknowns / Open Questions

- 已确认“多设备同步建立在正式账号登录之上”。
- 已确认继续沿用历史 spec 的核心边界：邮箱验证码登录 / JWT / 文章入库 / 生成文章入库 / 生成内容私有可见。
- 已确认不是“只把部署和 MySQL 打通”，而是按“可上线产品”标准推进。

## Decision-Boundary Unknowns

- 已确认可默认把 localStorage / cookie 方案统一替换为数据库持久化。
- 已确认可默认引入登录账号体系作为多设备同步前提。
- 已确认可默认把文章内容迁移到 MySQL，而不是继续以仓库 JSON 为真源。

## Latest Confirmations

- 多设备同步必须以正式账号登录为前提。
- 文章内容与生成文章都迁入 MySQL，运行时不再依赖仓库 JSON / 本地文件写入。
- 首版继续保持非目标：后台管理、支付订阅、复杂分析、历史 localStorage/cookie 数据迁移。
- 部署目标仍是 ECS，运行环境是 Ubuntu 服务器。

## Likely Codebase Touchpoints

- `prisma/schema.prisma`
- `src/lib/db.ts`
- `src/lib/device-id.ts`
- `src/features/reader/progress-service.ts`
- `src/features/words/saved-word-service.ts`
- `src/app/api/words/route.ts`
- `src/app/api/events/route.ts`
- `src/lib/content/load-article.ts`
- `src/features/articles/article-service.ts`
- `src/features/generation/article-generator.ts`
