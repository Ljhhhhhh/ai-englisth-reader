'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArticleBody } from '@/components/reader/article-body';
import { IntroPanel } from '@/components/reader/intro-panel';
import { MobileExplainAssist } from '@/components/reader/mobile-explain-assist';
import { ProgressBar } from '@/components/reader/progress-bar';
import { ReviewPanel } from '@/components/reader/review-panel';
import { StageNav } from '@/components/reader/stage-nav';
import { WordPanelDesktop } from '@/components/reader/word-panel-desktop';
import { WordPanelMobile } from '@/components/reader/word-panel-mobile';
import { ErrorState } from '@/components/system/error-state';
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
import { getPhraseSuggestionsForWord } from '@/features/reader/reader-phrase-suggestions';
import {
  loadProgress,
  saveProgress,
  type ReaderProgressRecord,
} from '@/features/reader/progress-service';
import {
  getNextStage,
  getPreviousStage,
  getStageLabel,
  type ReaderStage,
} from '@/features/reader/stage-machine';
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
  lemma?: string;
  memoryHook?: string;
  memoryType?: string;
  saveWord?: WordLookupResult;
};

type ExplainPanelState =
  | { status: 'idle' }
  | { status: 'loading'; request: LookupRequest }
  | { status: 'error'; request: LookupRequest; message: string }
  | { status: 'success'; request: LookupRequest; data: ExplainPanelData };

function getDefaultParagraphId(article: Article) {
  return article.paragraphs[0]?.id;
}

function getParagraphIndex(article: Article, paragraphId?: string): number {
  if (!paragraphId) return 0;
  const index = article.paragraphs.findIndex((p) => p.id === paragraphId);
  return index === -1 ? 0 : index;
}

function getParagraphIdByIndex(
  article: Article,
  index: number,
): string | undefined {
  return article.paragraphs[index]?.id;
}

function shouldFailOnce(consumedFlags: Record<string, boolean>, key: string) {
  const searchParams = new URLSearchParams(window.location.search);
  if (searchParams.get(key) !== 'once' || consumedFlags[key]) {
    return false;
  }

  consumedFlags[key] = true;
  return true;
}

