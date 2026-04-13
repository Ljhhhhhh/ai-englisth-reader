# Server + MySQL Migration Verification Checklist

> 对齐 `.omx/plans/test-spec-20260411T122309Z-server-mysql-migration.md`。

## 使用方式

每次集成 auth / MySQL / UI cutover / generation 变更后，都按下面顺序记录 PASS / FAIL。没有证据，不算完成。

## 0. 预备条件

- MySQL 实例可用，并已注入当前测试环境
- 邮箱验证码能力可在测试环境内稳定模拟或发送
- Playwright 所需 base URL、测试账号和 mock 能力已配置
- 文章导入脚本 / seed 脚本可在空库上运行

## 1. 静态与单元验证

```bash
pnpm lint
pnpm test
pnpm build
pnpm prisma validate
```

记录项：

- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm build`
- [ ] `pnpm prisma validate`

## 2. MySQL 集成验证

至少覆盖以下结论：

- [ ] `prisma migrate deploy` 能在空 MySQL 库执行成功
- [ ] 文章导入后，首页和 reader 都从数据库读数据
- [ ] 运行时关键路径不再依赖 SQLite adapter
- [ ] 运行时关键路径不再依赖文件写入生成文章
- [ ] progress / words / events API 都以认证用户为主键

建议命令（按最终实现调整）：

```bash
pnpm prisma migrate deploy
pnpm db:seed
pnpm test -- --runInBand
```

> 如果集成测试被拆成独立命令，请在发布记录中明确写出实际命令和结果。

## 3. Playwright / 端到端验证

```bash
pnpm test:e2e
```

至少确认以下场景：

- [ ] 登录 happy path：请求验证码 -> 验证 -> 进入已登录首页
- [ ] 跨设备同步：设备 A 开始阅读并保存单词，设备 B 登录同账号后能续读和看到同一生词
- [ ] Reader explain / save 流程在登录态下仍正常
- [ ] `/words` 仍按文章分组展示生词
- [ ] 用户 A 生成文章后可访问，用户 B 不可访问 A 的生成结果
- [ ] 匿名访问策略符合最终产品决策（允许浏览或被重定向）

## 4. 容器与部署验证

### 本地镜像验证

```bash
docker build -t ai-english-read:local .
docker run --rm -p 3000:3000 --env-file .env ai-english-read:local
curl -fsS http://127.0.0.1:3000/api/health
```

记录项：

- [ ] 镜像可成功构建
- [ ] 容器内应用能启动
- [ ] `/api/health` 返回 `200`

### ECS / 预发布 smoke

- [ ] 新镜像推送成功
- [ ] migration task 成功执行
- [ ] ECS Service 健康检查转绿
- [ ] 首页 / 登录 / 阅读 / 生词 / 生成流程 smoke 通过

## 5. 回归检查

必须显式检查这些“旧实现不再作为真源”的约束：

- [ ] 不再依赖 `deviceId` 作为核心 API 身份
- [ ] 不再依赖浏览器 `localStorage` 作为进度 / 生词 / 事件真源
- [ ] 不再依赖 cookie-only persistence 保存核心学习数据
- [ ] 不再依赖运行时文件系统读写文章与生成结果
- [ ] UI 中不再保留“本机保存”“本机阅读复盘”这类旧语义

## 6. 发布签收模板

```text
Verification:
- PASS | pnpm lint
- PASS | pnpm test
- PASS | pnpm build
- PASS | pnpm prisma validate
- PASS | <mysql integration command>
- PASS | pnpm test:e2e
- PASS | docker build -t ai-english-read:local .
- PASS | curl -fsS http://127.0.0.1:3000/api/health

Smoke:
- PASS | login
- PASS | cross-device resume
- PASS | save word sync
- PASS | generation ownership

Notes:
- <remaining operational risk or follow-up>
```
