import { getCurrentUser } from '@/features/auth/current-user';
import { recordLearningEvent } from '@/features/analytics/server-event-service';

function unauthorizedResponse() {
  return Response.json({ error: 'Authentication required' }, { status: 401 });
}

export async function GET(request: Request) {
  void request;
  const user = await getCurrentUser();
  if (!user) {
    return unauthorizedResponse();
  }
  return Response.json([]);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return unauthorizedResponse();
  }

  const body = (await request.json()) as {
    articleSlug?: string;
    payload?: Record<string, string | number | boolean | null>;
    type: string;
  };

  return Response.json(
    await recordLearningEvent({
      articleSlug: body.articleSlug,
      payload: body.payload,
      type: body.type,
      userId: user.id,
    }),
  );
}
