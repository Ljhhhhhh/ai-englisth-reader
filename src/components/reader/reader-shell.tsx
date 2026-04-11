'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArticleBody } from '@/components/reader/article-body';
import { IntroPanel } from '@/components/reader/intro-panel';
import { ReviewPanel } from '@/components/reader/review-panel';
import { StageNav } from '@/components/reader/stage-nav';
import { WordPanelDesktop } from '@/components/reader/word-panel-desktop';
import { WordPanelMobile } from '@/components/reader/word-panel-mobile';
import { hasEvent, recordEvent } from '@/features/analytics/event-service';
import {
  getLookupableWords,
  lookupWordFromArticle,
  type WordLookupResult,
} from '@/features/reader/word-lookup-service';
import {
  buildExplainCacheKey,
  type ReaderExplainMode,
} from '@/features/reader/reader-explain-utils';
import {
  loadProgress,
  saveProgress,
  type ReaderProgressRecord,
} from '@/features/reader/progress-service';
import {
  getStageLabel,
  type ReaderStage,
} from '@/features/reader/stage-machine';
import {
  forgetRememberedItem,
  isItemRemembered,
  listRememberedItems,
  rememberItem,
} from '@/features/words/remembered-item-service';
import {
  isWordSaved,
  listSavedWords,
  saveWord,
  unsaveWord,
} from '@/features/words/saved-word-service';
import type { Article } from '@/lib/content/article-schema';
import { getOrCreateDeviceId } from '@/lib/device-id';
import { uiCopy } from '@/lib/ui-copy';

type ReaderShellProps = {
  article: Article;
  navigation: {
    nextArticle?: {
      slug: string;
      title: string;
    };
    previousArticle?: {
      slug: string;
      title: string;
    };
  };
};

type LookupRequest = {
  mode: ReaderExplainMode;
  selectedText: string;
  sentenceId: string;
  sentenceText: string;
};

type ExplainPanelData = {
  mode: ReaderExplainMode;
  selectedText: string;
  meaning: string;
  contextMeaning: string;
  explanation: string;
  sourceSentence: string;
  usageExample?: string;
  lemma?: string;
  memoryHook?: string;
  memoryType?: string;
};

type ExplainPanelState =
  | { status: 'idle' }
  | { status: 'loading'; request: LookupRequest }
  | { status: 'error'; request: LookupRequest; message: string }
  | { status: 'success'; request: LookupRequest; data: ExplainPanelData };

function shouldFailOnce(consumedFlags: Record<string, boolean>, key: string) {
  const searchParams = new URLSearchParams(window.location.search);
  if (searchParams.get(key) !== 'once' || consumedFlags[key]) {
    return false;
  }

  consumedFlags[key] = true;
  return true;
}

function normalizeWordKey(value: string) {
  return value.replace(/^[^A-Za-z']+|[^A-Za-z']+$/g, '').trim().toLowerCase();
}

function buildUsageExampleFallback(
  sourceSentence: string,
  selectedText: string,
  usageExample?: string,
) {
  if (usageExample?.trim()) {
    return usageExample;
  }

  return sourceSentence.includes(selectedText) ? sourceSentence : sourceSentence;
}

