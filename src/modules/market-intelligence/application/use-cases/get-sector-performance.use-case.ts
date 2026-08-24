import { MarketSectorService } from "../../services/market-sector.service";
import { SectorPerformanceDTO } from "../../dtos/sector-performance.dto";

/**
 * Use Case resolving sector averages and leaders.
 */
export class GetSectorPerformanceUseCase {
  constructor(private sectorService: MarketSectorService) {}

  async execute(): Promise<SectorPerformanceDTO[]> {
    return this.sectorService.getSectorPerformance();
  }
}
