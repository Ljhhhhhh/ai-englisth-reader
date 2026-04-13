# 交互式英语阅读 MVP 实施计划

> **针对代理工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 来任务式实施此计划。步骤使用复选框（`- [ ]`）语法进行跟踪。

**目标：** 构建一个响应式 Web MVP，让用户输入文章、完成引导阅读流程、查询单词、保存单词、完成理解题，并能在同一设备上稍后继续。

**架构：** 使用单一响应式 Web 应用，使桌面和移动端共享相同的路由、数据模型和事件系统。在一个后端存储精选文章内容、基于匿名设备的阅读进度、保存单词、测验结果和学习事件，以便 MVP 能够在无需用户账户的情况下验证完整的阅读循环。

**技术栈：** Next.js 15 + TypeScript + Tailwind CSS + Radix UI + Prisma + SQLite + Zod + Vitest + React Testing Library + Playwright

---

## 范围决策

PRD 涵盖四个交付阶段和几个松耦合子系统。此实施计划仅针对 **Phase 1 / P0 MVP** 提供构建级别的详细细节，因为这是能够验证产品的最小切片。Phase 2-4 在末尾作为后续计划排序。

## 实施前锁定的产品决策

- 首先构建 **响应式 Web 应用**，而不是单独的桌面/移动代码库。
- MVP 中 **不添加登录**。使用匿名 `deviceId` Cookie/本地存储令牌加上后端记录来持久化状态。
- MVP 中将文章内容 **编辑并版本化存储在仓库中**。暂不构建 CMS。
- 将完整翻译置于 **测验提交后的审查阶段** 之后，以减少跳过答案的行为。
- 将“完成文章”定义为：到达审查阶段 **并且** 提交了测验，符合 PRD 验证规则。
- MVP 中仅支持 **同一设备** 上的“继续阅读”。跨设备同步推迟到后续阶段引入账户。

## 提议的文件结构

### 应用壳

- 创建：`package.json`
- 创建：`next-env.d.ts`
- 创建：`next.config.ts`
- 创建：`tsconfig.json`
- 创建：`postcss.config.mjs`
- 创建：`tailwind.config.ts`
- 创建：`vitest.config.ts`
- 创建：`playwright.config.ts`
- 创建：`src/app/layout.tsx`
- 创建：`src/app/page.tsx`
- 创建：`src/app/page.test.tsx`
- 创建：`src/app/globals.css`

### 领域和数据

- 创建：`prisma/schema.prisma`
- 创建：`prisma/seed.ts`
- 创建：`src/lib/db.ts`
- 创建：`src/lib/env.ts`
- 创建：`src/lib/device-id.ts`
- 创建：`src/lib/content/article-schema.ts`
- 创建：`src/lib/content/load-article.ts`
- 创建：`content/articles/welcome-to-deep-reading.json`
- 创建：`content/articles/second-sample-article.json`

### 功能模块

- 创建：`src/features/articles/article-service.ts`
- 创建：`src/features/articles/article-service.test.ts`
- 创建：`src/features/reader/stage-machine.ts`
- 创建：`src/features/reader/stage-machine.test.ts`
- 创建：`src/features/reader/progress-service.ts`
- 创建：`src/features/reader/progress-service.test.ts`
- 创建：`src/features/reader/word-lookup-service.ts`
- 创建：`src/features/reader/word-lookup-service.test.ts`
- 创建：`src/features/quiz/quiz-service.ts`
- 创建：`src/features/quiz/quiz-service.test.ts`
- 创建：`src/features/words/saved-word-service.ts`
- 创建：`src/features/words/saved-word-service.test.ts`
- 创建：`src/features/analytics/event-service.ts`
- 创建：`src/features/analytics/event-service.test.ts`

### 路由和 UI

- 创建：`src/app/reader/[slug]/page.tsx`
- 创建：`src/app/words/page.tsx`
- 创建：`src/app/api/lookup/route.ts`
- 创建：`src/app/api/quiz/submit/route.ts`
- 创建：`src/app/api/words/route.ts`
- 创建：`src/app/api/events/route.ts`
- 创建：`src/components/home/article-card.tsx`
- 创建：`src/components/home/continue-reading.tsx`
- 创建：`src/components/reader/reader-shell.tsx`
- 创建：`src/components/reader/stage-nav.tsx`
- 创建：`src/components/reader/intro-panel.tsx`
- 创建：`src/components/reader/article-body.tsx`
- 创建：`src/components/reader/sentence-note.tsx`
- 创建：`src/components/reader/word-panel-desktop.tsx`
- 创建：`src/components/reader/word-panel-mobile.tsx`
- 创建：`src/components/reader/quiz-panel.tsx`
- 创建：`src/components/reader/review-panel.tsx`
- 创建：`src/components/reader/progress-bar.tsx`
- 创建：`src/components/words/word-list.tsx`
- 创建：`src/components/system/empty-state.tsx`
- 创建：`src/components/system/error-state.tsx`

