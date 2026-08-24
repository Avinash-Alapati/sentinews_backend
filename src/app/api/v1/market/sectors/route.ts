import { successResponse } from "@/shared/utils/api-response";
import { marketIntelligenceFacade } from "@/modules/market-intelligence";
import { REFRESH_INTERVALS } from "@/modules/market-intelligence/constants/market.constants";
import { withObservability } from "@/shared/utils/observability";

/**
 * GET handler returning sectoral performance logs.
 */
export const GET = withObservability(async () => {
  const data = await marketIntelligenceFacade.getSectorPerformance();
  const lastUpdated = data[0]?.timestamp || new Date().toISOString();
  return successResponse(
    data,
    "Sector performances fetched successfully",
    false,
    lastUpdated,
    REFRESH_INTERVALS.SECTORS_SEC
  );
});

