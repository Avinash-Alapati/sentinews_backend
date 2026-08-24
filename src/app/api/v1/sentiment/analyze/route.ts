import { NextRequest } from "next/server";
import { successResponse } from "@/shared/utils/api-response";
import { sentimentIntelligenceFacade } from "@/modules/sentiment";
import { withObservability } from "@/shared/utils/observability";
import { z } from "zod";

export const revalidate = 0; // Caching disabled for mutation endpoints
export const dynamic = "force-dynamic";

const analyzeArticleBodySchema = z.object({
  articleId: z.string().min(1, "Article ID is required").trim(),
  forceReanalyze: z.boolean().optional().default(false),
});

/**
 * POST handler triggering automated news article sentiment analysis.
 * Managed as an internal/admin endpoint for MVP flow.
 */
export const POST = withObservability(async (request: NextRequest, context) => {
  let body;
  try {
    body = await request.json();
  } catch {
    throw new Error("Invalid JSON body. Parsing failed.");
  }

  const requestId = context?.requestId;

  // Validate request body schema
  const validationResult = analyzeArticleBodySchema.parse(body);
  const { articleId, forceReanalyze } = validationResult;

  const data = await sentimentIntelligenceFacade.analyzeArticle({
    articleId,
    forceReanalyze,
  }, requestId);

  return successResponse(
    data,
    "Article sentiment analyzed and persisted successfully",
    true,
    data.publishedAt,
    0
  );
});