### 端到端和测试夹具

- 创建：`tests/e2e/home.spec.ts`
- 创建：`tests/e2e/reader-flow.spec.ts`
- 创建：`tests/e2e/mobile-reader.spec.ts`
- 创建：`tests/fixtures/device.ts`

## 交付顺序

1. 基础和工具链
2. 内容模型和种子数据
3. 首页和文章入口
4. 阅读器阶段壳和进度持久化
5. 单词查询和单词保存
6. 测验和审查解锁
7. 事件跟踪和状态强化
8. 响应式 QA 和发布检查清单

## 当前进度（2026-04-07）

- 状态：Phase 1 MVP 的代码范围已完成，任务 1-8 已落地，任务 9 的文档产物也已补齐。
- 当前实现：首页、四阶段阅读器、同设备 localStorage 进度恢复、单词查询与保存、生词页、测验与回顾解锁、学习事件、空/错状态、桌面/移动端适配均已可用。
- 数据层：Prisma 已切换为 SQLite，默认 `DATABASE_URL` 为 `file:./dev.db`，当前仓库不再保留 PostgreSQL 兼容要求。
- 当前验证：`pnpm lint`、`pnpm test`、`pnpm build`、`pnpm test:e2e`、`pnpm prisma validate`、`pnpm db:push` 已于 2026-04-07 通过；其中 E2E 结果为 28 passed、2 skipped（按项目条件跳过）。
- 尚未关闭：`docs/testing/mvp-smoke-checklist.md` 的人工 smoke 流程仍建议按桌面和移动视口再执行一轮后，再正式宣布 MVP 试用就绪。

## 任务 1：引导应用并设置质量关卡

**文件：**

- 创建：`package.json`
- 创建：`next-env.d.ts`
- 创建：`next.config.ts`
- 创建：`tsconfig.json`
- 创建：`postcss.config.mjs`
- 创建：`tailwind.config.ts`
- 创建：`vitest.config.ts`
- 创建：`playwright.config.ts`
- 创建：`src/app/layout.tsx`
- 创建：`src/app/page.tsx`
- 创建：`src/app/page.test.tsx`
- 创建：`src/app/globals.css`

- [x] **步骤 1：初始化应用清单和核心依赖**

运行：`pnpm init`
运行：`pnpm add next@latest react@latest react-dom@latest`
运行：`pnpm add -D typescript @types/node @types/react @types/react-dom eslint eslint-config-next`
预期：仓库具有干净的 Next.js 就绪清单，而不覆盖现有的 PRD 文件

- [x] **步骤 2：添加运行时和测试依赖**

运行：`pnpm add @prisma/client @radix-ui/react-dialog vaul zod clsx tailwind-merge`
运行：`pnpm add -D prisma tsx vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom jsdom playwright tailwindcss postcss autoprefixer`
预期：依赖安装完成，且 `package.json` 包含应用 + 测试工具链

- [x] **步骤 3：为首页路由编写第一个失败的烟雾测试**

```tsx
import { render, screen } from '@testing-library/react';
import HomePage from '@/app/page';

it('shows the product promise on the homepage', () => {
  render(<HomePage />);
  expect(screen.getByText(/read one article deeply/i)).toBeInTheDocument();
});
```

- [x] **步骤 4：运行烟雾测试并验证其失败**

运行：`pnpm vitest run src/app/page.test.tsx`
预期：失败，因为页面组件或副本尚未存在

- [x] **步骤 5：实现最小应用壳**

```tsx
export default function HomePage() {
  return <main>Read one article deeply.</main>;
}
```

- [x] **步骤 6：运行单元测试并验证烟雾测试通过**

运行：`pnpm vitest run src/app/page.test.tsx`
预期：通过

- [x] **步骤 7：配置可重用脚本**

