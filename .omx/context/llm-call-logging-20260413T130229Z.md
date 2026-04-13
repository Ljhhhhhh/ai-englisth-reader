# Context Snapshot

- task statement: 设计一套 LLM 调用日志功能，让开发环境下的文章生成与单词/短语解析调用过程对开发者清晰可见。
- desired outcome: 产出一个执行前可用的需求规格，明确日志目标、展示方式、记录粒度、敏感信息边界，以及允许系统自行决策的范围。
- stated solution: 增加一套面向开发者的 LLM 调用日志能力。
- probable intent hypothesis: 当前项目已有多条 LLM 调用链，但缺少统一观测点，开发者难以定位 prompt、入参、耗时、输出与失败原因，影响调试和迭代 prompt。
- known facts/evidence: `src/features/generation/article-generator.ts` 通过 `ChatOpenAI(...).withStructuredOutput(...).invoke(...)` 生成文章；`src/features/reader/reader-explain-service.ts` 通过 `ChatOpenAI(...).withStructuredOutput(...).invoke(...)` 做单词/短语讲解；环境变量集中在 `src/lib/env.ts`，已有 `LLM_API_KEY`、`LLM_BASE_URL`、`LLM_MODEL`；当前代码中未发现统一的 LLM 日志/追踪封装。
- constraints: 当前请求处于 deep-interview 模式；此阶段不直接实现；需要优先澄清 intent、scope、non-goals、decision boundaries；大概率应避免泄露完整密钥与不必要的敏感正文。
- unknowns/open questions: 这是仅限开发环境的调试可见性，还是也要覆盖测试/生产；日志是写控制台、数据库、页面面板还是文件；是否要存全量 prompt/response；是否需要按调用类型筛选；失败与重试是否也必须可见。
- decision-boundary unknowns: 是否允许系统决定默认日志落点与脱敏策略；是否允许系统只先覆盖文章生成与 reader explain 两条链路；是否允许先做开发环境可见性、不做长期审计存档。
- likely codebase touchpoints: `src/features/generation/article-generator.ts`, `src/features/reader/reader-explain-service.ts`, 可能新增统一 LLM 客户端/包装层，开发页 `src/components/generate/generate-page-client.tsx`，以及 reader explain 相关 API route。
