import { NextRequest } from "next/server";
import { successResponse } from "@/shared/utils/api-response";
import { marketIntelligenceFacade } from "@/modules/market-intelligence";
import { institutionalQuerySchema } from "@/modules/market-intelligence/validators/market-query.validator";
import { REFRESH_INTERVALS } from "@/modules/market-intelligence/constants/market.constants";
import { withObservability } from "@/shared/utils/observability";

/**
 * GET handler returning FII/DII flow limits list.
 */
export const GET = withObservability(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get("limit");
  
  // Validate limit parameter using Zod
  const validationResult = institutionalQuerySchema.parse({
    limit: limitParam === null ? undefined : limitParam,
  });

  const { limit } = validationResult;
  const data = await marketIntelligenceFacade.getInstitutionalActivity(limit);
  const lastUpdated = data[0]?.timestamp || new Date().toISOString();

  return successResponse(
    data,
    "Institutional activity flows fetched successfully",
    false,
    lastUpdated,
    REFRESH_INTERVALS.INSTITUTIONAL_SEC
  );
});

