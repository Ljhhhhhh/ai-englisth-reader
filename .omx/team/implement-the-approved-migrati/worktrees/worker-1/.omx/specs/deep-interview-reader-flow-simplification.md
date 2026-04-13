Metadata

- Profile: standard
- Rounds: 5
- Final ambiguity: 0.19
- Threshold: 0.20
- Context type: brownfield
- Context snapshot: `/Users/pipilu/Documents/MaDun/ai-english-read/.omx/context/reader-flow-simplification-20260410T101819Z.md`
- Transcript: `/Users/pipilu/Documents/MaDun/ai-english-read/.omx/interviews/reader-flow-simplification-20260410T101819Z.md`

Clarity breakdown

| Dimension | Score | Notes |
| --- | --- | --- |
| Intent | 0.90 | 目标是把阅读体验从“分段推进 + 复盘收尾”简化成更连续、更轻的正文阅读。 |
| Outcome | 0.86 | 首页中文标题 + 中文摘要；正文英文主标题 + 中文辅助标题；段内译文按需展开。 |
| Scope | 0.92 | 移除段落记录、上一段/下一段、复盘阶段与对应承接内容。 |
| Constraints | 0.80 | 保留导读、点词/划词讲解、保存单词；不新增其他学习流程。 |
| Success Criteria | 0.78 | 需要用 UI、schema、进度语义与测试一起证明新阅读流成立。 |
| Context | 0.91 | 关键代码路径已确认：schema、生成链路、首页卡片、reader shell、stage machine、progress、tests。 |

Intent

- 降低阅读流程的控制感和阶段感，让用户更像在读一篇完整文章，而不是管理段落和收尾复盘。
- 在进入阅读前，列表就给出更完整的中文理解入口，减少用户开篇前的不确定感。

Desired outcome

- 首页文章卡片只展示中文标题和 100 字以内中文概要。
- 正文页以英文标题为主，中文标题作为辅助信息展示。
- 正文不再以“当前段 / 上一段 / 下一段”推进，而是直接阅读整篇文章。
- 每个段落下方都支持单独展开/收起该段译文。
- 不再存在复盘阶段，也不再有复盘页承接全文译文和本篇已保存单词。

In scope

- 扩展文章内容 schema 与生成结果，新增：
  - 英文标题字段与中文标题字段的角色区分
  - 列表展示用的中文概要字段，长度控制在 100 字以内
  - 段落级中文译文数据，以支持逐段开关展示
- 调整首页卡片展示逻辑，只显示中文标题和中文概要
- 调整正文头部展示逻辑，英文标题主展示，中文标题辅助展示
- 重构正文阅读组件，移除段落推进控件与“当前段”主线表达
- 增加逐段译文开关
- 调整阅读进度模型：不再保存 paragraphId，重新进入正文时从顶部开始
- 移除 review stage、review panel、相关文案、相关测试与相关验收路径

Out of scope / Non-goals

- 不改导读阶段
- 不改点词讲解、划词讲解、移动端长按讲解
- 不改保存单词能力
- 不新增新的文章目录、折叠导航、阅读模式或学习阶段
- 不把本篇已保存单词搬回正文页单独展示
- 不保留复盘页的替代页面

Decision boundaries

- OMX 可以自行决定具体 schema 命名、旧 JSON 迁移方式、组件拆分方式、文案细节、测试覆盖重写方式
- OMX 可以删除与复盘阶段、段落推进、段落恢复直接相关的组件、状态、文案和测试
- OMX 不应擅自扩展到导读重做、词汇功能重做、首页信息架构大改

Constraints

- 现有代码是 brownfield：`reader-shell`、`stage-machine`、`progress-service`、E2E 用例都深度依赖旧流转
- 旧内容文件当前没有中文标题、列表中文概要、段落级译文字段，需要迁移或兼容
- 不能引入这次需求以外的新学习路径

Acceptance criteria

1. 首页每张文章卡片只显示中文标题与 100 字以内中文概要，不再显示英文主标题作为主信息。
2. 文章详情阅读页显示英文标题为主标题，并显示对应中文标题作为辅助说明。
3. 正文页不存在“上一段”“下一段”“第 N 段 / 共 M 段”“读完，进入复盘”等交互或文案。
4. 正文页每个段落都可独立展开/收起该段中文译文，且互不影响。
5. 阅读进度不再保存段落级位置；用户重新进入正文时从文章顶部开始。
6. 阶段机不再包含 `review` 阶段，复盘页及其全文译文/本篇保存词承接逻辑被移除。
7. 生词仍可在正文中保存，并继续在生词本总页查看。
8. 导读阶段与现有点词/划词讲解能力保持可用。
9. 相关单测与 E2E 测试更新后通过，旧的段落推进/复盘断言被替换为新阅读流断言。

Assumptions exposed + resolutions

- 假设 1：移除段落记录可能只是去掉 UI，不一定去掉恢复逻辑。
  - 结论：不是。段落级恢复也一并移除。
- 假设 2：移除复盘后，译文或已保存单词可能需要新的承接页。
  - 结论：不需要。译文回到正文按段展开；已保存单词只在生词本总页查看。
- 假设 3：这次可能顺带改导读或解释功能。
  - 结论：不改，这些是明确非目标。

Pressure-pass findings

- 对“移除段落记录”的深入追问改变了实现边界：不只是删除按钮，还要改进度存储模型和恢复逻辑。

Brownfield evidence vs inference

- Evidence:
  - `src/features/reader/stage-machine.ts` 当前为 `intro/read/review`
  - `src/components/reader/reader-shell.tsx` 当前持有 `currentParagraphId` 并保存到 progress
  - `src/components/reader/article-body.tsx` 当前依赖段落激活态与前后段导航
  - `src/lib/content/article-schema.ts` 还没有中文标题、列表摘要、段落级译文字段
- Inference:
  - 需要同步迁移 `content/articles/*.json` 与生成链路 schema
  - 需要重写相当一部分 reader E2E 断言

Technical context findings

- 文章列表由 `src/features/articles/article-service.ts -> loadAllArticles()` 直接输出内容，适合在 schema 或 service 层明确“列表视图模型”
- 文案集中在 `src/lib/ui-copy.ts`，可一次性去掉旧段落推进/复盘文案
- `review-panel.tsx` 很可能可以整体删除或脱离主路径

Recommended handoff

- 首选：`$ralplan`
- 建议输入：`/Users/pipilu/Documents/MaDun/ai-english-read/.omx/specs/deep-interview-reader-flow-simplification.md`
- 目的：锁定 schema 迁移、兼容策略、测试重写范围与执行顺序，再进入实现
