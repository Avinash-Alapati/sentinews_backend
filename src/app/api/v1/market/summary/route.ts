import { successResponse } from "@/shared/utils/api-response";
import { marketIntelligenceFacade } from "@/modules/market-intelligence";
import { withObservability } from "@/shared/utils/observability";

/**
 * GET handler returning calculated signals summaries.
 */
export const GET = withObservability(async () => {
  const data = await marketIntelligenceFacade.getMarketSummary();
  return successResponse(
    data,
    "Market summary fetched successfully",
    false,
    data.lastUpdated,
    60
  );
});

