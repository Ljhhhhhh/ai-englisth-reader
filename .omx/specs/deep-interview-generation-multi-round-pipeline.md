# Multi-round Article Generation With SSE And Stage Retry

## Metadata

- Profile: `standard`
- Rounds: `7`
- Final ambiguity: `13.3%`
- Threshold: `20%`
- Context type: `brownfield`
- Context snapshot: `.omx/context/generation-multi-round-pipeline-20260413T134215Z.md`
- Interview transcript: `.omx/interviews/generation-multi-round-pipeline-20260413T134215Z.md`

## Clarity breakdown

| Dimension | Score |
| --- | --- |
| Intent | 0.84 |
| Outcome | 0.90 |
| Scope | 0.92 |
| Constraints | 0.90 |
| Success | 0.82 |
| Context | 0.84 |

## Intent

当前文章生成成功率过低，核心怀疑点是一次性让模型输出过重的结构化结果，导致整体失败率高、失败后无阶段收益、用户也看不到过程中已有的可用产物。目标是把生成拆成更稳定的多轮流程，并让用户在生成过程中逐轮看到完整阶段产物。

## Desired Outcome

将现有单次文章生成改为四轮串行流程：

1. 第 1 轮生成英文文章。
2. 第 2 轮基于英文文章生成单词与高频词组。
3. 第 3 轮基于英文文章生成本文语法讲解。
4. 第 4 轮基于英文文章生成中文翻译。

过程中前端通过 SSE 实时收到进度更新。每轮一旦成功，前端立即显示该轮完整预览产物。若某轮失败，前面已成功轮次的结果保留；用户可从失败轮次继续重试，后续轮次顺序继续执行，已成功轮次不重跑。

## In Scope

- 将后端生成链路从单次 LLM 调用拆为四轮串行调用。
- 为每轮定义独立输入、输出 schema 和失败边界。
- 扩展 `GenerationJob` 持久化结构，保存：
  - 当前轮次 / 阶段状态
  - 每轮中间产物
  - 失败信息
  - 重试所需的阶段上下文
- 提供 SSE 流式状态接口，向前端推送：
  - 任务整体状态
  - 当前轮次
  - 每轮开始 / 成功 / 失败事件
  - 每轮完整预览数据
- 改造生成页 UI，使其在每轮完成后立即展示英文正文、词汇词组、语法讲解、中文翻译的阶段预览。
- 允许失败后从失败轮次继续执行。
- 在必要时调整阅读页最终消费结构，以适配多轮结果最终装配出的文章结构。
- 保留最终落库为现有或演进后的文章实体，供阅读页消费。

## Out of Scope / Non-goals

- 不做前端用户手动编辑每轮产物。
- 不强制第一轮必须注入用户生词本中的陌生词。
- 不要求因为这次改造而调整每日次数限制或账号权限体系，除非实现链路被现有逻辑阻塞。
- 不要求把本次需求扩展成通用工作流编排平台；目标仍是文章生成链路。

## Decision Boundaries

以下内容可由执行方自行决定，无需再次确认：

- 数据库迁移具体字段设计，只要能稳定支撑阶段状态、中间结果和失败重试。
- SSE 事件命名、事件载荷结构、前端订阅策略。
- 各轮 prompt 拆分方式、schema 设计以及最终装配顺序。
- 是否需要新增中间类型而不是直接复用最终 `Article` schema。
- 阅读页若因最终数据装配需要发生结构调整，可按需改动，但应保持用户最终阅读体验可用。

以下内容已明确，不应自行改写：

- 必须用 SSE，而不是继续只靠轮询。
- 必须支持从失败轮次继续重试。
- 每轮成功后必须立刻在前端展示该轮完整预览。
- 本次不做前端编辑每轮产物。
- 生词本词汇不作为第一轮硬约束。

## Constraints

