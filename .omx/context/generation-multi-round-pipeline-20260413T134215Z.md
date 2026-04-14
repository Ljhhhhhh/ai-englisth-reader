Task statement
- 将当前文章生成为单次结构化调用的实现，调整为四轮串行调用。

Desired outcome
- 第 1 轮产出英文文章，可适度使用单词本中的陌生词。
- 第 2 轮基于英文文章产出单词与高频词组。
- 第 3 轮产出本文涉及的语法讲解。
- 第 4 轮翻译英文文章得到中文版本。
- 四轮执行过程中，前端实时显示每一轮的进度与阶段性产物。

Stated solution
- 从一次 LLM 调用改为多轮调用，并同步调整前端实时更新机制。

Probable intent hypothesis
- 当前一次性结构化生成成功率过低，失败点可能来自输出 schema 过大、约束过多、字段之间耦合太强。
- 通过拆成四轮，降低每轮输出复杂度，提升总成功率，并让用户看到阶段结果而非只有总状态。

Known facts / evidence
- `src/features/generation/article-generator.ts` 当前仅执行一次 `withStructuredOutput(promptOutputSchema)` 调用，再直接构建最终 Article。
- `src/features/generation/prompt-output-schema.ts` 当前要求模型一次产出中文标题、列表摘要、词汇、词组、语法、英文正文、全文翻译、段落翻译。
- `src/app/api/generate/route.ts` 后台异步执行 `extractContent -> generateArticle`，作业状态仅有 `pending/processing/done/failed`。
- `src/app/api/generate/[jobId]/route.ts` 返回的作业信息没有阶段字段，也没有中间产物字段。
- `src/features/generation/generation-job-service.ts` 仅支持更新总状态、错误、articleSlug。
- `prisma/schema.prisma` 中 `GenerationJob` 仅有 `status/sourceType/sourceRef/articleSlug/errorMsg`，当前没有阶段进度或中间结果存储位。
- `src/components/generate/generate-page-client.tsx` 当前前端仅轮询总状态，未展示轮次、阶段文案、阶段产物。

Constraints
- 需要兼容当前 brownfield 架构：Next.js App Router + Prisma + job polling。
- 现有最终 Article schema 仍要求完整字段，最终落库时仍需组装成 `Article`。
- 用户要求前端在四轮执行期间实时更新，而不是只在完成后给最终结果。

Unknowns / open questions
- “实时更新”需要展示到什么粒度：仅阶段标题与状态，还是每轮的实际内容摘要/全文预览也要展示。
- 单词本中的陌生词如何接入第 1 轮：是强约束必须引用，还是弱引导优先使用。
- 若某一轮失败，是否允许从失败轮重试，而不是整单重跑。
- 四轮的中间结果是否需要持久化到数据库，还是短期只需要 job 轮询期间可见。

Decision-boundary unknowns
- 可以由 OMX 自行决定的数据落盘形态边界尚未确认：数据库迁移、JSON 字段扩展、还是临时状态持久化。
- 可以由 OMX 自行决定的前端展示深度尚未确认：轻量进度卡片 vs 完整阶段结果面板。

Likely codebase touchpoints
- `src/features/generation/article-generator.ts`
- `src/features/generation/prompt-output-schema.ts`
- `src/features/generation/load-prompt.ts`
- `src/features/generation/generation-job-service.ts`
- `src/app/api/generate/route.ts`
- `src/app/api/generate/[jobId]/route.ts`
- `src/components/generate/generate-page-client.tsx`
- `prisma/schema.prisma`