export function ReaderShell({ article, navigation }: ReaderShellProps) {
  const consumedFailureFlagsRef = useRef<Record<string, boolean>>({});
  const [isMobilePanel, setIsMobilePanel] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [currentStage, setCurrentStage] = useState<ReaderStage>('intro');
  const [isCompleted, setIsCompleted] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [restoredProgress, setRestoredProgress] =
    useState<ReaderProgressRecord | null>(null);
  const explainCacheRef = useRef(new Map<string, ExplainPanelData>());
  const explainRequestIdRef = useRef(0);
  const explainAbortRef = useRef<AbortController | null>(null);
  const [savedLemmas, setSavedLemmas] = useState<string[]>([]);
  const [rememberedWords, setRememberedWords] = useState<string[]>([]);
  const [rememberedPhrases, setRememberedPhrases] = useState<string[]>([]);
  const [explainPanelState, setExplainPanelState] =
    useState<ExplainPanelState>({ status: 'idle' });
  const [saveWordError, setSaveWordError] = useState<string | null>(null);
  const [savingIntroWords, setSavingIntroWords] = useState<string[]>([]);
  const [progressSaveNotice, setProgressSaveNotice] = useState<string | null>(
    null,
  );
  const [lastLookupRequest, setLastLookupRequest] =
    useState<LookupRequest | null>(null);

  const lookupableWords = getLookupableWords(article);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const syncMedia = () => {
      queueMicrotask(() => {
        setIsMobilePanel(mediaQuery.matches);
      });
    };

    syncMedia();
    mediaQuery.addEventListener('change', syncMedia);

    return () => {
      mediaQuery.removeEventListener('change', syncMedia);
    };
  }, []);

  useEffect(() => {
    const storage = window.localStorage;
    const nextDeviceId = getOrCreateDeviceId(storage);
    const existing = loadProgress(nextDeviceId, article.slug, storage);
    const savedWords = listSavedWords(nextDeviceId, storage, article.slug);
    const rememberedItems = listRememberedItems(nextDeviceId, storage);

    queueMicrotask(() => {
      setDeviceId(nextDeviceId);
      setSavedLemmas(savedWords.map((word) => word.lemma.toLowerCase()));
      setRememberedWords(
        rememberedItems
          .filter((item) => item.type === 'word')
          .map((item) => item.term.toLowerCase()),
      );
      setRememberedPhrases(
        rememberedItems
          .filter((item) => item.type === 'phrase')
          .map((item) => item.term.toLowerCase()),
      );

      if (existing) {
        setIsCompleted(existing.isCompleted);
        setCurrentStage(existing.currentStage);

        if (!existing.isCompleted) {
          setRestoredProgress(existing);
          recordEvent(
            {
              articleSlug: article.slug,
              deviceId: nextDeviceId,
              type: 'article_resumed',
            },
            storage,
          );
        }
      }

      setHydrated(true);
    });
  }, [article]);

  useEffect(() => {
    if (!hydrated || !deviceId) {
      return;
    }

    try {
      if (
        shouldFailOnce(consumedFailureFlagsRef.current, 'mockProgressSaveError')
      ) {
        throw new Error('mock progress save failure');
      }

      saveProgress(
        {
          articleSlug: article.slug,
          currentStage,
          deviceId,
          isCompleted,
        },
        window.localStorage,
      );
      setProgressSaveNotice(null);
    } catch {
      setProgressSaveNotice(uiCopy.reader.progress.saveNotice);
    }
  }, [article.slug, currentStage, deviceId, hydrated, isCompleted]);

  function markArticleCompleted(nextDeviceId: string) {
    if (
      !hasEvent(
        {
          articleSlug: article.slug,
          deviceId: nextDeviceId,
          type: 'article_completed',
        },
        window.localStorage,
      )
    ) {
      recordEvent(
        {
          articleSlug: article.slug,
          deviceId: nextDeviceId,
          type: 'article_completed',
        },
        window.localStorage,
        { oncePerArticle: true },
      );
    }
  }

  function selectStage(stage: ReaderStage) {
    if (stage !== 'read') {
      closeWordPanel();
    }
    setCurrentStage(stage);
  }

  useEffect(() => {
    return () => {
      explainAbortRef.current?.abort();
    };
  }, []);

  async function handleLookupWord(input: LookupRequest) {
    setLastLookupRequest(input);
    setSaveWordError(null);

    const cacheKey = buildExplainCacheKey({
      mode: input.mode,
      sentenceId: input.sentenceId,
      selectedText: input.selectedText,
    });
    const cached = explainCacheRef.current.get(cacheKey);

    if (cached) {
      setExplainPanelState({
        status: 'success',
        request: input,
        data: cached,
      });
      return;
    }

    let fallbackWord: WordLookupResult | null = null;

    if (input.mode === 'word') {
      try {
        fallbackWord = lookupWordFromArticle({
          article,
          sentenceId: input.sentenceId,
          surface: input.selectedText,
        });
      } catch {
        fallbackWord = null;
      }
    }

    explainAbortRef.current?.abort();
    const controller = new AbortController();
    explainAbortRef.current = controller;
    const requestId = explainRequestIdRef.current + 1;
    explainRequestIdRef.current = requestId;
    setExplainPanelState({ status: 'loading', request: input });

    try {
      const response = await fetch('/api/reader/explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          articleSlug: article.slug,
          sentenceId: input.sentenceId,
          sentenceText: input.sentenceText,
          selectedText: input.selectedText,
          mode: input.mode,
        }),
        signal: controller.signal,
      });

      if (!response.ok || shouldFailOnce(consumedFailureFlagsRef.current, 'mockLookupError')) {
        throw new Error('mock explain failure');
      }

      const payload = (await response.json()) as {
        mode: ReaderExplainMode;
        selectedText: string;
        meaning: string;
        contextMeaning: string;
        explanation: string;
        lemma?: string;
        memoryHook?: string;
        sourceSentence: string;
        usageExample?: string;
      };

      if (requestId !== explainRequestIdRef.current) {
        return;
      }

      const nextExplainData: ExplainPanelData = {
        mode: payload.mode,
        selectedText: payload.selectedText,
        meaning: payload.meaning,
        contextMeaning: payload.contextMeaning,
        explanation: payload.explanation,
        sourceSentence: payload.sourceSentence,
        usageExample: payload.usageExample,
        lemma: fallbackWord?.lemma ?? payload.lemma,
        memoryHook: fallbackWord?.memoryHook ?? payload.memoryHook,
        memoryType: fallbackWord?.memoryType,
      };

      explainCacheRef.current.set(cacheKey, nextExplainData);
      setExplainPanelState({
        status: 'success',
        request: input,
        data: nextExplainData,
      });

      if (deviceId && input.mode === 'word') {
        recordEvent(
          {
            articleSlug: article.slug,
            deviceId,
            payload: { lemma: input.selectedText.toLowerCase() },
            type: 'word_lookup_opened',
          },
          window.localStorage,
        );
      }
    } catch {
      if (controller.signal.aborted || requestId !== explainRequestIdRef.current) {
        return;
      }

      if (input.mode === 'word' && fallbackWord) {
        const fallbackData: ExplainPanelData = {
          mode: 'word',
          selectedText: fallbackWord.surface,
          meaning: fallbackWord.chineseMeaning,
          contextMeaning: fallbackWord.contextMeaning,
          explanation: `${fallbackWord.memoryType} · ${fallbackWord.memoryHook}`,
          sourceSentence: fallbackWord.sourceSentence,
          usageExample: fallbackWord.sourceSentence,
          lemma: fallbackWord.lemma,
          memoryHook: fallbackWord.memoryHook,
          memoryType: fallbackWord.memoryType,
        };

        explainCacheRef.current.set(cacheKey, fallbackData);
        setExplainPanelState({
          status: 'success',
          request: input,
          data: fallbackData,
        });
        return;
      }

      setExplainPanelState({
        status: 'error',
        request: input,
        message: uiCopy.reader.shell.explainPhraseError,
      });
    }
  }

  function closeWordPanel() {
    setExplainPanelState({ status: 'idle' });
  }

  function toggleSavedWord() {
    if (!deviceId || explainPanelState.status !== 'success') {
      return;
    }

    if (explainPanelState.data.mode !== 'word') {
      return;
    }

    const selectedWord = explainPanelState.data;
    const lemma = selectedWord.lemma ?? normalizeWordKey(selectedWord.selectedText);
    const normalizedLemma = lemma.toLowerCase();
    const remembered = isItemRemembered(
      {
        deviceId,
        term: normalizedLemma,
        type: 'word',
      },
      window.localStorage,
    );

    if (remembered) {
      forgetRememberedItem(
        {
          deviceId,
          term: normalizedLemma,
          type: 'word',
        },
        window.localStorage,
      );
      setRememberedWords((current) =>
        current.filter((item) => item !== normalizedLemma),
      );
    }

    if (
      isWordSaved(
        {
          articleSlug: article.slug,
          deviceId,
          lemma: normalizedLemma,
        },
        window.localStorage,
      )
    ) {
      unsaveWord(
        {
          articleSlug: article.slug,
          deviceId,
          lemma: normalizedLemma,
        },
        window.localStorage,
      );
      setSavedLemmas((current) =>
        current.filter((item) => item !== normalizedLemma),
      );
      setSaveWordError(null);
      return;
    }

    try {
      if (
        shouldFailOnce(consumedFailureFlagsRef.current, 'mockSaveWordError')
      ) {
        throw new Error('mock save word failure');
      }

      saveWord(
        {
          articleSlug: article.slug,
          articleTitle: article.chinese_title,
          chineseMeaning: selectedWord.meaning,
          contextMeaning: selectedWord.contextMeaning,
          deviceId,
          lemma,
          memoryHook: selectedWord.memoryHook ?? selectedWord.explanation,
          sentenceId: explainPanelState.request.sentenceId,
          sourceSentence: selectedWord.sourceSentence,
          surface: selectedWord.selectedText,
          usageExample: buildUsageExampleFallback(
            selectedWord.sourceSentence,
            selectedWord.selectedText,
            selectedWord.usageExample,
          ),
        },
        window.localStorage,
      );
      setSavedLemmas((current) =>
        current.includes(normalizedLemma)
          ? current
          : [...current, normalizedLemma],
      );
      setSaveWordError(null);

      recordEvent(
        {
          articleSlug: article.slug,
          deviceId,
          payload: { lemma: normalizedLemma },
          type: 'word_saved',
        },
        window.localStorage,
      );
    } catch {
      setSaveWordError(uiCopy.reader.shell.saveWordError);
    }
  }

  async function handleSaveWordFromIntro(word: string) {
    if (!deviceId) {
      return;
    }

    const selectedWord = article.growth_vocabulary.find(
      (item) => item.word.toLowerCase() === word.toLowerCase(),
    );
    const sourceSentence = article.paragraphs
      .flatMap((paragraph) => paragraph.sentences)
      .find((sentence) =>
        sentence.text.toLowerCase().includes(word.toLowerCase()),
      );

    if (!selectedWord || !sourceSentence) {
      return;
    }

    forgetRememberedItem(
      {
        deviceId,
        term: selectedWord.word,
        type: 'word',
      },
      window.localStorage,
    );
    setRememberedWords((current) =>
      current.filter((item) => item !== selectedWord.word.toLowerCase()),
    );

    setSavingIntroWords((current) =>
      current.includes(selectedWord.word.toLowerCase())
        ? current
        : [...current, selectedWord.word.toLowerCase()],
    );

    try {
      const response = await fetch('/api/reader/explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          articleSlug: article.slug,
          sentenceId: sourceSentence.id,
          sentenceText: sourceSentence.text,
          selectedText: selectedWord.word,
          mode: 'word',
        }),
      });

      if (!response.ok) {
        throw new Error('save intro word explain failed');
      }

      const payload = (await response.json()) as {
        explanation: string;
        lemma?: string;
        meaning: string;
        memoryHook?: string;
        sourceSentence: string;
        usageExample?: string;
      };

      saveWord(
        {
          articleSlug: article.slug,
          articleTitle: article.chinese_title,
          chineseMeaning: selectedWord.chinese_meaning,
          contextMeaning: selectedWord.context_meaning,
          deviceId,
          lemma: payload.lemma ?? selectedWord.word,
          memoryHook: selectedWord.memory_hook || payload.memoryHook || payload.explanation,
          sentenceId: sourceSentence.id,
          sourceSentence: sourceSentence.text,
          surface: selectedWord.word,
          usageExample: buildUsageExampleFallback(
            payload.sourceSentence ?? sourceSentence.text,
            selectedWord.word,
            payload.usageExample,
          ),
        },
        window.localStorage,
      );
      setSavedLemmas((current) =>
        current.includes(selectedWord.word.toLowerCase())
          ? current
          : [...current, selectedWord.word.toLowerCase()],
      );
    } catch {
      setSaveWordError(uiCopy.reader.shell.saveWordError);
    } finally {
      setSavingIntroWords((current) =>
        current.filter((item) => item !== selectedWord.word.toLowerCase()),
      );
    }
  }

  function handleRememberWord(word: string) {
    if (!deviceId) {
      return;
    }

    const selectedWord = article.growth_vocabulary.find(
      (item) => item.word.toLowerCase() === word.toLowerCase(),
    );

    if (!selectedWord) {
      return;
    }

    rememberItem(
      {
        deviceId,
        displayText: selectedWord.word,
        meaning: selectedWord.chinese_meaning,
        savedFromArticleSlug: article.slug,
        savedFromArticleTitle: article.chinese_title,
        term: selectedWord.word,
        type: 'word',
      },
      window.localStorage,
    );
    unsaveWord(
      {
        articleSlug: article.slug,
        deviceId,
        lemma: selectedWord.word,
      },
      window.localStorage,
    );
    setSavedLemmas((current) =>
      current.filter((item) => item !== selectedWord.word.toLowerCase()),
    );
    setRememberedWords((current) =>
      current.includes(selectedWord.word.toLowerCase())
        ? current
        : [...current, selectedWord.word.toLowerCase()],
    );
  }

  function handleRememberPhrase(phrase: string) {
    if (!deviceId) {
      return;
    }

    const selectedPhrase = article.high_frequency_phrases.find(
      (item) => item.phrase.toLowerCase() === phrase.toLowerCase(),
    );

    if (!selectedPhrase) {
      return;
    }

    rememberItem(
      {
        deviceId,
        displayText: selectedPhrase.phrase,
        meaning: selectedPhrase.chinese_meaning,
        savedFromArticleSlug: article.slug,
        savedFromArticleTitle: article.chinese_title,
        term: selectedPhrase.phrase,
        type: 'phrase',
      },
      window.localStorage,
    );
    setRememberedPhrases((current) =>
      current.includes(selectedPhrase.phrase.toLowerCase())
        ? current
        : [...current, selectedPhrase.phrase.toLowerCase()],
    );
  }

  function startReading() {
    setIsCompleted(false);
    if (deviceId) {
      recordEvent(
        {
          articleSlug: article.slug,
          deviceId,
          type: 'article_started',
        },
        window.localStorage,
      );
    }

    selectStage('read');
  }

  const selectedWordSaved =
    explainPanelState.status === 'success' && explainPanelState.data.mode === 'word'
      ? savedLemmas.includes(
          (explainPanelState.data.lemma ??
            normalizeWordKey(explainPanelState.data.selectedText)
          ).toLowerCase(),
        )
      : false;
  const selectedWordRemembered =
    explainPanelState.status === 'success' && explainPanelState.data.mode === 'word'
      ? rememberedWords.includes(
          (
            explainPanelState.data.lemma ??
            normalizeWordKey(explainPanelState.data.selectedText)
          ).toLowerCase(),
        )
      : false;

  function completeReading() {
    setIsCompleted(true);
    selectStage('review');
    if (deviceId) {
      markArticleCompleted(deviceId);
    }
  }

  function renderStage() {
    if (currentStage === 'intro') {
      return (
        <IntroPanel
          article={article}
          onRememberPhrase={handleRememberPhrase}
          onRememberWord={handleRememberWord}
          onSaveWord={handleSaveWordFromIntro}
          onStartReading={startReading}
          rememberedPhrases={rememberedPhrases}
          rememberedWords={rememberedWords}
          savingWords={savingIntroWords}
          savedWords={savedLemmas}
        />
      );
    }

    if (currentStage === 'review') {
      const savedWords = deviceId
        ? listSavedWords(deviceId, window.localStorage, article.slug)
        : [];

      return (
        <ReviewPanel
          article={article}
          nextArticleSlug={navigation.nextArticle?.slug}
          savedWords={savedWords}
        />
      );
    }

    return (
      <ArticleBody
        activeExplainRequest={
          explainPanelState.status === 'loading' ? explainPanelState.request : null
        }
        article={article}
        lookupableWords={lookupableWords}
        onCompleteReading={completeReading}
        onExplainRequest={handleLookupWord}
      />
    );
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        padding:
          isMobilePanel && explainPanelState.status !== 'idle'
            ? '32px 20px 320px'
            : '32px 20px 72px',
        display: 'grid',
        gap: 20,
      }}
    >
      <section
        style={{
          display: 'grid',
          gap: 16,
          padding: 20,
          borderRadius: 24,
          border: '1px solid var(--border)',
          background: 'rgba(255, 253, 248, 0.88)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link href="/" style={navLinkStyle}>
              {uiCopy.common.backHome}
            </Link>
            <Link
              href={`/words?from=reader&articleSlug=${encodeURIComponent(article.slug)}`}
              style={navLinkStyle}
            >
              {uiCopy.common.openWords}
            </Link>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {navigation.previousArticle ? (
              <Link
                href={`/reader/${navigation.previousArticle.slug}`}
                style={navLinkStyle}
              >
                {uiCopy.reader.navigation.previousArticle}
              </Link>
            ) : null}
            {navigation.nextArticle ? (
              <Link
                href={`/reader/${navigation.nextArticle.slug}`}
                style={navLinkStyle}
              >
                {uiCopy.reader.navigation.nextArticle}
              </Link>
            ) : null}
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gap: 12,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-start',
              gap: 12,
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <span style={{ color: 'var(--muted)', fontSize: 14 }}>
              {uiCopy.reader.navigation.currentStage(getStageLabel(currentStage))}
            </span>
            {isCompleted ? (
              <span style={{ color: 'var(--accent)', fontSize: 14 }}>
                {uiCopy.reader.review.completionTitle}
              </span>
            ) : null}
          </div>

          <StageNav
            currentStage={currentStage}
            onSelectStage={selectStage}
            canSelectStage={(stage) =>
              stage !== 'review' || isCompleted || currentStage === 'review'
            }
          />
        </div>
      </section>

      {progressSaveNotice ? (
        <div
          style={{
            padding: '14px 18px',
            borderRadius: 18,
            border: '1px solid #d6b79a',
            background: '#fff8ee',
            color: 'var(--muted)',
          }}
        >
          {progressSaveNotice}
        </div>
      ) : null}

      {restoredProgress ? (
        <div
          style={{
            padding: '14px 18px',
            borderRadius: 18,
            border: '1px solid var(--border)',
            background: 'rgba(255, 248, 238, 0.86)',
            color: 'var(--muted)',
          }}
        >
          {uiCopy.reader.progress.restoreReady(
            getStageLabel(restoredProgress.currentStage),
          )}
        </div>
      ) : null}

      <div style={{ width: 'min(100%, 920px)' }}>{renderStage()}</div>

      {!hydrated ? (
        <p style={{ margin: 0, color: 'var(--muted)' }}>
          {uiCopy.reader.progress.loading}
        </p>
      ) : null}

      {!isMobilePanel && explainPanelState.status !== 'idle' ? (
        <WordPanelDesktop
          onClose={closeWordPanel}
          onRetry={() => {
            if (lastLookupRequest) {
              void handleLookupWord(lastLookupRequest);
            }
          }}
          remembered={selectedWordRemembered}
          onToggleSave={toggleSavedWord}
          saved={selectedWordSaved}
          saveEnabled={
            explainPanelState.status === 'success' &&
            explainPanelState.data.mode === 'word'
          }
          saveErrorMessage={saveWordError}
          state={
            explainPanelState.status === 'success'
              ? { status: 'success', data: explainPanelState.data }
              : explainPanelState.status === 'loading'
                ? {
                    status: 'loading',
                    mode: explainPanelState.request.mode,
                    selectedText: explainPanelState.request.selectedText,
                  }
                : {
                    status: 'error',
                    mode: explainPanelState.request.mode,
                    selectedText: explainPanelState.request.selectedText,
                    message: explainPanelState.message,
                  }
          }
        />
      ) : null}

      {isMobilePanel && explainPanelState.status !== 'idle' ? (
        <WordPanelMobile
          onClose={closeWordPanel}
          onRetry={() => {
            if (lastLookupRequest) {
              void handleLookupWord(lastLookupRequest);
            }
          }}
          remembered={selectedWordRemembered}
          onToggleSave={toggleSavedWord}
          saved={selectedWordSaved}
          saveEnabled={
            explainPanelState.status === 'success' &&
            explainPanelState.data.mode === 'word'
          }
          saveErrorMessage={saveWordError}
          state={
            explainPanelState.status === 'success'
              ? { status: 'success', data: explainPanelState.data }
              : explainPanelState.status === 'loading'
                ? {
                    status: 'loading',
                    mode: explainPanelState.request.mode,
                    selectedText: explainPanelState.request.selectedText,
                  }
                : {
                    status: 'error',
                    mode: explainPanelState.request.mode,
                    selectedText: explainPanelState.request.selectedText,
                    message: explainPanelState.message,
                  }
          }
        />
      ) : null}
    </main>
  );
}

const navLinkStyle = {
  borderRadius: 999,
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  color: 'var(--foreground)',
  fontWeight: 600,
  padding: '10px 14px',
} as const;
