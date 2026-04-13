# ECS Ubuntu Container-First Deployment Guide

> 适用范围：`.omx/plans/prd-20260411T122309Z-server-mysql-migration.md` 的服务器化迁移版本。

## 目标

把当前 Next.js 单体应用打包成适合 ECS 的容器镜像，并为 MySQL、账号登录、生成任务与健康检查准备最小可执行的部署骨架。

## 当前准备状态

这个仓库当前仍是本地优先 MVP，但已经补齐了迁移阶段需要的部署占位物：

- `Dockerfile`：Ubuntu 24.04 多阶段构建
- `.dockerignore`：避免把本地产物打进镜像
- `/api/health`：供 ECS / ALB / NLB 使用的健康检查路由

账号体系、MySQL schema、文章持久化和跨设备同步落地后，应直接沿用这里的容器流程，只补齐最终环境变量和迁移命令。

## 运行时假设

- 单体 Next.js App Router 应用继续作为唯一部署单元
- 应用通过环境变量连接 MySQL、LLM、JWT / session、邮件能力
- 文章内容、生成结果、用户状态最终都存入数据库，而不是容器文件系统
- ECS 服务只负责拉起应用容器；数据库迁移与种子导入通过一次性任务或发布前 job 执行

## 镜像构建

### 本地构建

```bash
docker build -t ai-english-read:local .
```

### 本地运行（示例）

```bash
docker run --rm -p 3000:3000 \
  --env-file .env \
  ai-english-read:local
```

启动后确认：

- `GET /api/health` 返回 `200`
- 首页可以打开
- 应用日志没有 Prisma 初始化错误

## 推荐 ECS 发布流程

1. 构建并推送镜像到 ECR。
2. 用同一镜像启动一次性 migration task：
   - `pnpm prisma migrate deploy`
   - 如迁移实现包含文章导入，再执行对应 import / seed 命令
3. 更新 ECS Service 使用新镜像。
4. 等待健康检查转绿后，再做功能 smoke。

## 任务定义建议

### 容器端口

- `containerPort: 3000`
- `hostPort: 3000`（awsvpc / Fargate 常见配置）

### 健康检查

优先由 ALB / NLB 探活：

- path: `/api/health`
- expected status: `200`
- timeout / interval 以 5s / 30s 作为起点，再按真实启动时间调整

### 启动命令

镜像默认命令：

```bash
pnpm exec next start --hostname 0.0.0.0 --port 3000
```

### 环境变量分组

发布前至少补齐以下几类变量：

1. **数据库**
   - `DATABASE_URL`
2. **应用基础配置**
   - 站点 base URL
   - cookie domain / secure 设置
3. **认证 / 会话**
   - JWT secret
   - session cookie 配置
4. **邮箱验证码登录**
   - 发件人地址
   - 邮件提供商凭证
5. **LLM / 内容生成**
   - API key
   - base URL
   - model

> 变量名应以最终迁移实现为准；如果 lane 1 / lane 2 调整了 `src/lib/env.ts`，请同步更新这里的字段清单。

## Ubuntu 容器注意事项

- 当前镜像以 `ubuntu:24.04` 为基础，方便与 Ubuntu 运维环境保持一致
- 通过 NodeSource 安装 Node 22，再由 Corepack 提供 pnpm
- Prisma / Next.js 构建发生在 image build 阶段，运行时只保留生产依赖和构建产物

## 数据与文件系统约束

迁移完成前后都应遵守：

- 容器文件系统不是持久层
- 不要把生成文章、用户状态或会话数据写回本地磁盘
- 一次性导入脚本可以读取仓库内 `content/articles/*.json`，但运行时查询应走数据库

## 上线后 smoke 检查

最少执行以下检查并记录结果：

1. `GET /api/health`
2. 打开首页
3. 完成一次邮箱验证码登录
4. 打开阅读器并保存一个单词
5. 跨浏览器 / 设备确认续读与生词同步
6. 提交一次生成任务并轮询到完成
7. 验证用户 B 无法访问用户 A 的生成结果

## 回滚建议

如果发布后健康检查失败或关键流程回归：

1. 回滚 ECS Service 到上一个稳定镜像
2. 保留失败任务日志与健康检查日志
3. 若问题来自 schema 迁移，停止继续放量，先评估是否需要回滚数据库变更
4. 在修复前，不要重新启用依赖本地文件系统或匿名设备状态的临时旁路
