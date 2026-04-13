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
    description: '言序 Lexora，面向中文母语者的英语精读阅读器。',
    htmlLang: 'zh-CN',
    title: '言序 | Lexora',
  },
  common: {
    backHome: '返回首页',
    close: '关闭',
    next: '下一步',
    openWords: '打开生词本',
    previous: '上一步',
    retryHome: '重新加载首页',
  },
  auth: {
    authenticatedHint: '已登录，可同步阅读进度与生词。',
    codeHint: '验证码已发送到你的邮箱；开发环境会显示预览码。',
    codeLabel: '6 位验证码',
    devCodePreview: (code: string) => `开发环境验证码：${code}`,
    emailLabel: '登录邮箱',
    errorFallback: '这一步暂时没有成功，请稍后重试。',
    logout: '退出登录',
    requestCode: '发送验证码',
    sendingCode: '发送中...',
    signedOutDescription:
      '登录后，后续迁移版本就可以把阅读进度、生词和生成内容同步到你的账号。',
    signedOutTitle: '登录后可跨设备同步',
    verify: '验证并登录',
    verifying: '验证中...',
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
      eyebrow: '言序 Lexora',
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
      completeReading: '完成本篇阅读',
      description:
        '带着刚刚预热过的词汇、语法和句型重新读正文。看到高亮词时，可以随时点开快速回忆。',
      eyebrow: '在上下文里巩固理解',
      currentParagraph: (paragraphId?: string, totalParagraphCount?: number) =>
        formatParagraphProgress(paragraphId, totalParagraphCount),
      jumpToParagraph: (index: number) => `第 ${index} 段`,
      paragraphTitle: (index: number) => `第 ${index} 段`,
      hideTranslation: '收起译文',
      showTranslation: '显示译文',
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
      restoreReady: (stageLabel: string) =>
        `已回到上次读到的位置 · ${stageLabel}`,
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
        '如果你想补存几个词，可以回正文点词；已记住的词不会再出现在这里。',
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
      explainPhraseError: '暂时无法讲解这段短语，请重试。',
      saveWordError: '这个词暂时无法保存。重试一次即可，当前阅读位置不会丢失。',
    },
    selectionBar: {
      busyPhrase: '正在打磨短语讲解',
      busyWord: '正在整理这个词的批注',
      clear: '清除选择',
      expandLeft: '向左扩展',
      expandRight: '向右扩展',
      explainPhrase: '讲解短语',
      explainWord: '看这个词',
      title: '正文讲解操作',
    },
    stageNav: {
      ariaLabel: '阅读阶段导航',
    },
    explainPanel: {
      ariaLabelDesktop: '阅读讲解面板',
      ariaLabelMobile: '移动端阅读讲解面板',
      contextMeaning: '放回原句怎么理解',
      errorTitle: '这次讲解没成功',
      loadingPhraseEyebrow: '短语批注稿',
      loadingPhrase: '正在结合当前句子整理这段短语的意思和拆解。',
      loadingPhraseSteps: [
        '抽取当前句子的搭配关系',
        '压缩成更顺的中文解释',
        '补齐你真正需要记住的提醒',
      ],
      loadingTitle: '正在生成讲解',
      loadingWordEyebrow: '单词批注稿',
      loadingWord: '正在结合当前句子整理这个词的讲解。',
      loadingWordSteps: [
        '定位这个词在原句里的真实意思',
        '筛掉不必要的词典噪音',
        '整理成更适合精读记忆的批注',
      ],
      phraseExplanation: '为什么这里这样理解',
      phraseMeaning: '整体翻译',
      phraseTitle: '短语讲解',
      readd: '重新加入生词库',
      remembered: '已记住',
      retry: '重试讲解',
      retrySave: '重试保存',
      save: '保存到生词库',
      saved: '已在生词库',
      saving: '保存中...',
      sourceSentence: '原句',
      wordMemory: '助记讲解',
      wordExplanation: '理解提醒',
      wordMeaning: '中文解释',
      wordUsage: '常用场景',
      wordTitle: '单词讲解',
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
      backHome: '返回首页',
      backReader: '返回正文',
      browseArticles: '去看文章',
      filterAll: '全部文章',
      markRemembered: '已记住',
      searchPlaceholder: '按单词原形或保存内容搜索',
      retry: '重新加载生词页',
    },
    labels: {
      contextMeaning: '原文里怎么理解',
    },
  },
  continueReading: {
    button: '继续阅读',
    description:
      '只要你进入任意文章，这里就会显示这台设备上最近一次未完成的阅读进度。',
    emptyTitle: '开始阅读后，你的下一次续读会显示在这里。',
    eyebrow: '继续阅读',
    resumeFrom: (stageLabel: string) => `上次读到${stageLabel}`,
  },
  articleCard: {
    startReading: '开始精读',
  },
  generate: {
    processingDescription: '模型正在把原始内容整理成适合精读的文章与学习材料。',
    processingEyebrow: '精读稿编修中',
    processingSteps: [
      '提炼主线与段落结构',
      '重写为适合精读的成稿',
      '补齐可进入阅读器的学习字段',
    ],
    processingTitle: '正在生成这篇精读文章',
    queuedDescription: '稿件已收下，系统正在排队准备抽取内容与结构。',
    queuedEyebrow: '编辑部收稿中',
    queuedSteps: [
      '登记来源并检查可提取内容',
      '准备抽取正文与结构信息',
      '为精读稿生成任务预热上下文',
    ],
    queuedTitle: '文章已进入生成队列',
    submitBusy: '正在提交任务...',
  },
} as const;