运行：`pnpm pkg set scripts.dev="next dev" scripts.build="next build" scripts.lint="eslint ." scripts.test="vitest run" scripts.test:watch="vitest" scripts.test:e2e="playwright test" scripts.db:push="prisma db push" scripts.db:seed="tsx prisma/seed.ts"`
预期：包脚本支持可重复的本地验证

- [x] **步骤 8：提交引导基线**

```bash
git init
git add .
git commit -m "chore: bootstrap interactive reading app"
```

## 任务 2：定义内容模式和持久化模型

**文件：**

- 创建：`prisma/schema.prisma`
- 创建：`prisma/seed.ts`
- 创建：`src/lib/db.ts`
- 创建：`src/lib/env.ts`
- 创建：`src/lib/device-id.ts`
- 创建：`src/lib/content/article-schema.ts`
- 创建：`src/lib/content/load-article.ts`
- 创建：`content/articles/welcome-to-deep-reading.json`
- 创建：`content/articles/second-sample-article.json`
- 测试：`src/features/articles/article-service.test.ts`

- [x] **步骤 1：为加载有效文章编写失败测试**

```ts
import { loadArticle } from '@/lib/content/load-article';

it('loads article content with intro, body, quiz, and review data', async () => {
  const article = await loadArticle('welcome-to-deep-reading');
  expect(article.slug).toBe('welcome-to-deep-reading');
  expect(article.vocabulary.length).toBeGreaterThanOrEqual(5);
  expect(article.quiz.length).toBeGreaterThanOrEqual(3);
});
```

- [x] **步骤 2：运行内容测试并验证其失败**

运行：`pnpm vitest run src/features/articles/article-service.test.ts`
预期：失败，因为加载器和内容模式尚未存在

- [x] **步骤 3：定义文章 JSON 模式**

```ts
export const articleSchema = z.object({
  slug: z.string(),
  title: z.string(),
  difficulty: z.enum(['A2', 'B1', 'B2']),
  estimatedMinutes: z.number().int().positive(),
  summary: z.string(),
  translation: z.string(),
  paragraphs: z.array(
    z.object({
      id: z.string(),
      sentences: z.array(
        z.object({
          id: z.string(),
          text: z.string(),
          notes: z.array(z.string()).default([]),
        }),
      ),
    }),
  ),
  vocabulary: z
    .array(
      z.object({
        lemma: z.string(),
        surface: z.string(),
        phonetic: z.string().optional(),
        meaning: z.string(),
        exampleSentenceId: z.string(),
      }),
    )
    .min(5)
    .max(8),
  grammarPoints: z
    .array(
      z.object({
        title: z.string(),
        explanation: z.string(),
        sourceSentenceId: z.string(),
      }),
    )
    .min(1)
    .max(3),
  difficultSentences: z
    .array(
      z.object({
        sentenceId: z.string(),
        breakdown: z.string(),
      }),
    )
    .min(1)
    .max(3),
  quiz: z
    .array(
      z.object({
        id: z.string(),
        question: z.string(),
        choices: z.array(z.string()).length(4),
        correctIndex: z.number().int().min(0).max(3),
        explanation: z.string(),
      }),
    )
    .min(3)
    .max(5),
});
```

- [x] **步骤 4：定义数据库表**

表：

- `Article`
- `ReadingProgress`
- `QuizAttempt`
- `SavedWord`
- `LearningEvent`

关键规则：所有学习者状态行必须包含 `deviceId`

- [x] **步骤 5：实现加载器和种子脚本**

运行：`pnpm prisma init --datasource-provider sqlite`
运行：`pnpm db:push`
运行：`pnpm db:seed`
预期：模式应用成功且样本文章数据种子化成功

- [x] **步骤 6：重新运行内容测试**

运行：`pnpm vitest run src/features/articles/article-service.test.ts`
预期：通过

- [x] **步骤 7：提交内容基础**

```bash
git add prisma src/lib content
git commit -m "feat: add article schema and persistence model"
```

## 任务 3：构建首页和入口点

**文件：**

- 修改：`src/app/page.tsx`
- 创建：`src/components/home/article-card.tsx`
- 创建：`src/components/home/continue-reading.tsx`
- 创建：`src/features/articles/article-service.ts`
- 测试：`tests/e2e/home.spec.ts`

- [x] **步骤 1：为文章发现编写失败的端到端测试**

