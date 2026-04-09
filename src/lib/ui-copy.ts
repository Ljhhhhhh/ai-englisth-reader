export function formatEstimatedMinutes(minutes: number) {
  return `预计 ${minutes} 分钟`;
}

export function formatParagraphLabel(paragraphId?: string) {
  if (!paragraphId) {
    return '';
  }

  return `第 ${paragraphId.replace(/^p/, '')} 段`;
}

export function formatParagraphProgress(
  paragraphId?: string,
  totalParagraphCount?: number,
) {
  const paragraphLabel = formatParagraphLabel(paragraphId);

  if (!paragraphLabel) {
    return '';
  }

  if (!totalParagraphCount) {
    return paragraphLabel;
  }

  return `${paragraphLabel} / 共 ${totalParagraphCount} 段`;
}

export const uiCopy = {
  app: {
    description: '面向中文母语者的交互式英语精读阅读器',
    htmlLang: 'zh-CN',
    title: 'AI 英语精读',
  },
  common: {
    backHome: '返回首页',
    close: '关闭',
    next: '下一步',
    openWords: '打开生词本',
    previous: '上一步',
    retryHome: '重新加载首页',
  },
  home: {
    empty: {
      description:
        '请先在 content/articles 下添加或恢复文章 JSON 内容，再刷新首页。只要有至少一篇文章，精读流程就会显示在这里。',
      eyebrow: '还没有示例文章',
      title: '这台设备上的阅读书架还是空的。',
    },
    error: {
      description:
        '请刷新页面，或检查 content/articles 下的示例文章 JSON 文件是否存在且格式有效。',
      eyebrow: '文章暂不可用',
      title: '首页暂时无法加载文章内容。',
    },
    hero: {
      description:
        '把注意力留在同一篇文章里，在上下文中吃透难点，把真正重要的词汇留下来，而不是在零散工具之间来回切换、不断打断阅读节奏。',
      eyebrow: '面向中文母语者的英语精读 MVP',
      title: '一次真正读懂一篇英文文章。',
    },
  },
  notFound: {
    description: '没有找到你请求的文章。请返回首页，从现有文章卡片重新进入。',
    eyebrow: '页面不存在',
    title: '这个文章地址不存在。',
  },
  reader: {
    articleBody: {
      continueToReview: '读完，进入复盘',
      description:
        '带着刚刚预热过的词汇、语法和句型重新读正文。看到高亮词时，可以随时点开快速回忆。',
      eyebrow: '在上下文里巩固理解',
      positionSaved: '这台设备上的阅读位置会自动保存。',
      currentParagraph: (paragraphId?: string, totalParagraphCount?: number) =>
        formatParagraphProgress(paragraphId, totalParagraphCount),
      nextParagraph: '下一段',
      previousParagraph: '上一段',
      jumpToParagraph: (index: number) => `第 ${index} 段`,
      paragraphTitle: (index: number) => `第 ${index} 段`,
    },
    intro: {
      ariaLabel: '导读面板',
      button: '进入正文开始精读',
      description:
        '先在这一页把核心词汇、语法点和难句预热一遍，再进入正文，会更容易保持理解和节奏。',
      eyebrow: '先抓住关键点',
      highFrequencyPhrasesTitle: '高频词组',
      grammarDescription:
        '先看一处最值得模仿的句法升级点，进入正文后更容易识别并复用。',
      grammarTitle: '语法升级',
      vocabularyDescription:
        '先熟悉这篇文章里最关键的词，再进入正文时更容易保持阅读流畅感。',
      vocabularyTitle: '重点词汇',
    },
    navigation: {
      currentStage: (stageLabel: string) => `当前阶段：${stageLabel}`,
      nextArticle: '下一篇',
      previousArticle: '上一篇',
    },
    page: {
      error: {
        eyebrow: '阅读器暂不可用',
        title: '这篇文章当前无法安全打开。',
      },
      issues: {
        brokenReferences:
          '这篇文章的学习字段与正文不一致，导读中的语法升级无法可靠展示。请先修正内容后再打开。',
        missingTranslation:
          '这篇文章缺少复盘阶段需要的全文译文，请先补齐译文内容后再打开阅读器。',
        unknownLoadError: '阅读器暂时无法加载这篇文章。',
      },
    },
    progress: {
      loading: '正在恢复这台设备上的阅读进度...',
      restoreReady: (_stageLabel: string, paragraphId?: string) =>
        `已回到上次读到的位置${paragraphId ? ` · ${formatParagraphLabel(paragraphId)}` : ''}`,
      saveNotice:
        '暂时无法同步阅读进度。你当前的位置仍会保留在页面上，系统会自动重试。',
      title: '阅读进度',
    },
    review: {
      completionTitle: '这一篇你已经读完了',
      completionDescription: '快速确认一下你刚刚读懂了什么。',
      description:
        '在结束这一轮精读前，对照全文译文，并把值得留下的词收进生词本。',
      emptySavedWords: '这一篇暂时还没有留下要记住的词。',
      emptySavedWordsHint:
        '如果你想补存几个词，可以回正文点词；不补也不影响这次完成阅读。',
      savedWordsHint: '这一篇里你决定留下来的词，都在这里。',
      nextArticle: '开始下一篇',
      savedWordsCta: '查看全部生词',
      eyebrow: '复盘与留存',
      savedWordsTitle: '这篇文章里保存的词',
      title: '本机阅读复盘',
      translationDescription: '如果你想逐句对照，再看全文译文。',
      translationTitle: '全文译文',
    },
    shell: {
      lookupError: '暂时无法查词。重试一次即可继续阅读，而且不会丢失当前位置。',
      retryLookup: '重新查词',
      retryLookupCardEyebrow: '查词重试',
      retryLookupCardTitle: '行内查词刚才失败了一次。',
      saveWordError: '这个词暂时无法保存。重试一次即可，当前阅读位置不会丢失。',
    },
    stageNav: {
      ariaLabel: '阅读阶段导航',
    },
    wordPanel: {
      ariaLabelDesktop: '单词详情弹窗',
      ariaLabelMobile: '移动端单词详情',
      contextMeaning: '本文语境含义',
      memoryHook: '记忆提示',
      meaning: '释义',
      save: '保存这个词',
      saved: '已保存到本机',
      sourceSentence: '原句',
      title: '单词详情',
      retrySave: '重试保存',
    },
  },
  words: {
    empty: {
      description:
        '先读完一篇文章，顺手保存几个词，它们就会按文章分组出现在这里，并附上原句。',
      eyebrow: '还没有收藏的词',
      title: '当你第一次保留查词结果后，生词本才会开始积累内容。',
    },
    page: {
      description:
        '按文章回顾已保存的词汇，按词义或原形搜索，并随时回到阅读流程继续精读。',
      eyebrow: '生词本',
      title: '你在真实阅读里留下的词',
    },
    pageError: {
      description:
        '请先刷新一次页面；如果问题仍然存在，请回到阅读器并在同一台设备上重新尝试。',
      eyebrow: '生词本暂不可用',
      title: '暂时无法打开你的生词本。',
    },
    actions: {
      browseArticles: '去看文章',
      filterAll: '全部文章',
      searchPlaceholder: '按单词原形或中文释义搜索',
      retry: '重新加载生词页',
    },
  },
  continueReading: {
    button: '继续阅读',
    description:
      '只要你进入任意文章，这里就会显示这台设备上最近一次未完成的阅读进度。',
    emptyTitle: '开始阅读后，你的下一次续读会显示在这里。',
    eyebrow: '继续阅读',
    resumeFrom: (_stageLabel: string, paragraphId?: string) =>
      paragraphId
        ? `上次读到${formatParagraphLabel(paragraphId)}`
        : '上次读到这里',
  },
  articleCard: {
    startReading: '开始精读',
  },
} as const;
