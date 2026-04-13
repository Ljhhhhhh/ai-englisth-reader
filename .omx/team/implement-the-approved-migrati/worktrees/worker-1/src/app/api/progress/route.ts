import { z } from 'zod';

import { getCurrentUser } from '@/features/auth/current-user';
import {
  getReaderProgress,
  listRecentReaderProgress,
  saveReaderProgress,
} from '@/features/reader/server-progress-service';

const saveProgressSchema = z.object({
  articleSlug: z.string().min(1),
  currentStage: z.string().min(1),
  isCompleted: z.boolean().default(false),
});

function unauthorizedResponse() {
  return Response.json({ error: 'Authentication required' }, { status: 401 });
}

export async function GET(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const articleSlug = searchParams.get('articleSlug');

  if (articleSlug) {
    return Response.json(await getReaderProgress(user.id, articleSlug));
  }

  return Response.json(await listRecentReaderProgress(user.id));
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const body = saveProgressSchema.parse(await request.json());
    return Response.json(
      await saveReaderProgress({
        ...body,
        userId: user.id,
      }),
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Invalid progress' },
      { status: 400 },
    );
  }
}
