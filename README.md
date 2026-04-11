# AI 英语精读

这是一个面向中文母语者的交互式英语精读 Phase 1 MVP。产品目标不是“查很多词”，而是帮助用户围绕同一篇文章完成导读、正文精读和复盘，把关键词汇、语法点、难句和保存的生词都留在同一条阅读链路里。

## 当前 MVP 能做什么

- 首页展示文章列表与“继续阅读”入口
- 阅读器提供三阶段流程：导读、正文、复盘
- 邮箱验证码登录基础设施（JWT 会话 cookie）
- 基于 localStorage 恢复同一设备上的阅读进度（迁移进行中）
- 支持正文内行内查词与生词保存
- 提供生词本页面，按文章分组查看已保存词汇
- 支持在文章、首页和生词页之间快速跳转
- 记录核心阅读行为事件
- 覆盖桌面端和移动端的 Playwright 主流程测试

## 本地启动

1. 安装依赖

```bash
pnpm install
```

2. 创建本地环境文件

```bash
cp .env.example .env
```

3. 准备本地 MySQL，并执行 Prisma 初始化

```bash
pnpm db:push
pnpm db:seed
```

4. 启动开发环境

```bash
pnpm dev
```

打开 http://127.0.0.1:3000。

## 常用命令

- 开发环境：`pnpm dev`
- 生产构建：`pnpm build`
- Lint：`pnpm lint`
- 单元测试：`pnpm test`
- E2E 测试：`pnpm test:e2e`
- Prisma 推送：`pnpm db:push`
- Prisma 种子数据：`pnpm db:seed`

## 数据与实现说明

- 当前文章内容仍来自 `content/articles/*.json`，并通过 Zod 做结构校验；数据库持久化迁移正在推进。
- 邮箱验证码登录与 JWT 会话 cookie 已作为账号体系基础设施落地。
- 阅读进度、生词和学习事件仍处于从同设备 localStorage 向账号体系迁移的过程中。
- Prisma 已切换为 MySQL datasource，后续会继续把文章与用户状态全部切到数据库。
- 用户可见界面文案已统一集中在 [src/lib/ui-copy.ts](src/lib/ui-copy.ts)，后续修改措辞优先从这里调整。

## 验证建议

在宣布 MVP 可以试用之前，先按 [docs/testing/mvp-smoke-checklist.md](docs/testing/mvp-smoke-checklist.md) 完整走一遍人工 smoke 流程。
