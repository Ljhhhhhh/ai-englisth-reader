Metadata

- Mode: ralplan consensus
- Source spec: `/Users/pipilu/Documents/MaDun/ai-english-read/.omx/specs/deep-interview-reader-flow-simplification.md`
- Status: approved

RALPLAN-DR

Principles

1. 先锁新运行时语义，再改内容契约，避免先改 JSON 后返工 reader 语义。
2. 一次性迁移现有文章到新 schema，不保留长期双轨兼容。
3. `review`、`paragraphId`、上一段/下一段、全文译文承接必须彻底退出主路径。
4. 导读、点词/划词讲解、保存单词能力在新正文模式下必须保持可用。
5. 先把必须保留的旧能力锁成绿测试，再做大删改；目标态测试按步骤转绿。

Decision Drivers

1. [article-body.tsx](/Users/pipilu/Documents/MaDun/ai-english-read/src/components/reader/article-body.tsx) 当前把点词能力绑定到 active paragraph，正文交互重构是最高风险点。
2. [reader-shell.tsx](/Users/pipilu/Documents/MaDun/ai-english-read/src/components/reader/reader-shell.tsx)、[stage-machine.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/features/reader/stage-machine.ts)、[progress-service.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/features/reader/progress-service.ts) 当前把完成态和续读排序绑定到 `review + paragraphId`。
3. [page.tsx](/Users/pipilu/Documents/MaDun/ai-english-read/src/app/reader/[slug]/page.tsx) 现有 `chinese_translation` 入口校验必须拆掉，否则删复盘后 reader 无法打开。

Options

- Option A: 一次性升级 schema + 迁移内容，并同步重定义 reader 语义与完成动作。
  - Pros: 长期实现最简单；view model 清晰；不会背双轨技术债。
  - Cons: 改动面广，需要同步更新内容、reader、首页、测试。
- Option B: 隐藏旧 UI，但保留 `review` / `paragraphId` 等底层语义。
  - Pros: 短期回归风险低。
  - Cons: 与需求不一致，会保留 paragraph/review 幽灵语义，后续还要再做第二轮清理。

Decision

- 选择 Option A。

Concrete product decisions

- `title` 继续表示英文主标题。
- 新增 `chinese_title`，供首页与正文辅助标题使用。
- 新增 `list_summary_zh`，用于首页卡片的 100 字内中文概要。
- 新增 `paragraphs[].translation`，供逐段译文开关使用。
- 本次新增正文底部轻量动作 `完成本篇阅读`。
  - 它不是新阶段，不进入复盘。
  - 点击后把文章标记为 `completed`。
  - 首页继续阅读只展示 `in-progress` 文章。
  - 重新进入文章时仍从顶部开始。
- Reader page validation 分两段迁移：
  - 先移除对 `chinese_translation` 的硬依赖。
  - schema/content 迁移完成后，再启用新字段完整性校验。

Implementation plan

0. 建立真实护栏测试
- 先保持为绿的 characterization/regression tests:
  - `tests/e2e/reader-flow.spec.ts`: 导读进入正文、点词、划词、生词保存主链路
  - `src/features/reader/progress-service.test.ts`: 现有 recent progress 排序与存储
  - `src/components/home/continue-reading.test.tsx`: 现有最近未完成文章展示
- 可先为红的 target-state tests:
  - `src/features/reader/stage-machine.test.ts`: 只有 `intro | read`
  - `src/components/reader/article-body.test.tsx`: 全文任意段可点词、无上一段/下一段/复盘入口、逐段译文开关
  - `src/components/home/continue-reading.test.tsx`: 已完成文章不出现在继续阅读

1. 重定义 reader 语义最小闭环
- `ReaderStage` 收缩为 `intro | read`
- 去掉 `chinese_translation` page-level 入口依赖，只保留 `language_evolution` 合法性校验
- progress 支持 `in-progress/completed`
- `continue-reading` 仅展示 `in-progress`
- 验收:
  - reader 可在无全文译文前提下打开
  - `stage-machine.test.ts` 新语义转绿
  - `progress-service.test.ts` 和 `continue-reading.test.tsx` 新过滤/排序语义转绿

2. 独立重构正文交互模型，解除 active paragraph 依赖
- 全文任意段可点词
- 划词仍限制同句相邻词
- 移动端长按保持
- 去掉 active paragraph 视觉主线及相关文案
- 验收:
  - 解释能力 regression tests 仍绿
  - 全文任意段点词相关 target-state tests 转绿

3. 移除段落推进和 review 入口，并加入显式完成动作
- 删除上一段、下一段、进入复盘按钮和当前位置段落文案
- 在正文底部加入 `完成本篇阅读`
- 验收:
  - 无上一段/下一段/复盘入口测试转绿
  - 完成按钮测试转绿
  - `reader-flow.spec.ts` / `mobile-reader.spec.ts` 新路径转绿

