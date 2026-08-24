import { NextRequest } from "next/server";
import { successResponse } from "@/shared/utils/api-response";
import { sentimentIntelligenceFacade } from "@/modules/sentiment";
import { companySentimentQuerySchema } from "@/modules/sentiment/validators/sentiment-query.validator";
import { REFRESH_INTERVALS } from "@/modules/sentiment/constants/sentiment.constants";
import { withObservability } from "@/shared/utils/observability";

export const dynamic = "force-dynamic";
export const revalidate = 300; // Cache strategy: revalidate every 300 seconds

/**
 * GET handler returning aggregated sentiment metrics for a specific company symbol.
 */
export const GET = withObservability(async (request: NextRequest, context) => {
  const { searchParams } = new URL(request.url);
  const symbolParam = searchParams.get("symbol");
  const requestId = context?.requestId;

  // Validate the company symbol using Zod
  const validationResult = companySentimentQuerySchema.parse({
    symbol: symbolParam === null ? undefined : symbolParam,
  });

  const { symbol } = validationResult;
  const data = await sentimentIntelligenceFacade.getCompanySentiment(symbol, requestId);

  return successResponse(
    data,
    "Company sentiment insights fetched successfully",
    false,
    data.lastUpdated,
    REFRESH_INTERVALS.COMPANY_SEC
  );
});
