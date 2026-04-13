# ECS MySQL 发布运行手册

这份手册对应 `.omx/plans/prd-20260411T122309Z-server-mysql-migration.md` 的第 6 阶段：把应用打包成容器镜像，在 ECS 上完成数据库迁移、内容导入、启动与健康检查。

## 目标

- 使用单个 Next.js 镜像交付首页、阅读器、生词本、登录与生成接口。
- 让 ECS 任务启动时可以按需执行 `prisma migrate deploy` 与种子/导入步骤。
- 通过统一的健康检查接口 `/api/health` 验证 Web 进程和数据库连通性。

## 新增交付物

- `Dockerfile`：多阶段构建 Next.js 产物。
- `.dockerignore`：避免把本地缓存、`.omx/`、`node_modules` 打进镜像上下文。
- `docker/entrypoint.sh`：通过环境变量决定是否在启动前执行数据库迁移与导入。
- `src/app/api/health/route.ts`：ECS / ALB 可直接探测的健康检查接口。

## 约定的启动开关

- `RUN_PRISMA_MIGRATE_DEPLOY=1`：容器启动时执行 `pnpm prisma migrate deploy`
- `RUN_PRISMA_SEED=1`：容器启动时执行 `pnpm db:seed`
- `PORT=3000`：Next.js 服务端口，默认 `3000`

默认值都为关闭，避免在本地或预览环境误跑迁移。

## 预期环境变量清单

以下变量来自迁移方案本身；等 auth / MySQL 代码分支合入后，应以最终 `.env.example` 为准：

- `DATABASE_URL`：MySQL 连接串
- `APP_BASE_URL`：站点对外访问地址
- `JWT_SECRET`：会话签名密钥
- `MAIL_FROM`：登录验证码发件人
- `MAIL_PROVIDER`：`log` 或 `gmail`
- `MAIL_SMTP_HOST`：Gmail SMTP 主机，默认 `smtp.gmail.com`
- `MAIL_SMTP_PORT`：Gmail SMTP 端口，默认 `465`
- `MAIL_SMTP_SECURE`：Gmail SMTP 是否启用 SSL，默认 `true`
- `MAIL_SMTP_USER`：Gmail 发件账号
- `MAIL_SMTP_PASS`：Gmail App Password
- `LLM_API_KEY`
- `LLM_BASE_URL`
- `LLM_MODEL`

## 构建镜像

```bash
docker build -t lexora:server-mysql .
```

## 本地模拟 ECS 启动

```bash
docker run --rm \
  -p 3000:3000 \
  -e DATABASE_URL='mysql://user:pass@host:3306/lexora' \
  -e RUN_PRISMA_MIGRATE_DEPLOY=1 \
  -e RUN_PRISMA_SEED=1 \
  lexora:server-mysql
```

如果要跳过迁移或导入，把对应变量留空或设为 `0`。

## ECS 发布顺序

1. 准备 MySQL 实例、账号、网络白名单与 Secret。
2. 构建并推送镜像到 ECR。
3. 在 ECS Task Definition 注入运行时环境变量与 Secret。
4. 首次发布或 schema 变更发布时，将 `RUN_PRISMA_MIGRATE_DEPLOY=1`。
5. 首次导入文章样本时，将 `RUN_PRISMA_SEED=1`，完成后恢复为 `0`。
6. 将 ALB / ECS health check 指向 `GET /api/health`。
7. 任务稳定后执行下方 smoke checklist。

## 健康检查约定

- 路径：`/api/health`
- 成功：HTTP `200`
- 失败：HTTP `503`
- 响应体示例：

```json
{
  "checks": {
    "database": "ok"
  },
  "ok": true,
  "service": "lexora",
  "timestamp": "2026-04-11T13:00:00.000Z"
}
```

## 回滚建议

- 保留上一版 ECS Task Definition 与 ECR 镜像 tag。
- 如果迁移已执行但应用启动失败，先确认 `/api/health` 是否因为数据库连通性或 Prisma schema 不一致而失败。
- 回滚应用镜像时不要自动回滚数据库；先确认 schema 是否向后兼容。

## 交接给最终集成分支时需要确认的事项

- `pnpm prisma migrate deploy` 是否已经有正式 migrations 目录可执行。
- `pnpm db:seed` 是否已从 SQLite/file-loader 完整切换到 MySQL 导入。
- auth 分支最终采用的邮件环境变量名称是否与本文档一致。
- 生成任务是否继续由 Web 容器进程内执行，还是改为独立 ECS worker/task。
