import { successResponse } from "@/shared/utils/api-response";
import { marketIntelligenceFacade } from "@/modules/market-intelligence";
import { REFRESH_INTERVALS } from "@/modules/market-intelligence/constants/market.constants";
import { withObservability } from "@/shared/utils/observability";

/**
 * GET handler returning major indexes quote averages.
 */
export const GET = withObservability(async () => {
  const data = await marketIntelligenceFacade.getMarketOverview();
  return successResponse(
    data,
    "Market indices overview fetched successfully",
    true,
    new Date().toISOString(),
    REFRESH_INTERVALS.OVERVIEW_SEC
  );
});