```ts
import { test, expect } from '@playwright/test';

test('user can open an article from the homepage', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: /deep reading/i }),
  ).toBeVisible();
  await page
    .getByRole('link', { name: /start reading/i })
    .first()
    .click();
  await expect(page).toHaveURL(/\/reader\//);
});
```

- [x] **步骤 2：运行首页端到端测试并验证其失败**

运行：`pnpm playwright test tests/e2e/home.spec.ts`
预期：失败，因为缺少文章卡片和路由

- [x] **步骤 3：实现文章列表和继续阅读块**

首页要求：

- 显示推荐文章
- 显示难度和预计阅读时间
- 当当前设备存在进度记录时显示“继续阅读”
- 保持桌面和移动端首屏有用

- [x] **步骤 4：添加文章服务查询**

服务职责：

- 列出种子化文章
- 获取当前设备进行中的文章
- 仅在继续阅读块内将未完成文章排序到已完成文章之上

- [x] **步骤 5：重新运行端到端和单元覆盖**

运行：`pnpm playwright test tests/e2e/home.spec.ts`
运行：`pnpm vitest run src/features/articles/article-service.test.ts`
预期：通过

- [x] **步骤 6：提交首页入口流程**

```bash
git add src/app/page.tsx src/components/home src/features/articles tests/e2e/home.spec.ts
git commit -m "feat: add homepage article discovery"
```

## 任务 4：构建阅读器壳和进度持久化

**文件：**

- 创建：`src/app/reader/[slug]/page.tsx`
- 创建：`src/components/reader/reader-shell.tsx`
- 创建：`src/components/reader/stage-nav.tsx`
- 创建：`src/components/reader/progress-bar.tsx`
- 创建：`src/components/reader/intro-panel.tsx`
- 创建：`src/components/reader/article-body.tsx`
- 创建：`src/features/reader/stage-machine.ts`
- 创建：`src/features/reader/progress-service.ts`
- 测试：`src/features/reader/stage-machine.test.ts`
- 测试：`src/features/reader/progress-service.test.ts`
- 测试：`tests/e2e/reader-flow.spec.ts`

- [x] **步骤 1：为阶段规则和恢复行为编写失败测试**

```ts
it('marks an article complete only after quiz submission and review access', () => {
  expect(
    getCompletionState({
      currentStage: 'review',
      quizSubmitted: true,
    }),
  ).toBe('completed');
});

it('restores last visited stage and paragraph for the same device', async () => {
  const progress = await saveProgress({
    stage: 'read',
    paragraphId: 'p2',
    deviceId: 'dev-1',
  });
  const restored = await loadProgress('dev-1', 'welcome-to-deep-reading');
  expect(restored?.paragraphId).toBe('p2');
});
```

- [x] **步骤 2：运行失败测试**

运行：`pnpm vitest run src/features/reader/stage-machine.test.ts src/features/reader/progress-service.test.ts`
预期：失败，因为阅读器状态逻辑不存在

- [x] **步骤 3：实现阶段机**

阶段：

- `intro`
- `read`
- `quiz`
- `review`

规则：

- 用户可以前进/后退而不丢失状态
- 审查翻译在测验提交前保持折叠
- 完成事件每个文章/设备仅触发一次

- [x] **步骤 4：实现同设备本地进度持久化（localStorage）**

持久化：

- 当前阶段
- 最后可见段落
- 测验开始标志
- 测验提交标志
- 更新时间戳

说明：MVP 阶段使用同设备 localStorage（基于 `deviceId`）保存与恢复进度，不新增 `src/app/api/progress/route.ts`。

- [x] **步骤 5：构建响应式阅读器壳**

桌面：

- 粘性阶段导航
- 主要阅读列
- 非阻塞侧边栏用于支持内容

移动：

- 单列
- 粘性紧凑进度条
- 大型下一步 CTA

- [x] **步骤 6：添加恢复的全流程端到端测试**

场景：

- 打开文章
- 从 intro 移动到阅读
- 滚动到后续段落
- 重新加载页面
- 验证阶段和近似阅读位置被恢复

- [x] **步骤 7：运行测试**

运行：`pnpm vitest run src/features/reader/stage-machine.test.ts src/features/reader/progress-service.test.ts`
运行：`pnpm playwright test tests/e2e/reader-flow.spec.ts --grep "resume"`
预期：通过

- [x] **步骤 8：提交阅读器壳和持久化**

