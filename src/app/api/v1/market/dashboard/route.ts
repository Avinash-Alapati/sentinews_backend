import { successResponse } from "@/shared/utils/api-response";
import { marketIntelligenceFacade } from "@/modules/market-intelligence";
import { REFRESH_INTERVALS } from "@/modules/market-intelligence/constants/market.constants";
import { withObservability } from "@/shared/utils/observability";

/**
 * GET handler returning consolidated landing dashboard metrics.
 */
export const GET = withObservability(async () => {
  const data = await marketIntelligenceFacade.getDashboard();
  return successResponse(
    data,
    "Dashboard metrics compiled successfully",
    false,
    data.lastUpdated,
    REFRESH_INTERVALS.STATUS_SEC
  );
});

