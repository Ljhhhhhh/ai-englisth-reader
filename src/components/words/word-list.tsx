'use client';

import * as Select from '@radix-ui/react-select';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  isItemRemembered,
  rememberItem,
} from '@/features/words/remembered-item-service';
import {
  listSavedWordsByArticle,
  unsaveWord,
  type SavedWordsByArticleGroup,
} from '@/features/words/saved-word-service';
import { getOrCreateDeviceId } from '@/lib/device-id';
import { uiCopy } from '@/lib/ui-copy';

type WordListProps = {
  backHref: string;
  backLabel: string;
};

export function WordList({
  backHref = '/',
  backLabel = uiCopy.words.actions.backHome,
}: Partial<WordListProps>) {
  const [groups, setGroups] = useState<SavedWordsByArticleGroup[]>([]);
  const [query, setQuery] = useState('');
  const [articleFilter, setArticleFilter] = useState('all');

  function loadGroups() {
    const storage = window.localStorage;
    const deviceId = getOrCreateDeviceId(storage);

    const nextGroups = listSavedWordsByArticle(deviceId, storage)
      .map((group) => ({
        ...group,
        words: group.words.filter(
          (word) =>
            !isItemRemembered(
              {
                deviceId,
                term: word.lemma,
                type: 'word',
              },
              storage,
            ),
        ),
      }))
      .filter((group) => group.words.length > 0);

    setGroups(nextGroups);
  }

  function handleRememberWord(group: SavedWordsByArticleGroup, lemma: string) {
    const storage = window.localStorage;
    const deviceId = getOrCreateDeviceId(storage);
    const word = group.words.find((item) => item.lemma === lemma);

    if (!word) {
      return;
    }

    rememberItem(
      {
        deviceId,
        displayText: word.surface,
        meaning: word.chineseMeaning,
        savedFromArticleSlug: word.articleSlug,
        savedFromArticleTitle: word.articleTitle,
        term: word.lemma,
        type: 'word',
      },
      storage,
    );
    unsaveWord(
      {
        articleSlug: word.articleSlug,
        deviceId,
        lemma: word.lemma,
      },
      storage,
    );
    loadGroups();
  }

  useEffect(() => {
    queueMicrotask(() => loadGroups());
  }, []);

  const filteredGroups = groups
    .map((group) => ({
      ...group,
      words: group.words.filter((word) => {
        const matchesArticle =
          articleFilter === 'all' || group.articleSlug === articleFilter;
        const keyword = query.trim().toLowerCase();
        const matchesQuery =
          !keyword ||
          word.lemma.toLowerCase().includes(keyword) ||
          word.surface.toLowerCase().includes(keyword) ||
          word.chineseMeaning.toLowerCase().includes(keyword) ||
          word.memoryHook.toLowerCase().includes(keyword) ||
          word.usageExample.toLowerCase().includes(keyword);

        return matchesArticle && matchesQuery;
      }),
    }))
    .filter((group) => group.words.length > 0);

  return (
    <section style={{ display: 'grid', gap: 28 }}>
      <div style={{ display: 'grid', gap: 6, paddingBottom: 4 }}>
        <p
          style={{
            margin: 0,
            color: 'var(--accent)',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          {uiCopy.words.page.eyebrow}
        </p>
        <h1
          style={{
            margin: 0,
            fontSize: 'clamp(1.75rem, 3vw, 2.5rem)',
            lineHeight: 1.08,
          }}
        >
          {uiCopy.words.page.title}
        </h1>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          alignItems: 'center',
        }}
      >
        {/* 搜索框 */}
        <div
          style={{
            position: 'relative',
            flex: '1 1 220px',
            minWidth: 0,
          }}
        >
          <svg
            aria-hidden
            viewBox="0 0 16 16"
            style={{
              position: 'absolute',
              left: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 15,
              height: 15,
              color: 'var(--muted)',
              pointerEvents: 'none',
              flexShrink: 0,
            }}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="6.5" cy="6.5" r="4.5" />
            <line x1="10.5" y1="10.5" x2="14" y2="14" />
          </svg>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={uiCopy.words.actions.searchPlaceholder}
            style={{
              width: '100%',
              height: 44,
              padding: '0 14px 0 38px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--foreground)',
              fontSize: 14,
              outline: 'none',
              transition: 'border-color 0.15s',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
            }}
          />
        </div>

        {/* 文章筛选 */}
        <Select.Root value={articleFilter} onValueChange={setArticleFilter}>
          <Select.Trigger
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              height: 44,
              padding: '0 12px 0 14px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--foreground)',
              fontSize: 14,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              outline: 'none',
              minWidth: 120,
              justifyContent: 'space-between',
              transition: 'border-color 0.15s',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
            }}
          >
            <Select.Value />
            <Select.Icon asChild>
              <svg
                viewBox="0 0 10 6"
                width={10}
                height={6}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: 'var(--muted)', flexShrink: 0 }}
              >
                <path d="M1 1l4 4 4-4" />
              </svg>
            </Select.Icon>
          </Select.Trigger>

          <Select.Portal>
            <Select.Content
              position="popper"
              sideOffset={6}
              style={{
                minWidth: 'var(--radix-select-trigger-width)',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
                zIndex: 50,
                overflow: 'hidden',
              }}
            >
              <Select.Viewport style={{ padding: 4 }}>
                <Select.Item
                  value="all"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    height: 36,
                    padding: '0 10px',
                    borderRadius: 7,
                    fontSize: 14,
                    cursor: 'pointer',
                    outline: 'none',
                    userSelect: 'none',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(197,106,45,0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <Select.ItemText>
                    {uiCopy.words.actions.filterAll}
                  </Select.ItemText>
                </Select.Item>
                {groups.map((group) => (
                  <Select.Item
                    key={group.articleSlug}
                    value={group.articleSlug}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      height: 36,
                      padding: '0 10px',
                      borderRadius: 7,
                      fontSize: 14,
                      cursor: 'pointer',
                      outline: 'none',
                      userSelect: 'none',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background =
                        'rgba(197,106,45,0.08)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <Select.ItemText>{group.articleTitle}</Select.ItemText>
                  </Select.Item>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      </div>

      {filteredGroups.length ? (
        filteredGroups.map((group) => (
          <section
            key={group.articleSlug}
            style={{
              display: 'grid',
              gap: 16,
              padding: '22px clamp(18px, 3vw, 28px)',
              borderRadius: 28,
              border: '1px solid rgba(197, 106, 45, 0.16)',
              background: 'rgba(255, 252, 247, 0.84)',
            }}
          >
            <div style={{ display: 'grid', gap: 6 }}>
              <p
                style={{
                  margin: 0,
                  color: 'var(--accent)',
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                }}
              >
                文章分组
              </p>
              <h2 style={{ margin: 0, fontSize: 'clamp(1.5rem, 2.2vw, 2rem)' }}>
                {group.articleTitle}
              </h2>
            </div>
            <div style={{ display: 'grid', gap: 14 }}>
              {group.words.map((word) => (
                <article
                  key={`${group.articleSlug}-${word.lemma}`}
                  style={{
                    display: 'grid',
                    gap: 10,
                    padding: '20px clamp(18px, 2vw, 22px)',
                    borderRadius: 24,
                    background:
                      'linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(253,248,240,0.92) 100%)',
                    border: '1px solid rgba(197, 106, 45, 0.12)',
                    boxShadow: '0 10px 24px rgba(116, 89, 52, 0.05)',
                  }}
                >
                  <div style={{ display: 'grid', gap: 6 }}>
                    <strong style={{ fontSize: 22, lineHeight: 1.2 }}>
                      {word.surface}
                    </strong>
                    <div style={{ color: 'var(--muted)' }}>
                      {word.lemma}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gap: 10 }}>
                    <div style={{ display: 'grid', gap: 4 }}>
                      <strong style={{ fontSize: 13 }}>
                        {uiCopy.reader.explainPanel.wordMeaning}
                      </strong>
                      <div style={{ color: 'var(--muted)', lineHeight: 1.7 }}>
                        {word.chineseMeaning}
                      </div>
                    </div>
                    <div style={{ display: 'grid', gap: 4 }}>
                      <strong style={{ fontSize: 13 }}>
                        {uiCopy.reader.explainPanel.wordMemory}
                      </strong>
                      <div style={{ color: 'var(--muted)', lineHeight: 1.7 }}>
                        {word.memoryHook}
                      </div>
                    </div>
                    <div style={{ display: 'grid', gap: 4 }}>
                      <strong style={{ fontSize: 13 }}>
                        {uiCopy.reader.explainPanel.wordUsage}
                      </strong>
                      <div style={{ color: 'var(--muted)', lineHeight: 1.7 }}>
                        {word.usageExample}
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'inline-flex',
                      width: 'fit-content',
                      alignItems: 'center',
                      padding: '6px 10px',
                      borderRadius: 999,
                      background: 'rgba(197, 106, 45, 0.1)',
                      color: 'var(--editorial-ink)',
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                    }}
                  >
                    原句
                  </div>
                  <p
                    style={{
                      margin: 0,
                      color: 'var(--muted)',
                      lineHeight: 1.8,
                    }}
                  >
                    {word.sourceSentence}
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-start',
                      paddingTop: 4,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleRememberWord(group, word.lemma)}
                      style={{
                        borderRadius: 999,
                        border: '1px solid rgba(197, 106, 45, 0.18)',
                        background: 'var(--accent)',
                        color: '#fff',
                        fontWeight: 700,
                        padding: '11px 16px',
                        cursor: 'pointer',
                        boxShadow: '0 10px 20px rgba(197, 106, 45, 0.18)',
                      }}
                    >
                      {uiCopy.words.actions.markRemembered}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))
      ) : (
        <section
          style={{
            display: 'grid',
            gap: 18,
            padding: '28px clamp(20px, 4vw, 36px)',
            borderRadius: 30,
            border: '1px dashed rgba(197, 106, 45, 0.26)',
            background:
              'linear-gradient(180deg, rgba(255, 252, 246, 0.96) 0%, rgba(247, 240, 229, 0.92) 100%)',
          }}
        >
          <div style={{ display: 'grid', gap: 10, maxWidth: 820 }}>
            <p
              style={{
                margin: 0,
                color: 'var(--accent)',
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              {uiCopy.words.empty.eyebrow}
            </p>
            <h2
              style={{
                margin: 0,
                maxWidth: 760,
                fontSize: 'clamp(1.65rem, 3.1vw, 2.5rem)',
                lineHeight: 1.2,
              }}
            >
              {uiCopy.words.empty.title}
            </h2>
            <p
              style={{
                margin: 0,
                color: 'var(--muted)',
                lineHeight: 1.8,
                fontSize: 'clamp(1rem, 1.3vw, 1.1rem)',
              }}
            >
              {uiCopy.words.empty.description}
            </p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <Link
              href={backHref}
              style={{
                width: 'fit-content',
                padding: '12px 18px',
                borderRadius: 999,
                background: 'var(--accent)',
                color: '#fff',
                fontWeight: 700,
                boxShadow: '0 10px 20px rgba(197, 106, 45, 0.18)',
              }}
            >
              {backLabel}
            </Link>
          </div>
        </section>
      )}
    </section>
  );
}
