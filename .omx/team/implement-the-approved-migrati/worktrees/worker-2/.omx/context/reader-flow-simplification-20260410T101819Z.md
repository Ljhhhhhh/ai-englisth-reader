Task statement

- 调整文章生成与阅读链路：新增中文标题与列表摘要，移除段落记录/上一段/下一段，正文支持段落译文开关，移除复盘阶段。

Desired outcome

- 形成可执行需求规格，明确数据结构、阅读流变化、列表展示口径和哪些旧能力必须彻底下线。

Stated solution

- 生成文章时新增中文文章标题、100 字以内概要。
- 移除段落记录功能。
- 移除上一段、下一段功能。
- 文章段落下增加译文展示，可手动开关。
- 移除复盘阶段。

Probable intent hypothesis

- 把阅读体验从“分段推进 + 复盘收尾”改成“更顺滑的一次性正文阅读”，同时让首页列表信息更完整，降低进入阅读前后的认知负担。

Known facts / evidence

- `src/lib/content/article-schema.ts` 当前只有 `title`, `feynman_summary`, `chinese_translation`, `paragraphs`，没有中文标题字段，也没有列表专用摘要字段。
- `src/features/articles/article-service.ts` 的 `listArticles()` 直接透传所有文章内容给首页。
- `src/components/reader/reader-shell.tsx` 当前维护 `currentStage` 和 `currentParagraphId`，并将进度保存到 `progress-service`。
- `src/features/reader/stage-machine.ts` 当前阶段为 `intro -> read -> review`。
- `src/components/reader/article-body.tsx` 当前渲染段落卡片，依赖 `activeParagraphId / canGoPrevious / canGoNext / onPreviousParagraph / onNextParagraph / onContinueToReview`。
- `src/lib/ui-copy.ts` 明确包含 `上一段`、`下一段`、`读完，进入复盘`、`复盘` 文案。
- 现有 E2E/单测大量断言 `下一段`、`上一段`、`读完，进入复盘`、`本机阅读复盘`。

Constraints

- 这是 brownfield 变更，需兼容现有文章生成链路与现有内容文件迁移。
- 需求尚未明确：译文开关是全局开关还是逐段开关；导读阶段是否保留；“移除段落记录”是否也意味着不再保存正文阅读位置。

Unknowns / open questions

- 中文标题是替换现有 `title` 的显示角色，还是新增 `english_title + chinese_title` 双字段？
- 列表摘要是生成时落库/落 JSON，还是运行时从现有字段截断生成？
- 移除段落记录后，首页“继续阅读”是否还需要保留文章级续读能力？
- 译文开关的交互粒度与默认状态是什么？
- 移除复盘后，全文译文与已保存单词的承接位置放在哪里？

Decision-boundary unknowns

- OMX 是否可以自行调整内容 schema、旧数据迁移方式、首页卡片布局和测试覆盖范围？
- OMX 是否可以顺带删除与复盘阶段相关的文案、组件、测试、事件语义？

Likely codebase touchpoints

- `src/lib/content/article-schema.ts`
- `src/features/generation/prompt-output-schema.ts`
- `src/features/generation/article-generator.ts`
- `src/features/articles/article-service.ts`
- `src/components/home/article-card.tsx`
- `src/components/reader/reader-shell.tsx`
- `src/components/reader/article-body.tsx`
- `src/components/reader/review-panel.tsx`
- `src/features/reader/stage-machine.ts`
- `src/features/reader/progress-service.ts`
- `src/lib/ui-copy.ts`
- `content/articles/*.json`
- `tests/e2e/*.spec.ts`
- `src/components/reader/*.test.tsx`
