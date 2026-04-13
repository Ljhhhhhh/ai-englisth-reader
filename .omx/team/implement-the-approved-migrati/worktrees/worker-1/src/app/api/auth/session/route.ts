import { getCurrentUser } from '@/features/auth/current-user';

export async function GET() {
  const user = await getCurrentUser();

  return Response.json({
    authenticated: Boolean(user),
    user: user
      ? {
          email: user.email,
          id: user.id,
        }
      : null,
  });
}
