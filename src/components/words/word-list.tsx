'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { EmptyState } from '@/components/system/empty-state';
import { getOrCreateDeviceId } from '@/lib/device-id';
import {
  listSavedWordsByArticle,
  type SavedWordsByArticleGroup,
} from '@/features/words/saved-word-service';

export function WordList() {
  const [groups, setGroups] = useState<SavedWordsByArticleGroup[]>([]);
  const [query, setQuery] = useState('');
  const [articleFilter, setArticleFilter] = useState('all');

  useEffect(() => {
    const storage = window.localStorage;
    const deviceId = getOrCreateDeviceId(storage);

    queueMicrotask(() => {
      setGroups(listSavedWordsByArticle(deviceId, storage));
    });
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
          placeholder="Search by lemma or meaning"
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
          <option value="all">All articles</option>
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
                    {word.phonetic ? ` · ${word.phonetic}` : ''}
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
                </article>
              ))}
            </div>
          </section>
        ))
      ) : (
        <EmptyState
          eyebrow="No saved words yet"
          title="Your word notebook starts after the first lookup you keep."
          description="Read one article, save a few words, and they will appear here grouped by article with the source sentence attached."
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
            Browse articles
          </Link>
        </EmptyState>
      )}
    </section>
  );
}
