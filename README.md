# AI 英语精读

这是一个面向中文母语者的交互式英语精读 Phase 1 MVP。产品目标不是“查很多词”，而是帮助用户围绕同一篇文章完成导读、正文精读和复盘，把关键词汇、语法点、难句和保存的生词都留在同一条阅读链路里。

## 当前 MVP 能做什么

- 首页展示文章列表与“继续阅读”入口
- 阅读器提供三阶段流程：导读、正文、复盘
- 基于 localStorage 恢复同一设备上的阅读进度
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

3. 可选：如果你希望本地 SQLite 结构和种子数据与项目计划保持一致，可执行 Prisma 初始化

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

- 当前文章内容来自 `content/articles/*.json`，并通过 Zod 做结构校验。
- MVP 阶段的阅读进度、生词和学习事件都保存在同一设备的 localStorage 中。
- Prisma 当前使用本地 SQLite 文件，便于轻量开发；但 Phase 1 UI 仍以本地 JSON 内容和同设备持久化为主。
- 用户可见界面文案已统一集中在 [src/lib/ui-copy.ts](src/lib/ui-copy.ts)，后续修改措辞优先从这里调整。

## 验证建议

在宣布 MVP 可以试用之前，先按 [docs/testing/mvp-smoke-checklist.md](docs/testing/mvp-smoke-checklist.md) 完整走一遍人工 smoke 流程。
