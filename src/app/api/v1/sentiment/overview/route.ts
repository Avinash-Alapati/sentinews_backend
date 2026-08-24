import { NextRequest } from "next/server";
import { successResponse } from "@/shared/utils/api-response";
import { sentimentIntelligenceFacade } from "@/modules/sentiment";
import { sentimentOverviewQuerySchema } from "@/modules/sentiment/validators/sentiment-query.validator";
import { REFRESH_INTERVALS } from "@/modules/sentiment/constants/sentiment.constants";
import { withObservability } from "@/shared/utils/observability";

export const dynamic = "force-dynamic";
export const revalidate = 300; // Cache strategy: revalidate every 300 seconds

/**
 * GET handler returning overall market sentiment statistics and summaries.
 */
export const GET = withObservability(async (request: NextRequest, context) => {
  const { searchParams } = new URL(request.url);
  const daysParam = searchParams.get("days");
  const requestId = context?.requestId;

  // Validate the query param using Zod
  const validationResult = sentimentOverviewQuerySchema.parse({
    days: daysParam === null ? undefined : daysParam,
  });

  const { days } = validationResult;
  const data = await sentimentIntelligenceFacade.getMarketSentiment(days, requestId);

  return successResponse(
    data,
    "Market sentiment overview fetched successfully",
    false,
    data.timestamp,
    REFRESH_INTERVALS.OVERVIEW_SEC
  );
});