```bash
git add src/app/reader src/components/reader src/features/reader tests/e2e/reader-flow.spec.ts
git commit -m "feat: add reader shell and progress persistence"
```

## 任务 5：实现单词查询和保存单词流程

**文件：**

- 创建：`src/features/reader/word-lookup-service.ts`
- 创建：`src/features/words/saved-word-service.ts`
- 创建：`src/app/api/lookup/route.ts`
- 创建：`src/app/api/words/route.ts`
- 创建：`src/components/reader/word-panel-desktop.tsx`
- 创建：`src/components/reader/word-panel-mobile.tsx`
- 测试：`src/features/reader/word-lookup-service.test.ts`
- 测试：`src/features/words/saved-word-service.test.ts`
- 测试：`tests/e2e/reader-flow.spec.ts`
- 测试：`tests/e2e/mobile-reader.spec.ts`

- [x] **步骤 1：为查询稳定性和重复保存规则编写失败测试**

```ts
it('returns lemma, meaning, phonetic, and source sentence in one lookup', async () => {
  const result = await lookupWord({
    slug: 'welcome-to-deep-reading',
    surface: 'absorbed',
    sentenceId: 's3',
  });

  expect(result).toMatchObject({
    lemma: 'absorb',
    meaning: expect.any(String),
    sourceSentence: expect.stringContaining('absorbed'),
  });
});

it('does not create dirty duplicates when saving the same word twice in one article', async () => {
  await saveWord({
    deviceId: 'dev-1',
    articleSlug: 'welcome-to-deep-reading',
    lemma: 'absorb',
  });
  await saveWord({
    deviceId: 'dev-1',
    articleSlug: 'welcome-to-deep-reading',
    lemma: 'absorb',
  });
  expect(await countSavedWords('dev-1')).toBe(1);
});
```

- [x] **步骤 2：运行服务测试并验证其失败**

运行：`pnpm vitest run src/features/reader/word-lookup-service.test.ts src/features/words/saved-word-service.test.ts`
预期：失败

- [x] **步骤 3：针对文章内容实现查询服务**

查询响应必须包含：

- 表面形式
- 词干
- 音标
- 如果可用，词性
- 中文含义
- 源句子
- 当前保存状态

- [x] **步骤 4：实现设备范围的保存/取消保存行为**

规则：

- 相同词干 + 相同文章 + 相同设备 = 单一保存记录
- 保留源句子和文章标题
- 返回明确的成功反馈到 UI

- [x] **步骤 5：渲染桌面和移动查询界面**

桌面：

- 侧边抽屉或锚定面板
- 永不覆盖活动句子

移动：

- 底部抽屉
- 保存按钮的大型点击目标
- 关闭操作将用户返回相同阅读位置

- [x] **步骤 6：为桌面和移动保存流程添加浏览器测试**

场景：

- 点击/轻点单词
- 检查定义
- 保存它
- 关闭面板
- 确认阅读位置稳定

- [x] **步骤 7：运行所有相关测试**

运行：`pnpm vitest run src/features/reader/word-lookup-service.test.ts src/features/words/saved-word-service.test.ts`
运行：`pnpm playwright test tests/e2e/reader-flow.spec.ts --grep "save word"`
运行：`pnpm playwright test tests/e2e/mobile-reader.spec.ts`
预期：通过

- [x] **步骤 8：提交单词查询和保存流程**

```bash
git add src/features/reader/word-lookup-service.ts src/features/words src/app/api/lookup src/app/api/words src/components/reader tests/e2e
git commit -m "feat: add word lookup and save flow"
```

## 任务 6：实现语法笔记、难点句子、测验和审查

**文件：**

- 创建：`src/components/reader/sentence-note.tsx`
- 创建：`src/components/reader/quiz-panel.tsx`
- 创建：`src/components/reader/review-panel.tsx`
- 创建：`src/features/quiz/quiz-service.ts`
- 创建：`src/app/api/quiz/submit/route.ts`
- 测试：`src/features/quiz/quiz-service.test.ts`
- 测试：`tests/e2e/reader-flow.spec.ts`

- [x] **步骤 1：为测验提交和审查解锁编写失败测试**

```ts
it('returns explanations and unlocks translation after submission', async () => {
  const result = await submitQuiz({
    articleSlug: 'welcome-to-deep-reading',
    deviceId: 'dev-1',
    answers: [1, 2, 0],
  });

  expect(result.items.every((item) => item.explanation.length > 0)).toBe(true);
  expect(result.reviewUnlocked).toBe(true);
});
```