export function ReaderShell({ article, navigation }: ReaderShellProps) {
  const consumedFailureFlagsRef = useRef<Record<string, boolean>>({});
  const [isMobilePanel, setIsMobilePanel] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [currentStage, setCurrentStage] = useState<ReaderStage>('intro');
  const [currentParagraphId, setCurrentParagraphId] = useState<
    string | undefined
  >(getDefaultParagraphId(article));
  const [hydrated, setHydrated] = useState(false);
  const [restoredProgress, setRestoredProgress] =
    useState<ReaderProgressRecord | null>(null);
  const explainCacheRef = useRef(new Map<string, ExplainPanelData>());
  const explainRequestIdRef = useRef(0);
  const explainAbortRef = useRef<AbortController | null>(null);
  const [savedLemmas, setSavedLemmas] = useState<string[]>([]);
  const [explainPanelState, setExplainPanelState] =
    useState<ExplainPanelState>({ status: 'idle' });
  const [selectionNotice, setSelectionNotice] = useState<string | null>(null);
  const [mobileAssistState, setMobileAssistState] = useState<{
    sentenceId: string;
    sentenceText: string;
    selectedText: string;
    suggestions: ReturnType<typeof getPhraseSuggestionsForWord>;
  } | null>(null);
  const [saveWordError, setSaveWordError] = useState<string | null>(null);
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

    queueMicrotask(() => {
      setDeviceId(nextDeviceId);
      setSavedLemmas(savedWords.map((word) => word.lemma.toLowerCase()));

      if (existing) {
        setCurrentStage(existing.currentStage);
        setCurrentParagraphId(
          existing.paragraphId ?? getDefaultParagraphId(article),
        );
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
          paragraphId: currentParagraphId,
        },
        window.localStorage,
      );
      setProgressSaveNotice(null);
    } catch {
      setProgressSaveNotice(uiCopy.reader.progress.saveNotice);
    }
  }, [article.slug, currentParagraphId, currentStage, deviceId, hydrated]);

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
    setCurrentStage(stage);

    if (stage === 'read' && !currentParagraphId) {
      setCurrentParagraphId(getDefaultParagraphId(article));
    }

    if (stage === 'review' && deviceId) {
      markArticleCompleted(deviceId);
    }
  }

  function goNext() {
    selectStage(getNextStage(currentStage));
  }

  function goBack() {
    selectStage(getPreviousStage(currentStage));
  }

  useEffect(() => {
    return () => {
      explainAbortRef.current?.abort();
    };
  }, []);

  function showSelectionNotice(reason: 'selection_invalid' | 'selection_too_long') {
    setSelectionNotice(
      reason === 'selection_too_long'
        ? uiCopy.reader.shell.selectionTooLong
        : uiCopy.reader.shell.selectionInvalid,
    );

    window.setTimeout(() => {
      setSelectionNotice((current) =>
        current ===
        (reason === 'selection_too_long'
          ? uiCopy.reader.shell.selectionTooLong
          : uiCopy.reader.shell.selectionInvalid)
          ? null
          : current,
      );
    }, 2400);
  }

  async function handleLookupWord(input: LookupRequest) {
    setLastLookupRequest(input);
    setSaveWordError(null);
    setMobileAssistState(null);

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
        sourceSentence: string;
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
        lemma: fallbackWord?.lemma,
        memoryHook: fallbackWord?.memoryHook,
        memoryType: fallbackWord?.memoryType,
        saveWord: fallbackWord ?? undefined,
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
          lemma: fallbackWord.lemma,
          memoryHook: fallbackWord.memoryHook,
          memoryType: fallbackWord.memoryType,
          saveWord: fallbackWord,
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
    if (
      !deviceId ||
      explainPanelState.status !== 'success' ||
      !explainPanelState.data.saveWord
    ) {
      return;
    }

    const selectedWord = explainPanelState.data.saveWord;
    const normalizedLemma = selectedWord.lemma.toLowerCase();

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
          articleSlug: selectedWord.articleSlug,
          articleTitle: selectedWord.articleTitle,
          deviceId,
          lemma: selectedWord.lemma,
          meaning: selectedWord.chineseMeaning,
          sentenceId: selectedWord.sentenceId,
          sourceSentence: selectedWord.sourceSentence,
          surface: selectedWord.surface,
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

  function startReading() {
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

  const totalParagraphCount = article.paragraphs.length;
  const currentParagraphIndex = getParagraphIndex(article, currentParagraphId);
  const isFirstParagraph = currentParagraphIndex === 0;
  const isLastParagraph = currentParagraphIndex === totalParagraphCount - 1;

  function goToPreviousParagraph() {
    if (isFirstParagraph) return;
    const prevId = getParagraphIdByIndex(article, currentParagraphIndex - 1);
    if (prevId) setCurrentParagraphId(prevId);
  }

  function goToNextParagraph() {
    if (isLastParagraph) return;
    const nextId = getParagraphIdByIndex(article, currentParagraphIndex + 1);
    if (nextId) setCurrentParagraphId(nextId);
  }

  function goToReviewFromReading() {
    selectStage('review');
  }

  const selectedWordSaved =
    explainPanelState.status === 'success' && explainPanelState.data.saveWord
      ? savedLemmas.includes(explainPanelState.data.saveWord.lemma.toLowerCase())
      : false;
  const savedWords = deviceId
    ? listSavedWords(deviceId, window.localStorage, article.slug)
    : [];

  function renderStage() {
    if (currentStage === 'intro') {
      return <IntroPanel article={article} onStartReading={startReading} />;
    }

    if (currentStage === 'read') {
      return (
        <ArticleBody
          activeParagraphId={currentParagraphId}
          activeParagraphIndex={currentParagraphIndex}
          totalParagraphCount={totalParagraphCount}
          canGoPrevious={!isFirstParagraph}
          canGoNext={!isLastParagraph}
          isMobile={isMobilePanel}
          article={article}
          lookupableWords={lookupableWords}
          onContinueToReview={goToReviewFromReading}
          onPreviousParagraph={goToPreviousParagraph}
          onNextParagraph={goToNextParagraph}
          onExplainRequest={handleLookupWord}
          onOpenMobileAssist={(input) => {
            setMobileAssistState({
              ...input,
              suggestions: getPhraseSuggestionsForWord({
                article,
                sentenceId: input.sentenceId,
                sentenceText: input.sentenceText,
                selectedWord: input.selectedText,
              }),
            });
          }}
          onSelectionNotice={showSelectionNotice}
        />
      );
    }

    return (
      <ReviewPanel
        article={article}
        nextArticleSlug={navigation.nextArticle?.slug}
        savedWords={savedWords}
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
      <ProgressBar currentStage={currentStage} />

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
            <Link href="/words" style={navLinkStyle}>
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
            display: 'flex',
            justifyContent: 'flex-start',
            gap: 12,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <StageNav currentStage={currentStage} onSelectStage={selectStage} />
          <span style={{ color: 'var(--muted)', fontSize: 14 }}>
            {uiCopy.reader.navigation.currentStage(getStageLabel(currentStage))}
          </span>
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
            restoredProgress.paragraphId,
          )}
        </div>
      ) : null}

      {selectionNotice ? (
        <ErrorState
          eyebrow={uiCopy.reader.explainPanel.wordTitle}
          title={selectionNotice}
          description="缩短选区后再试就行。"
        />
      ) : null}

      <div style={{ width: 'min(100%, 920px)' }}>{renderStage()}</div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={goBack}
          disabled={currentStage === 'intro'}
          style={{
            borderRadius: 999,
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            color: currentStage === 'intro' ? '#a8a29e' : 'var(--foreground)',
            padding: '12px 18px',
            fontWeight: 600,
            cursor: currentStage === 'intro' ? 'not-allowed' : 'pointer',
          }}
        >
          {uiCopy.common.previous}
        </button>
        <button
          type="button"
          onClick={goNext}
          disabled={currentStage === 'review'}
          style={{
            borderRadius: 999,
            border: 'none',
            background: currentStage === 'review' ? '#e7e5e4' : 'var(--accent)',
            color: '#fff',
            padding: '12px 18px',
            fontWeight: 700,
            cursor: currentStage === 'review' ? 'not-allowed' : 'pointer',
          }}
        >
          {uiCopy.common.next}
        </button>
      </div>

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
          onToggleSave={toggleSavedWord}
          saved={selectedWordSaved}
          saveEnabled={
            explainPanelState.status === 'success' &&
            Boolean(explainPanelState.data.saveWord)
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
          onToggleSave={toggleSavedWord}
          saved={selectedWordSaved}
          saveEnabled={
            explainPanelState.status === 'success' &&
            Boolean(explainPanelState.data.saveWord)
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

      {isMobilePanel && mobileAssistState ? (
        <MobileExplainAssist
          word={mobileAssistState.selectedText}
          suggestions={mobileAssistState.suggestions}
          onClose={() => setMobileAssistState(null)}
          onExplainWord={() => {
            void handleLookupWord({
              mode: 'word',
              selectedText: mobileAssistState.selectedText,
              sentenceId: mobileAssistState.sentenceId,
              sentenceText: mobileAssistState.sentenceText,
            });
          }}
          onExplainPhrase={(text) => {
            void handleLookupWord({
              mode: 'phrase',
              selectedText: text,
              sentenceId: mobileAssistState.sentenceId,
              sentenceText: mobileAssistState.sentenceText,
            });
          }}
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