4. 升级 schema、生成链路、内容迁移与新完整性校验
- 更新:
  - [article-schema.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/lib/content/article-schema.ts)
  - [prompt-output-schema.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/features/generation/prompt-output-schema.ts)
  - [article-generator.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/features/generation/article-generator.ts)
  - 必要时 [load-prompt.ts](/Users/pipilu/Documents/MaDun/ai-english-read/src/features/generation/load-prompt.ts)
- 迁移 `content/articles/*.json`
- 迁移完成后，在 [page.tsx](/Users/pipilu/Documents/MaDun/ai-english-read/src/app/reader/[slug]/page.tsx) 启用对 `chinese_title` / `list_summary_zh` / `paragraphs[].translation` 的完整性校验
- 验收:
  - 全部文章通过 schema 校验
  - reader 新完整性校验生效

5. 接入逐段译文开关
- 基于 `paragraphs[].translation` 为每段增加独立展开状态
- 验收:
  - 逐段译文开关测试与相关 E2E 转绿

6. 重塑首页与导航 view model
- 首页卡片只展示中文标题 + 中文概要
- 继续阅读卡片显示中文标题，不显示段落位置，只显示文章级状态
- 正文页英文标题主展示、中文标题辅助
- 上一篇/下一篇导航显示中文标题
- 验收:
  - `tests/e2e/home.spec.ts` 与相关单测转绿
  - 标题语义一致

7. 清理 review 残留、旧文案与旧事件假设
- 移除 `review-panel` 主路径使用和 review 文案
- `article_completed` 仅绑定新的显式完成动作
- 删除不再使用的组件/状态/测试断言
- 验收:
  - 搜索审计结果符合预期
  - 事件语义与代码一致

8. 跑完整回归验证
- `pnpm lint`
- `pnpm exec tsc --noEmit`
- `pnpm test -- src/features/reader/stage-machine.test.ts src/features/reader/progress-service.test.ts src/components/reader/article-body.test.tsx src/components/home/continue-reading.test.tsx src/features/articles/article-service.test.ts`
- `pnpm test:e2e tests/e2e/home.spec.ts tests/e2e/reader-flow.spec.ts tests/e2e/mobile-reader.spec.ts`
- `rg -n "\\breview\\b|paragraphId|currentParagraph|continueToReview|ReviewPanel|StageNav|ProgressBar|article_completed" src tests`

ADR

Decision

- 用“运行时语义先行 + 显式完成动作替代 review + 一次性 schema/content 迁移”的路径实施。

Drivers

- 风险核心在 reader 交互、续读与完成态。
- 用户要求删除旧阶段，但保留导读、查词/划词讲解、保存单词。

Alternatives considered

- 隐藏 UI 保留旧语义。
- 取消完成态，只保留最近阅读。

Why chosen

- 既保留继续阅读能力，又不引入 `review` 或段落推进幽灵语义。

Consequences

- 需要新增轻量完成动作，并重写 progress / analytics 语义。
- 已完成文章退出继续阅读卡片。

Follow-ups

- 如果后续还要进一步简化，可单独评估是否连 `完成本篇阅读` 也删除，改成纯最近阅读模式。

Available agent types

- `executor`: 主实现
- `test-engineer`: 测试重写与验证策略
- `architect`: 风险审查与中途复核
- `verifier`: 最终证据确认
- `code-reviewer`: 实现后复审

Staffing guidance

- `ralph` 路径:
  - Lane 1: `executor` 高强度执行主改造
  - Lane 2: 同一 owner 顺序处理测试与验证
  - 适合本次，因为核心风险高度耦合在 reader 状态与交互
- `team` 路径:
  - Lane 1: `executor` 负责 reader/runtime (`reader-shell`, `article-body`, `stage-machine`, `progress-service`, `page.tsx`)
  - Lane 2: `executor` 负责 content/generation/home (`article-schema`, generator, content JSON, article-service, home components`)
  - Lane 3: `test-engineer` 负责单测/E2E 改写与验证命令整合
  - 适合在明确 write scope 后并行推进

Reasoning guidance

- runtime / reader lane: `high`
- schema / generation lane: `medium`
- tests / verification lane: `medium`
- final verification / review lane: `high`

Team verification path

1. 先验证 characterization tests 仍绿
2. 每完成一个实施步骤，就转绿对应 target-state tests
3. 合并前跑完整 lint / typecheck / targeted unit / targeted e2e
4. 用 `rg` 审计残留旧概念，但把 `article_completed` 作为审计项而非零结果要求