- [x] **步骤 2：运行测验测试并验证其失败**

运行：`pnpm vitest run src/features/quiz/quiz-service.test.ts`
预期：失败

- [x] **步骤 3：构建 intro 支持面板**

Intro 阶段必须显示：

- 标题
- 难度
- 预计分钟数
- 5-8 个关键词汇
- 1-3 个语法点
- 1-3 个难点句子预览

- [x] **步骤 4：实现测验评估和解释返回**

规则：

- 每篇文章至少 3 个问题
- 提交后立即显示正确性
- 存储分数、提交答案和提交时间
- 仅当审查可访问时发出完成事件

- [x] **步骤 5：实现审查阶段**

审查阶段必须显示：

- 一句文章摘要
- 完整翻译
- 来自本文的保存单词列表

防护：

- 翻译在测验提交成功完成前保持隐藏

- [x] **步骤 6：添加完整阅读循环的端到端测试**

场景：

- 进入文章
- 通过 intro 和阅读
- 提交测验
- 验证审查翻译出现
- 验证文章标记为完成

- [x] **步骤 7：运行测试**

运行：`pnpm vitest run src/features/quiz/quiz-service.test.ts`
运行：`pnpm playwright test tests/e2e/reader-flow.spec.ts --grep "full loop"`
预期：通过

- [x] **步骤 8：提交学习循环完成流程**

```bash
git add src/components/reader src/features/quiz src/app/api/quiz tests/e2e/reader-flow.spec.ts
git commit -m "feat: add quiz and review completion flow"
```

## 任务 7：添加保存单词页面和学习记录

**文件：**

- 创建：`src/app/words/page.tsx`
- 创建：`src/components/words/word-list.tsx`
- 创建：`src/features/analytics/event-service.ts`
- 创建：`src/app/api/events/route.ts`
- 测试：`src/features/analytics/event-service.test.ts`
- 测试：`tests/e2e/reader-flow.spec.ts`

- [x] **步骤 1：为事件记录和单词列表过滤编写失败测试**

```ts
it('records start, lookup, save, quiz-submit, and complete events', async () => {
  await recordEvent({
    type: 'article_started',
    deviceId: 'dev-1',
    articleSlug: 'welcome-to-deep-reading',
  });
  expect(await listEvents('dev-1')).toHaveLength(1);
});

it('shows saved words grouped by source article', async () => {
  const groups = await listSavedWordsByArticle('dev-1');
  expect(groups[0]).toMatchObject({
    articleSlug: expect.any(String),
    words: expect.any(Array),
  });
});
```

- [x] **步骤 2：运行测试并验证其失败**

运行：`pnpm vitest run src/features/analytics/event-service.test.ts src/features/words/saved-word-service.test.ts`
预期：失败

- [x] **步骤 3：实现事件记录 API**

必需事件类型：

- `article_started`
- `article_resumed`
- `word_lookup_opened`
- `word_saved`
- `quiz_started`
- `quiz_submitted`
- `article_completed`

- [x] **步骤 4：构建保存单词页面**

MVP 页面必须支持：

- 列出当前设备的所有保存单词
- 显示文章标题和源句子
- 按词干或含义搜索
- 按文章过滤

- [x] **步骤 5：将阅读器操作连接到事件**

每个关键用户操作应记录一次，使用稳定负载，以便后续计算 PRD 中的 MVP 指标。

- [x] **步骤 6：运行测试**

运行：`pnpm vitest run src/features/analytics/event-service.test.ts src/features/words/saved-word-service.test.ts`
运行：`pnpm playwright test tests/e2e/reader-flow.spec.ts --grep "saved words"`
预期：通过

- [x] **步骤 7：提交保存单词和分析**

```bash
git add src/app/words src/components/words src/features/analytics src/app/api/events src/features/words
git commit -m "feat: add saved words page and learning events"
```

## 任务 8：强化空状态、错误处理和响应式质量

**文件：**

- 创建：`src/components/system/empty-state.tsx`
- 创建：`src/components/system/error-state.tsx`
- 修改：`src/app/page.tsx`
- 修改：`src/app/reader/[slug]/page.tsx`
- 修改：`src/app/words/page.tsx`
- 测试：`tests/e2e/home.spec.ts`
- 测试：`tests/e2e/reader-flow.spec.ts`
- 测试：`tests/e2e/mobile-reader.spec.ts`

