'use client';

import { useEffect, useRef, useState } from 'react';
import { ArticleBody } from '@/components/reader/article-body';
import { IntroPanel } from '@/components/reader/intro-panel';
import { ProgressBar } from '@/components/reader/progress-bar';
import { QuizPanel } from '@/components/reader/quiz-panel';
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
  loadQuizAttempt,
  submitQuizForArticle,
  type QuizAttemptRecord,
} from '@/features/quiz/quiz-service';
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

type ReaderShellProps = {
  article: Article;
};

type LookupRequest = {
  sentenceId: string;
  surface: string;
};

type ProgressDraft = {
  articleSlug: string;
  currentStage: ReaderStage;
  deviceId: string;
  paragraphId?: string;
  quizStarted: boolean;
  quizSubmitted: boolean;
};

function getDefaultParagraphId(article: Article) {
  return article.paragraphs[0]?.id;
}

function shouldFailOnce(consumedFlags: Record<string, boolean>, key: string) {
  const searchParams = new URLSearchParams(window.location.search);
  if (searchParams.get(key) !== 'once' || consumedFlags[key]) {
    return false;
  }

  consumedFlags[key] = true;
  return true;
}

export function ReaderShell({ article }: ReaderShellProps) {
  const consumedFailureFlagsRef = useRef<Record<string, boolean>>({});
  const [isMobilePanel, setIsMobilePanel] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [currentStage, setCurrentStage] = useState<ReaderStage>('intro');
  const [currentParagraphId, setCurrentParagraphId] = useState<
    string | undefined
  >(getDefaultParagraphId(article));
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [restoredProgress, setRestoredProgress] =
    useState<ReaderProgressRecord | null>(null);
  const [selectedWord, setSelectedWord] = useState<WordLookupResult | null>(
    null,
  );
  const [savedLemmas, setSavedLemmas] = useState<string[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizAttempt, setQuizAttempt] = useState<QuizAttemptRecord | null>(
    null,
  );
  const [lookupError, setLookupError] = useState<string | null>(null);
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
    const existingQuizAttempt = loadQuizAttempt(
      nextDeviceId,
      article.slug,
      storage,
    );

    queueMicrotask(() => {
      setDeviceId(nextDeviceId);
      setSavedLemmas(savedWords.map((word) => word.lemma.toLowerCase()));
      setQuizAnswers(
        existingQuizAttempt?.answers ?? new Array(article.quiz.length).fill(-1),
      );
      setQuizAttempt(existingQuizAttempt);
      setQuizSubmitted(existing?.quizSubmitted ?? Boolean(existingQuizAttempt));

      if (existing) {
        setCurrentStage(existing.currentStage);
        setCurrentParagraphId(
          existing.paragraphId ?? getDefaultParagraphId(article),
        );
        setQuizStarted(existing.quizStarted);
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

    const nextDraft: ProgressDraft = {
      articleSlug: article.slug,
      currentStage,
      deviceId,
      paragraphId: currentParagraphId,
      quizStarted,
      quizSubmitted,
    };

    try {
      if (
        shouldFailOnce(consumedFailureFlagsRef.current, 'mockProgressSaveError')
      ) {
        throw new Error('mock progress save failure');
      }

      saveProgress(nextDraft, window.localStorage);
      setProgressSaveNotice(null);
    } catch {
      setProgressSaveNotice(
        'Could not sync reading progress just yet. Your current place stays on screen and we will retry automatically.',
      );
    }
  }, [
    article.slug,
    currentParagraphId,
    currentStage,
    deviceId,
    hydrated,
    quizStarted,
    quizSubmitted,
  ]);

  function selectStage(stage: ReaderStage) {
    setCurrentStage(stage);

    if ((stage === 'quiz' || stage === 'review') && !quizStarted) {
      setQuizStarted(true);

      if (deviceId) {
        recordEvent(
          {
            articleSlug: article.slug,
            deviceId,
            type: 'quiz_started',
          },
          window.localStorage,
        );
      }
    }

    if (stage === 'read' && !currentParagraphId) {
      setCurrentParagraphId(getDefaultParagraphId(article));
    }
  }

  function goNext() {
    selectStage(getNextStage(currentStage));
  }

  function goBack() {
    selectStage(getPreviousStage(currentStage));
  }

  function handleLookupWord(input: LookupRequest) {
    setLastLookupRequest(input);

    try {
      if (shouldFailOnce(consumedFailureFlagsRef.current, 'mockLookupError')) {
        throw new Error('mock lookup failure');
      }

      const nextWord = lookupWordFromArticle({
        article,
        sentenceId: input.sentenceId,
        surface: input.surface,
      });

      setLookupError(null);
      setSelectedWord(nextWord);

      if (deviceId) {
        recordEvent(
          {
            articleSlug: article.slug,
            deviceId,
            payload: { lemma: nextWord.lemma },
            type: 'word_lookup_opened',
          },
          window.localStorage,
        );
      }
    } catch {
      setSelectedWord(null);
      setLookupError(
        'Word lookup is temporarily unavailable. Retry once to keep reading without losing your place.',
      );
    }
  }

  function closeWordPanel() {
    setSelectedWord(null);
  }

  function toggleSavedWord() {
    if (!deviceId || !selectedWord) {
      return;
    }

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
          meaning: selectedWord.meaning,
          phonetic: selectedWord.phonetic,
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
      setSaveWordError(
        'Could not save this word right now. Retry once and your reading position will stay where it is.',
      );
    }
  }

  function handleSelectAnswer(questionIndex: number, choiceIndex: number) {
    setQuizAnswers((current) => {
      const nextAnswers = [...current];
      nextAnswers[questionIndex] = choiceIndex;
      return nextAnswers;
    });
  }

  function handleSubmitQuiz() {
    if (!deviceId) {
      return;
    }

    const nextAttempt = submitQuizForArticle({
      answers: quizAnswers,
      article,
      deviceId,
      storage: window.localStorage,
    });

    setQuizAttempt(nextAttempt);
    setQuizStarted(true);
    setQuizSubmitted(true);
    recordEvent(
      {
        articleSlug: article.slug,
        deviceId,
        payload: { score: nextAttempt.score },
        type: 'quiz_submitted',
      },
      window.localStorage,
    );

    saveProgress(
      {
        articleSlug: article.slug,
        currentStage: 'review',
        deviceId,
        paragraphId: currentParagraphId,
        quizStarted: true,
        quizSubmitted: true,
      },
      window.localStorage,
    );

    if (
      !hasEvent(
        {
          articleSlug: article.slug,
          deviceId,
          type: 'article_completed',
        },
        window.localStorage,
      )
    ) {
      recordEvent(
        {
          articleSlug: article.slug,
          deviceId,
          payload: { score: nextAttempt.score },
          type: 'article_completed',
        },
        window.localStorage,
        { oncePerArticle: true },
      );
    }

    setCurrentStage('review');
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

  const selectedWordSaved = selectedWord
    ? savedLemmas.includes(selectedWord.lemma.toLowerCase())
    : false;
  const savedWords = deviceId
    ? listSavedWords(deviceId, window.localStorage, article.slug)
    : [];
  const reviewUnlocked = Boolean(quizAttempt?.reviewUnlocked);

  function renderStage() {
    if (currentStage === 'intro') {
      return <IntroPanel article={article} onStartReading={startReading} />;
    }

    if (currentStage === 'read') {
      return (
        <ArticleBody
          activeParagraphId={currentParagraphId}
          article={article}
          lookupableWords={lookupableWords}
          onContinueToQuiz={() => selectStage('quiz')}
          onFocusParagraph={setCurrentParagraphId}
          onLookupWord={handleLookupWord}
        />
      );
    }

    if (currentStage === 'quiz') {
      return (
        <QuizPanel
          answers={quizAnswers}
          article={article}
          onSelectAnswer={handleSelectAnswer}
          onSubmitQuiz={handleSubmitQuiz}
          quizAttempt={quizAttempt}
        />
      );
    }

    return (
      <ReviewPanel
        article={article}
        quizAttempt={quizAttempt}
        reviewUnlocked={reviewUnlocked}
        savedWords={savedWords}
      />
    );
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        padding:
          isMobilePanel && selectedWord ? '32px 20px 320px' : '32px 20px 72px',
        display: 'grid',
        gap: 20,
      }}
    >
      <ProgressBar currentStage={currentStage} />

      <section
        style={{
          display: 'grid',
          gap: 20,
          alignItems: 'start',
          gridTemplateColumns: isMobilePanel
            ? 'minmax(0, 1fr)'
            : 'minmax(0, 1fr) 320px',
        }}
      >
        <div style={{ display: 'grid', gap: 16 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <StageNav currentStage={currentStage} onSelectStage={selectStage} />
            <div style={{ color: 'var(--muted)', fontSize: 14 }}>
              Current stage: {getStageLabel(currentStage)}
            </div>
          </div>

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
              Resume ready: {restoredProgress.currentStage}
              {restoredProgress.paragraphId
                ? ` · ${restoredProgress.paragraphId}`
                : ''}
            </div>
          ) : null}

          {lookupError ? (
            <ErrorState
              eyebrow="Lookup retry"
              title="Inline word lookup missed once."
              description={lookupError}
            >
              <button
                type="button"
                onClick={() => {
                  if (lastLookupRequest) {
                    handleLookupWord(lastLookupRequest);
                  }
                }}
                style={{
                  borderRadius: 999,
                  border: 'none',
                  background: 'var(--accent)',
                  color: '#fff',
                  padding: '12px 18px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Retry lookup
              </button>
            </ErrorState>
          ) : null}

          <div style={{ width: isMobilePanel ? '100%' : 'min(100%, 920px)' }}>
            {renderStage()}
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={goBack}
              disabled={currentStage === 'intro'}
              style={{
                borderRadius: 999,
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color:
                  currentStage === 'intro' ? '#a8a29e' : 'var(--foreground)',
                padding: '12px 18px',
                fontWeight: 600,
                cursor: currentStage === 'intro' ? 'not-allowed' : 'pointer',
              }}
            >
              Back
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={currentStage === 'review'}
              style={{
                borderRadius: 999,
                border: 'none',
                background:
                  currentStage === 'review' ? '#e7e5e4' : 'var(--accent)',
                color: '#fff',
                padding: '12px 18px',
                fontWeight: 700,
                cursor: currentStage === 'review' ? 'not-allowed' : 'pointer',
              }}
            >
              Next
            </button>
          </div>

          {!hydrated ? (
            <p style={{ margin: 0, color: 'var(--muted)' }}>
              Restoring device progress...
            </p>
          ) : null}
        </div>

        {!isMobilePanel && selectedWord ? (
          <WordPanelDesktop
            errorMessage={saveWordError}
            onClose={closeWordPanel}
            onToggleSave={toggleSavedWord}
            saved={selectedWordSaved}
            word={selectedWord}
          />
        ) : (
          <div
            style={{
              display: isMobilePanel ? 'none' : 'grid',
              gap: 12,
              padding: 20,
              borderRadius: 24,
              border: '1px dashed var(--border)',
              background: 'rgba(255, 253, 248, 0.75)',
              color: 'var(--muted)',
              position: 'sticky',
              top: 84,
              alignSelf: 'start',
            }}
          >
            <strong>Tap highlighted words</strong>
            <span>
              The explanation panel stays beside the article on desktop so the
              active sentence remains visible.
            </span>
          </div>
        )}
      </section>

      {isMobilePanel && selectedWord ? (
        <WordPanelMobile
          errorMessage={saveWordError}
          onClose={closeWordPanel}
          onToggleSave={toggleSavedWord}
          saved={selectedWordSaved}
          word={selectedWord}
        />
      ) : null}
    </main>
  );
}
