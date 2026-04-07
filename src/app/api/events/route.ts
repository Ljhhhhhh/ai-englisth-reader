import { cookies } from 'next/headers';
import type { LearningEventRecord } from '@/features/analytics/event-service';

const EVENTS_COOKIE = 'ai-english-read-learning-events-cookie';

async function readEventCookie() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(EVENTS_COOKIE)?.value;

  if (!raw) {
    return [] as LearningEventRecord[];
  }

  try {
    return JSON.parse(raw) as LearningEventRecord[];
  } catch {
    return [] as LearningEventRecord[];
  }
}

async function writeEventCookie(events: LearningEventRecord[]) {
  const cookieStore = await cookies();
  cookieStore.set(EVENTS_COOKIE, JSON.stringify(events), {
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

  const events = await readEventCookie();
  return Response.json(events.filter((event) => event.deviceId === deviceId));
}

export async function POST(request: Request) {
  const body = (await request.json()) as LearningEventRecord;
  const events = await readEventCookie();
  const nextEvent = {
    ...body,
    createdAt: body.createdAt ?? Date.now(),
  };

  events.push(nextEvent);
  await writeEventCookie(events);
  return Response.json(nextEvent);
}
