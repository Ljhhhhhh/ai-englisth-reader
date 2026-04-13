# 言序（Lexora）

言序（Lexora）是一个面向中文母语者的交互式英语精读 Phase 1 MVP。产品目标不是“查很多词”，而是帮助用户围绕同一篇文章完成导读、正文精读和复盘，把关键词汇、语法点、难句和保存的生词都留在同一条阅读链路里。

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

## 已批准的下一阶段迁移

当前仓库仍是本地优先 MVP；下一阶段会把它迁移为可在线部署的 MySQL + 账号体系版本。执行基线见：

- PRD：`.omx/plans/prd-20260411T122309Z-server-mysql-migration.md`
- 测试规格：`.omx/plans/test-spec-20260411T122309Z-server-mysql-migration.md`
- 部署说明：[`docs/deployment/ecs-ubuntu-container-first.md`](docs/deployment/ecs-ubuntu-container-first.md)
- 验证清单：[`docs/testing/server-mysql-migration-checklist.md`](docs/testing/server-mysql-migration-checklist.md)

## 本地启动

1. 安装依赖

```bash
pnpm install
```

2. 创建本地环境文件

```bash
cp .env.example .env
```

3. 启动本地 MySQL

项目默认连接串已经对齐到 `mysql://lexora:Guanmo!01@127.0.0.1:3306/lexora`，可以直接用仓库里的 Docker Compose：

```bash
docker compose -f docker-compose.mysql.yml up -d
docker compose -f docker-compose.mysql.yml ps
```

如需查看数据库日志：

```bash
docker compose -f docker-compose.mysql.yml logs -f mysql
```

停止并保留数据：

```bash
docker compose -f docker-compose.mysql.yml down
```

停止并清空数据卷：

```bash
docker compose -f docker-compose.mysql.yml down -v
```

如果你之前已经用旧账号或旧库名启动过一次 MySQL，需要先清掉旧数据卷再重新初始化，否则 MySQL 不会应用新的用户和数据库初始化参数。

4. 执行 Prisma 初始化

```bash
pnpm db:push
pnpm db:seed
```

5. 启动开发环境

```bash
pnpm dev
```

打开 http://127.0.0.1:3000。

## Gmail 验证码邮件配置

项目现在支持通过 Gmail SMTP 发送登录验证码邮件。最小配置如下：

```bash
MAIL_PROVIDER=gmail
MAIL_FROM=your_account@gmail.com
MAIL_SMTP_HOST=smtp.gmail.com
MAIL_SMTP_PORT=465
MAIL_SMTP_SECURE=true
MAIL_SMTP_USER=your_account@gmail.com
MAIL_SMTP_PASS=your_16_digit_app_password
```

补充要求：

- Gmail 账号必须先开启两步验证，然后生成 App Password 作为 `MAIL_SMTP_PASS`
- 生产环境不要保留 `AUTH_DEV_LOGIN_CODE`
- 生产环境建议同时设置 `AUTH_COOKIE_SECURE=true`

## 常用命令

- 开发环境：`pnpm dev`
- 生产构建：`pnpm build`
- Lint：`pnpm lint`
- 单元测试：`pnpm test`
- E2E 测试：`pnpm test:e2e`
- Prisma 推送：`pnpm db:push`
- Prisma 种子数据：`pnpm db:seed`
- Prisma 校验：`pnpm prisma validate`

## 容器与部署准备

本次迁移准备新增了面向 ECS 的最小容器化骨架：

- `Dockerfile`：Ubuntu 24.04 多阶段镜像，适合作为 ECS 镜像构建起点
- `.dockerignore`：排除 `.next`、`node_modules`、测试产物与本地数据库
- `/api/health`：提供最小健康检查端点，便于 ECS/NLB/ALB 探活

在账号体系、MySQL schema、文章持久化与跨设备同步落地后，请按部署说明补齐最终环境变量、迁移命令和 smoke 记录。

## 数据与实现说明

- 当前文章内容仍来自 `content/articles/*.json`，并通过 Zod 做结构校验；数据库持久化迁移正在推进。
- 邮箱验证码登录与 JWT 会话 cookie 已作为账号体系基础设施落地。
- 阅读进度、生词和学习事件仍处于从同设备 localStorage 向账号体系迁移的过程中。
- Prisma 已切换为 MySQL datasource，后续会继续把文章与用户状态全部切到数据库。
- 用户可见界面文案已统一集中在 [src/lib/ui-copy.ts](src/lib/ui-copy.ts)，后续修改措辞优先从这里调整。

### 目标状态（已批准迁移）

- MySQL 将成为运行时唯一事实来源。
- 登录改为邮箱验证码 + JWT / 会话 Cookie。
- 阅读进度、生词、学习事件与生成内容迁移为账号绑定的服务端状态。
- 运行时不再依赖 SQLite、本地 JSON 文章读写、`deviceId` 或浏览器本地状态作为真源。

## 验证建议

- 当前 MVP 冒烟流程：[`docs/testing/mvp-smoke-checklist.md`](docs/testing/mvp-smoke-checklist.md)
- 服务器 / MySQL 迁移验证流程：[`docs/testing/server-mysql-migration-checklist.md`](docs/testing/server-mysql-migration-checklist.md)

在宣布迁移版本可上线前，除了自动化命令，还应按迁移清单补完登录、跨设备同步、生成文章归属和部署 smoke 记录。
