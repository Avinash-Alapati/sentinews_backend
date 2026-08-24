import { NextRequest } from "next/server";
import { successResponse } from "@/shared/utils/api-response";
import { sentimentIntelligenceFacade } from "@/modules/sentiment";
import { articleSentimentQuerySchema } from "@/modules/sentiment/validators/sentiment-query.validator";
import { REFRESH_INTERVALS } from "@/modules/sentiment/constants/sentiment.constants";
import { withObservability } from "@/shared/utils/observability";

export const dynamic = "force-dynamic";
export const revalidate = 300; // Cache strategy: revalidate every 300 seconds

/**
 * GET handler returning stored sentiment classification details for a single article.
 */
export const GET = withObservability(async (request: NextRequest, context) => {
  const { searchParams } = new URL(request.url);
  const articleIdParam = searchParams.get("articleId");
  const requestId = context?.requestId;

  // Validate the article ID using Zod
  const validationResult = articleSentimentQuerySchema.parse({
    articleId: articleIdParam === null ? undefined : articleIdParam,
  });

  const { articleId } = validationResult;
  const data = await sentimentIntelligenceFacade.getArticleSentiment(articleId, requestId);

  return successResponse(
    data,
    "Article sentiment details fetched successfully",
    false,
    data.publishedAt,
    REFRESH_INTERVALS.ARTICLE_SEC
  );
});
