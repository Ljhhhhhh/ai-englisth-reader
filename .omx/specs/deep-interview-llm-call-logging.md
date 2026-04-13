# Deep Interview Spec: LLM Call Logging

## Metadata

- profile: `standard`
- rounds: `8`
- context type: `brownfield`
- final ambiguity: `0.199`
- threshold: `0.20`
- context snapshot: [.omx/context/llm-call-logging-20260413T130229Z.md](/Users/pipilu/Documents/MaDun/lexora/.omx/context/llm-call-logging-20260413T130229Z.md)
- transcript: [.omx/interviews/llm-call-logging-20260413T130229Z.md](/Users/pipilu/Documents/MaDun/lexora/.omx/interviews/llm-call-logging-20260413T130229Z.md)

## Clarity Breakdown

| Dimension | Score |
| --- | --- |
| Intent | 0.62 |
| Outcome | 0.92 |
| Scope | 0.90 |
| Constraints | 0.75 |
| Success | 0.88 |
| Context | 0.82 |

## Intent

当前项目已有文章生成、单词/短语解析两条 LLM 调用链，但开发时缺少统一、可见、可快速定位问题的日志视图。用户要解决的是开发调试阻塞，而不是运营审计或生产归档。核心诉求是：当调用失败或结果异常时，开发者无需翻源码或临时加打印，也能快速判断是入参上下文问题、模型输出问题，还是结构化解析问题。

## Desired Outcome

在开发环境中，为现有两条 LLM 调用链提供一套“开发者即时可见”的调用日志能力。主展示面为浏览器页面内的开发者面板。第一版只需展示最近一次调用详情，重点让开发者快速看到：

- 入参摘要
- 原始输出
- 结构化解析结果
- 错误信息

## In Scope

- 覆盖当前两条已存在的 LLM 调用路径
- 文章生成 `generate`
- 阅读器中的单词/短语解析 `word` / `phrase`
- 仅在开发环境默认开启
- 主可见面为浏览器页面内的开发者面板
- 第一版只展示最近一次调用详情
- 日志内容以失败排查为主，而不是历史分析
- `input summary` 第一版最小字段集：
- 调用类型
- 触发入口
- `word` / `phrase` / `generate`
- `sentenceId`（若适用）

## Out-of-Scope / Non-goals

- 不记录或展示完整 `system prompt`
- 不记录或展示完整 `user prompt`
- 不记录或展示 `API key / headers`
- 不记录或展示文章全文或用户上传原文
- 不记录或展示用户身份信息
- 不做数据库长期存档
- 不做调用历史聚合报表
- 第一版不要求多次调用历史列表

## Decision Boundaries

以下决策 OMX 可直接默认拍板，无需再次确认：

- 只覆盖当前两条链路：文章生成、单词/短语解析
- 只在开发环境默认开启
- 日志先做“开发者即时可见”，不做数据库长期存档

## Constraints

- 当前阶段是需求规格产出，不直接实现
- 必须保留“调试足够可见”与“避免敏感内容暴露”之间的边界
- 设计应优先满足浏览器页面内的可见性，而非 terminal-first
- 第一版应保持范围收敛，只做最近一次调用详情
- 不应要求开发者阅读源码才能理解失败原因

## Testable Acceptance Criteria

- 在本地开发环境触发一次文章生成调用后，开发者可在页面内看到最近一次 `generate` 调用详情
- 在本地开发环境触发一次单词或短语解析后，开发者可在页面内看到最近一次 `word` 或 `phrase` 调用详情
- 当调用失败时，开发者能在 10 秒内看清：
- 入参摘要
- 原始输出
- 结构化解析结果
- 错误原因
- 页面内展示内容不包含完整 system prompt、完整 user prompt、完整原文、API key / headers、用户身份信息
- 第一版界面默认只显示最近一次调用详情，而非调用列表

## Assumptions Exposed + Resolutions

- assumption: 这套日志可能是为了后续审计或运营分析
- resolution: 不是，目标是开发调试可见性
- assumption: 只要日志足够多，开发者就能排查问题
- resolution: 不需要全量内容，用户更关注少量高价值字段和快速判断
- assumption: terminal 日志就足够
- resolution: 不够，主可见面必须是浏览器页面内的开发者面板
- assumption: 第一版需要历史列表或长期存档
- resolution: 不需要，第一版只看最近一次调用详情

## Pressure-pass Findings

- revisited answer: “需要入参摘要”
- deeper challenge: 既然不能显示完整 prompt 和全文，那哪些摘要字段仍然必需
- clarified result:
- 调用类型
- 触发入口
- `word` / `phrase` / `generate`
- `sentenceId`

这一步把方案从“全量请求回放”收敛成“受控、脱敏、面向定位的摘要视图”。

## Brownfield Evidence vs Inference

Evidence:
- [article-generator.ts](/Users/pipilu/Documents/MaDun/lexora/src/features/generation/article-generator.ts) 存在文章生成 LLM 调用
- [reader-explain-service.ts](/Users/pipilu/Documents/MaDun/lexora/src/features/reader/reader-explain-service.ts) 存在单词/短语解析 LLM 调用
- [env.ts](/Users/pipilu/Documents/MaDun/lexora/src/lib/env.ts) 已统一管理 LLM 基础环境变量
- 当前仓库未见统一的 LLM 调用日志包装层

Inference:
- 若主展示面是页面开发者面板，则设计大概率需要把服务端调用事件桥接到客户端可读的开发态状态源
- 由于第一版只展示最近一次调用详情，方案不必先引入持久化历史存储

## Technical Context Findings

- 文章生成链路当前直接在服务层调用 `ChatOpenAI(...).withStructuredOutput(...).invoke(...)`
- 阅读器解析链路当前直接在服务层调用 `ChatOpenAI(...).withStructuredOutput(...).invoke(...)`
- 两条链路都适合被统一的 LLM 调用包装层或统一 debug event 发射点接管
- 现有开发页面中，生成页已存在明显的用户交互界面，适合作为面板落点候选

## Condensed Transcript

1. 用户要解决的不是“有没有日志”，而是“调试时能否马上定位失败原因”
2. 最关键信息是：入参摘要、原始输出、结构化解析结果、错误信息
3. 明确禁止暴露：完整 prompt、完整原文、API key / headers、用户身份信息
4. 允许系统默认：只覆盖两条现有链路、仅开发环境开启、无长期存档
5. 入参摘要必须是最小集合：调用类型、触发入口、`word|phrase|generate`、`sentenceId`
6. 成功标准：失败时 10 秒内完成定位
7. 主展示面：浏览器页面内开发者面板
8. 第一版范围：只显示最近一次调用详情

## Recommended Handoff

推荐下一步使用 `$ralplan`，把这份规格转成可执行的设计与测试计划，重点收敛：

- 服务端 LLM 调用如何统一打点
- 页面开发者面板如何拿到最近一次调用详情
- 哪些字段需要脱敏摘要，哪些字段可以原样展示
- 如何验证“10 秒内可定位失败原因”的验收标准
