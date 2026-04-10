'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { EmptyState } from '@/components/system/empty-state';
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

export function WordList() {
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
        meaning: word.meaning,
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
          word.meaning.toLowerCase().includes(keyword) ||
          word.surface.toLowerCase().includes(keyword);

        return matchesArticle && matchesQuery;
      }),
    }))
    .filter((group) => group.words.length > 0);

  return (
    <section style={{ display: 'grid', gap: 20 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={uiCopy.words.actions.searchPlaceholder}
          style={{
            minWidth: 240,
            padding: '12px 14px',
            borderRadius: 16,
            border: '1px solid var(--border)',
            background: '#fff',
          }}
        />
        <select
          value={articleFilter}
          onChange={(event) => setArticleFilter(event.target.value)}
          style={{
            minWidth: 220,
            padding: '12px 14px',
            borderRadius: 16,
            border: '1px solid var(--border)',
            background: '#fff',
          }}
        >
          <option value="all">{uiCopy.words.actions.filterAll}</option>
          {groups.map((group) => (
            <option key={group.articleSlug} value={group.articleSlug}>
              {group.articleTitle}
            </option>
          ))}
        </select>
      </div>

      {filteredGroups.length ? (
        filteredGroups.map((group) => (
          <section key={group.articleSlug} style={{ display: 'grid', gap: 12 }}>
            <h2 style={{ margin: 0 }}>{group.articleTitle}</h2>
            <div style={{ display: 'grid', gap: 12 }}>
              {group.words.map((word) => (
                <article
                  key={`${group.articleSlug}-${word.lemma}`}
                  style={{
                    padding: 18,
                    borderRadius: 20,
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <strong>{word.surface}</strong>
                  <div style={{ color: 'var(--muted)', marginTop: 6 }}>
                    {word.lemma} · {word.meaning}
                  </div>
                  <p
                    style={{
                      marginBottom: 0,
                      color: 'var(--muted)',
                      lineHeight: 1.7,
                    }}
                  >
                    {word.sourceSentence}
                  </p>
                  <div style={{ marginTop: 14 }}>
                    <button
                      type="button"
                      onClick={() => handleRememberWord(group, word.lemma)}
                      style={{
                        borderRadius: 999,
                        border: 'none',
                        background: '#7c5a3c',
                        color: '#fff',
                        fontWeight: 700,
                        padding: '10px 14px',
                        cursor: 'pointer',
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
        <EmptyState
          eyebrow={uiCopy.words.empty.eyebrow}
          title={uiCopy.words.empty.title}
          description={uiCopy.words.empty.description}
        >
          <Link
            href="/"
            style={{
              width: 'fit-content',
              padding: '12px 18px',
              borderRadius: 999,
              background: 'var(--accent)',
              color: '#fff',
              fontWeight: 700,
            }}
          >
            {uiCopy.words.actions.browseArticles}
          </Link>
        </EmptyState>
      )}
    </section>
  );
}
