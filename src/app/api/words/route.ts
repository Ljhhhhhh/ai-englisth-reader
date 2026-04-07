import { cookies } from 'next/headers';
import type { SavedWordRecord } from '@/features/words/saved-word-service';

const SAVED_WORDS_COOKIE = 'ai-english-read-saved-words-cookie';

async function readSavedWordsFromCookie() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SAVED_WORDS_COOKIE)?.value;

  if (!raw) {
    return [] as SavedWordRecord[];
  }

  try {
    return JSON.parse(raw) as SavedWordRecord[];
  } catch {
    return [] as SavedWordRecord[];
  }
}

async function writeSavedWordsToCookie(records: SavedWordRecord[]) {
  const cookieStore = await cookies();
  cookieStore.set(SAVED_WORDS_COOKIE, JSON.stringify(records), {
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
    sameSite: 'lax',
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const deviceId = searchParams.get('deviceId');

  if (!deviceId) {
    return Response.json({ error: 'deviceId is required' }, { status: 400 });
  }

  const records = await readSavedWordsFromCookie();
  return Response.json(
    records.filter((record) => record.deviceId === deviceId),
  );
}

export async function POST(request: Request) {
  const body = (await request.json()) as SavedWordRecord;
  const records = await readSavedWordsFromCookie();
  const existingIndex = records.findIndex(
    (record) =>
      record.deviceId === body.deviceId &&
      record.articleSlug === body.articleSlug &&
      record.lemma.toLowerCase() === body.lemma.toLowerCase(),
  );

  const nextRecord = {
    ...body,
    savedAt: body.savedAt ?? Date.now(),
  };

  if (existingIndex >= 0) {
    records[existingIndex] = nextRecord;
  } else {
    records.push(nextRecord);
  }

  await writeSavedWordsToCookie(records);
  return Response.json(nextRecord);
}

export async function DELETE(request: Request) {
  const body = (await request.json()) as {
    articleSlug?: string;
    deviceId?: string;
    lemma?: string;
  };

  if (!body.deviceId || !body.articleSlug || !body.lemma) {
    return Response.json(
      { error: 'deviceId, articleSlug, and lemma are required' },
      { status: 400 },
    );
  }

  const { articleSlug, deviceId, lemma } = body;

  const records = await readSavedWordsFromCookie();
  const nextRecords = records.filter(
    (record) =>
      !(
        record.deviceId === deviceId &&
        record.articleSlug === articleSlug &&
        record.lemma.toLowerCase() === lemma.toLowerCase()
      ),
  );

  await writeSavedWordsToCookie(nextRecords);
  return Response.json({ ok: true });
}
