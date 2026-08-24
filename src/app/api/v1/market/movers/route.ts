import { successResponse } from "@/shared/utils/api-response";
import { marketIntelligenceFacade } from "@/modules/market-intelligence";
import { REFRESH_INTERVALS } from "@/modules/market-intelligence/constants/market.constants";
import { withObservability } from "@/shared/utils/observability";

/**
 * GET handler returning stock gainers/losers arrays.
 */
export const GET = withObservability(async () => {
  const data = await marketIntelligenceFacade.getTopMovers();
  return successResponse(
    data,
    "Top gainers and losers fetched successfully",
    true,
    data.timestamp,
    REFRESH_INTERVALS.MOVERS_SEC
  );
});

