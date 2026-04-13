## Deep Interview Transcript Summary

- Profile: standard
- Context Type: brownfield
- Initial Ambiguity: 18%
- Final Ambiguity: 6%
- Threshold: 20%
- Context Snapshot: `.omx/context/server-mysql-migration-20260411T121443Z.md`

## Brownfield Findings

- 当前项目是 Next.js App Router 单仓，页面、API route、Prisma 都在同一个应用内。
- Prisma 已接入，但 datasource 仍是 `sqlite`，运行时依赖 `@prisma/adapter-better-sqlite3`。
- 阅读进度与生词的主实现仍以 `localStorage` 为真源。
- `words` 与 `events` API route 仍以 cookie 为持久化容器，不是数据库真源。
- 当前身份模型是本地生成的匿名 `deviceId`，不支持多设备账号同步。
- 当前文章内容与生成文章仍有文件系统读写路径，这不适合作为 ECS 多实例部署下的真源。

## Clarified Intent

这次升级不是单纯“把 SQLite 换成 MySQL”或“把项目部署到服务器”，而是把当前本地优先 MVP 升级成一个可正式上线的在线产品：用户可登录、数据跨设备同步、核心内容和状态都以服务端 MySQL 为真源。

## Desired Outcome

交付一个可部署到 ECS Ubuntu 服务器上的 v1：

- 用户可以通过邮箱验证码登录并获取 JWT 会话
- 用户进度和生词与账号绑定，可在多设备间同步
- 现有文章与用户生成文章都存入 MySQL
- 文章列表、阅读器、生词页、AI 解释、在线生成等主路径可在线稳定使用

## In-Scope

- 部署当前 Next.js 应用到 ECS
- 数据库切换到 MySQL
- 正式账号登录
- 邮箱验证码登录
- JWT 会话机制
- 阅读进度入库并与账号绑定
- 生词数据入库并与账号绑定
- 学习相关核心状态以数据库为真源
- 现有内置文章入库
- 用户生成文章入库
- 生成文章按用户私有可见
- 保留 AI 划词解释
- 保留在线生成文章
- 支持跨设备同步进度与生词

## Out-of-Scope / Non-goals

- 后台管理
- 支付 / 订阅
- 复杂数据分析或运营看板
- 历史 localStorage / cookie 数据迁移

## Decision Boundaries

下游规划或执行阶段可直接默认这些决定，不必再次确认：

- 保持单体 Next.js 架构，不拆前后端
- 使用邮箱验证码登录
- 使用 JWT 作为认证 / 会话机制
- 用 MySQL 作为所有核心业务数据真源
- 用数据库替代 localStorage / cookie / 文件系统作为运行时真源
- 现有文章和生成文章都迁入 MySQL
- 生成文章仅对生成用户可见
- 继续沿用“服务端异步生成 + 客户端轮询”模型
- 部署目标是 ECS，服务器环境为 Ubuntu

## Constraints

- 必须基于当前 brownfield 仓库演进
- 目标部署环境是 ECS
- 目标主机环境是 Ubuntu
- 数据库必须是 MySQL
- 首版不上后台管理
- 首版不做支付
- 首版不做复杂分析
- 首版不做历史本地数据迁移

## Testable Acceptance Criteria

- 新用户可以通过邮箱验证码完成登录并建立会话
- 用户在设备 A 的阅读进度和生词，在设备 B 登录同一账号后可见
- 首页文章列表可在部署环境正常访问
- 阅读器主流程可在部署环境正常访问
- 生词页对登录用户可正常工作
- AI 划词解释对登录用户可正常返回
- 用户可提交文章生成请求，服务端异步处理，生成结果入库并仅该用户可见
- 核心主路径不再依赖浏览器 localStorage、cookie-only 持久化或服务器本地文件写入作为真源

## Pressure Pass

本次 interview 不是从零开始，而是对历史高置信 spec 做复压。复压重点放在三个最容易“默认错”的地方：

- 多设备同步是否真的意味着正式账号体系，而不是匿名设备同步
- 文章内容是否也必须服务端化，而不是只迁移用户状态
- 首版是否会因为“顺手”扩到后台、支付、复杂分析或历史数据迁移

三项都已被明确收紧。

## Round-by-Round Condensed Transcript

### Round 1
- Target: Decision Boundary
- Question: 多设备同步是否仍建立在正式账号登录之上
- Answer: 是的

### Round 2
- Target: Decision Boundary
- Question: 文章内容与生成内容是否也一并迁入 MySQL，运行时不再依赖仓库 JSON / 文件系统
- Answer: 是的

### Round 3
- Target: Scope
- Question: 首版是否继续排除后台管理、支付订阅、复杂分析、历史本地数据迁移
- Answer: 是的

### Round 4
- Target: Constraint
- Question: 部署目标是否仍是 ECS，以及服务器环境
- Answer: 是的，ECS，且是 Ubuntu 的服务器