- [x] **步骤 1：为空/错误状态编写失败浏览器测试**

场景：

- 未种子化文章
- 未知文章 slug
- 失败的查询请求
- 缺少文章翻译负载
- 格式错误的文章内容引用
- 进度保存时的临时网络失败
- 空保存单词页面

- [x] **步骤 2：运行端到端覆盖并验证新案例失败**

运行：`pnpm playwright test tests/e2e/home.spec.ts tests/e2e/reader-flow.spec.ts tests/e2e/mobile-reader.spec.ts`
预期：新边缘案例断言失败

- [x] **步骤 3：实现用户面向的回退状态**

要求：

- 空文章列表解释发生的情况并提供重试或种子提示
- 未知文章路由返回清晰的未找到状态
- 失败的单词查询显示可恢复的重试反馈
- 缺少翻译或格式错误的文章内容显示清晰回退，而不是损坏的阅读器
- 临时进度保存失败保持本地状态，并在下次交互时静默重试
- 空保存单词页面鼓励首先阅读文章

- [x] **步骤 4：验证 PRD 中的响应式约束**

检查清单：

- 移动单手轻点轻松
- 查询面板不覆盖当前位置
- 旋转或调整大小不重置阶段状态
- 桌面阅读宽度在长时间阅读会话中保持舒适

- [x] **步骤 5：运行完整验证**

运行：`pnpm lint`
运行：`pnpm test`
运行：`pnpm test:e2e`
预期：通过

- [x] **步骤 6：提交 MVP 强化**

```bash
git add src/components/system src/app tests/e2e
git commit -m "fix: harden responsive states and edge cases"
```

## 任务 9：最终发布准备检查

**文件：**

- 修改：`README.md`
- 创建：`.env.example`
- 创建：`docs/testing/mvp-smoke-checklist.md`

- [x] **步骤 1：记录本地设置和必需环境变量**

记录：

- 数据库连接
- 种子命令
- 测试命令
- 浏览器测试命令

- [x] **步骤 2：编写手动烟雾检查清单**

检查清单项目：

- 在桌面进入首页
- 在移动宽度进入首页
- 从继续阅读恢复文章
- 查询并保存单词
- 提交测验
- 验证翻译解锁
- 验证保存单词出现在单词页面

- [ ] **步骤 3：手动运行烟雾检查清单**

运行：`pnpm dev`
然后在桌面和移动视口浏览器中验证检查清单
预期：在调用 MVP 完成前，每项均通过

- [x] **步骤 4：提交发布准备文档**

```bash
git add README.md .env.example docs/testing/mvp-smoke-checklist.md
git commit -m "docs: add mvp setup and smoke checklist"
```

## PRD 覆盖映射

| PRD 要求                   | 由以下覆盖      |
| -------------------------- | --------------- |
| 文章列表和继续阅读         | 任务 3、4       |
| 四阶段阅读器流程           | 任务 4、6       |
| 一步单词查询               | 任务 5          |
| 关键词汇 / 语法 / 难点句子 | 任务 6          |
| 带解释的测验               | 任务 6          |
| 带文章 + 句子的保存单词    | 任务 5、7       |
| 阅读进度保存/恢复          | 任务 4          |
| 学习记录事件               | 任务 7          |
| 桌面 + 移动可用性          | 任务 4、5、8、9 |
| 空/错误状态                | 任务 8          |

## 构建期间需关注的風險

- 匿名设备持久化如果 Cookie 创建不稳定可能会漂移。在 UI 工作扩展前，在任务 2 中锁定它。
- 单词查询质量取决于文章标注质量。保持内容验证严格，并使缺少句子引用的种子失败。
- 审查解锁逻辑容易意外弱化。用单元测试和端到端覆盖保护它。
- 移动阅读连续性是最容易回归的地方。每次阅读器 UI 更改后重新运行 `tests/e2e/mobile-reader.spec.ts`。

## MVP 后的后续计划

Phase 1 稳定后创建单独计划：

1. **Phase 2 计划：** 保存单词管理优化、学习统计、阅读历史、继续阅读排名
2. **Phase 3 计划：** 编辑工作流、AI 辅助内容生成带人工审查、难度/主题标记
3. **Phase 4 计划：** 登录、跨设备同步、音频、审查提醒、文章导入

除非核心阅读循环已验证，否则不要将这些拉入 MVP 分支。
