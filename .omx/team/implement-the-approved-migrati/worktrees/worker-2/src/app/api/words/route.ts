import { getCurrentUser } from '@/features/auth/current-user';
import {
  deleteWordForUser,
  listSavedWordsForUser,
  saveWordForUser,
  type ServerSavedWordRecord,
} from '@/features/words/server-saved-word-service';

function unauthorizedResponse() {
  return Response.json({ error: 'Authentication required' }, { status: 401 });
}

export async function GET(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const articleSlug = searchParams.get('articleSlug') ?? undefined;

  return Response.json(await listSavedWordsForUser(user.id, articleSlug));
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorizedResponse();
  }

  const body = (await request.json()) as ServerSavedWordRecord;
  return Response.json(await saveWordForUser({ ...body, userId: user.id }));
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return unauthorizedResponse();
  }

  const body = (await request.json()) as {
    articleSlug?: string;
    lemma?: string;
  };

  if (!body.articleSlug || !body.lemma) {
    return Response.json(
      { error: 'articleSlug and lemma are required' },
      { status: 400 },
    );
  }

  return Response.json({
    ok: await deleteWordForUser({
      articleSlug: body.articleSlug,
      lemma: body.lemma,
      userId: user.id,
    }),
  });
}