- 当前项目为 brownfield Next.js App Router + Prisma + MySQL。
- 当前生成页是基于 job 持久化与轮询的模型，需演进为支持 SSE。
- 当前 `GenerationJob` 仅有总状态与错误信息，无法承载阶段性结果。
- 当前 `article-generator.ts` 仅支持一次模型调用，需要重构为多阶段 orchestration。
- 最终系统仍需生成阅读页可消费的文章结果。
- 每轮失败不能破坏前面已成功轮次的可见结果。

## Testable acceptance criteria

- 提交生成任务后，前端通过 SSE 接收实时事件，而不是只能轮询总状态。
- 第 1 轮成功后，生成页立刻展示英文正文预览。
- 第 2 轮成功后，生成页立刻展示单词与高频词组预览。
- 第 3 轮成功后，生成页立刻展示语法讲解预览。
- 第 4 轮成功后，生成页立刻展示中文翻译预览。
- 任一轮失败时，任务进入可重试状态，失败轮之前的阶段结果仍可在前端看到。
- 用户触发重试后，系统从失败轮继续，而不是从第 1 轮全量重跑。
- 成功完成四轮后，系统能装配出最终可用文章，并保持阅读页可正常消费。
- 第一轮生成逻辑默认不强制使用用户生词本词汇。
- 前端不存在“编辑每轮产物”的交互入口。

## Assumptions exposed + resolutions

- 假设 1：前端只需要总进度状态。
  - 结论：错误。前端需要在每轮完成后看到完整预览产物。
- 假设 2：为了缩小范围，可以维持轮询。
  - 结论：错误。必须改为 SSE。
- 假设 3：失败后可接受整单重跑。
  - 结论：错误。必须从失败轮继续，保留前面成功结果。
- 假设 4：第一轮需要优先注入用户生词本词汇。
  - 结论：错误。该要求不是硬约束。
- 假设 5：本次应顺手支持前端编辑阶段产物。
  - 结论：错误。本次仅支持预览，不支持编辑。

## Brownfield evidence vs inference

Evidence:
- `src/features/generation/article-generator.ts` 当前是一轮 `withStructuredOutput(promptOutputSchema)` 调用。
- `src/features/generation/prompt-output-schema.ts` 当前要求单次输出所有目标字段。
- `src/features/generation/generation-job-service.ts` 当前只支持 `pending/processing/done/failed`。
- `prisma/schema.prisma` 当前 `GenerationJob` 没有阶段字段或中间结果字段。
- `src/components/generate/generate-page-client.tsx` 当前只轮询 job 总状态。
- `src/features/words/server-saved-word-service.ts` 已存在服务端生词本读取能力。

Inference:
- 当前成功率低很可能与单次 schema 过重、字段耦合过强有关。
- 多轮拆分将降低单轮复杂度，提高整体成功率，并让失败成本局部化。

## Technical context findings

- 生成链路入口：
  - `src/app/api/generate/route.ts`
  - `src/features/generation/article-generator.ts`
- job 查询入口：
  - `src/app/api/generate/[jobId]/route.ts`
  - `src/features/generation/generation-job-service.ts`
- 现有 prompt 与 schema：
  - `src/features/generation/load-prompt.ts`
  - `docs/prompt.md`
  - `src/features/generation/prompt-output-schema.ts`
- 现有文章 schema：
  - `src/lib/content/article-schema.ts`
- 前端生成页：
  - `src/components/generate/generate-page-client.tsx`
- 生词本服务端数据：
  - `src/features/words/server-saved-word-service.ts`

## Suggested execution shape

建议下一步进入 `ralplan`，先把以下内容定成实现计划：

- 四轮 stage contract 与中间 schema
- `GenerationJob` 新字段与迁移策略
- SSE 事件协议
- 失败处重试状态机
- 最终文章装配与阅读页适配面
- 测试方案：单元、路由、前端 SSE 状态流

## Residual risk

- 具体阅读页最终是否需要调整，目前只明确为“按需调整”，尚未在文件级别锁死。
- 若现有基础设施对长连接有约束，SSE 路由与前端订阅方式可能需要额外工程兼容处理。
