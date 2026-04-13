import { LoginPageClient } from '@/components/auth/login-page-client';
import { redirectAuthenticatedUser } from '@/features/auth/page-guard';
import { getSafeRedirectPath } from '@/features/auth/redirect-target';

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readFirstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const nextPath = getSafeRedirectPath(
    readFirstParam(resolvedSearchParams?.next),
  );
  await redirectAuthenticatedUser(nextPath);

  return <LoginPageClient nextPath={nextPath} />;
}
