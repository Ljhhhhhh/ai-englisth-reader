import {
  extractContent,
  type ExtractContentInput,
} from '@/features/generation/extract-content';
import { generateArticle } from '@/features/generation/article-generator';
import { getCurrentUser } from '@/features/auth/current-user';
import {
  countRecentGenerationJobs,
  createGenerationJob,
  markGenerationJobDone,
  markGenerationJobFailed,
  markGenerationJobProcessing,
} from '@/features/generation/generation-job-service';

const DAILY_LIMIT = 5;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

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

async function processJob(
  jobId: string,
  input: ExtractContentInput,
  userId: string,
) {
  try {
    await markGenerationJobProcessing(jobId);
    const extracted = await extractContent(input);
    const article = await generateArticle({
      ownerId: userId,
      source: extracted.source,
      text: extracted.text,
      titleHint: extracted.titleHint,
    });
    await markGenerationJobDone(jobId, article.slug);
  } catch (error) {
    await markGenerationJobFailed(
      jobId,
      error instanceof Error ? error.message : '文章生成失败，请稍后重试。',
    );
  }
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

    const recentCount = await countRecentGenerationJobs(
      user.id,
      new Date(Date.now() - ONE_DAY_MS),
    );

    if (recentCount >= DAILY_LIMIT) {
      return Response.json(
        { error: '今日生成次数已用完，请明天再试。' },
        { status: 429 },
      );
    }

    const input = parseGenerationInput(formData);
    const sourceRef = input.type === 'url' ? input.url : input.file.name;
    const job = await createGenerationJob({
      sourceRef,
      sourceType: input.type,
      userId: user.id,
    });

    void processJob(job.id, input, user.id);

    return Response.json(
      {
        id: job.id,
        limit: DAILY_LIMIT,
        remaining: Math.max(DAILY_LIMIT - recentCount - 1, 0),
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
