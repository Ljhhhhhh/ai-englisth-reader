import GeneratePageClient from '@/components/generate/generate-page-client';
import { requirePageSession } from '@/features/auth/page-guard';

export default async function GeneratePage() {
  await requirePageSession('/generate');

  return <GeneratePageClient />;
}
