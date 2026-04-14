import {
  extractContent,
  type ExtractContentInput,
} from '@/features/generation/extract-content';
import { getCurrentUser } from '@/features/auth/current-user';
import {
  createGenerationJob,
  startOrResumeGenerationJob,
} from '@/features/generation/generation-job-service';
import { appendGenerationLog } from '@/features/generation/generation-logger';
import { randomUUID } from 'node:crypto';

function getStringValue(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim() : '';
}

function parseGenerationInput(formData: FormData): ExtractContentInput {
  const url = getStringValue(formData.get('url'));

  if (url) {
    return {
      type: 'url',
      url,
    };
  }

  const file = formData.get('file');

  if (file instanceof File && file.size > 0) {
    return {
      type: 'file',
      file,
    };
  }

  throw new Error('请提供链接或上传文件。');
}

function slugify(input: string) {
  const ascii = input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return ascii || 'generated-reading';
}

function reserveArticleSlug(titleHint: string, source: string, jobId: string) {
  const slugBase = slugify(titleHint || source);
  return `${slugBase}-${jobId.slice(0, 6)}`;
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return Response.json(
        { error: '请先登录后再生成文章。' },
        { status: 401 },
      );
    }

    const formData = await request.formData();

    const input = parseGenerationInput(formData);
    const sourceRef = input.type === 'url' ? input.url : input.file.name;
    const extracted = await extractContent(input);
    const id = randomUUID();
    const job = await createGenerationJob({
      canonicalSource: extracted.source,
      canonicalText: extracted.text,
      canonicalTitleHint: extracted.titleHint,
      id,
      reservedArticleSlug: reserveArticleSlug(
        extracted.titleHint,
        extracted.source,
        id,
      ),
      sourceRef,
      sourceType: input.type,
      userId: user.id,
    });
    await appendGenerationLog({
      event: 'job_created',
      jobId: job.id,
      payload: {
        sourceRef,
        sourceType: input.type,
        titleHint: extracted.titleHint,
        triggeredBy: 'route:create',
      },
      userId: user.id,
    });

    void startOrResumeGenerationJob({
      jobId: job.id,
      triggeredBy: `create:${user.id}`,
    });

    return Response.json(
      {
        id: job.id,
        status: job.status,
      },
      { status: 202 },
    );
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : '生成请求提交失败。',
      },
      { status: 400 },
    );
  }
}
