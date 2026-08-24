import { MarketMoverService } from "../../services/market-mover.service";
import { MarketMoversDTO } from "../../dtos/market-mover.dto";

/**
 * Use Case resolving gainers and losers momentum lists.
 */
export class GetTopMoversUseCase {
  constructor(private moverService: MarketMoverService) {}

  async execute(): Promise<MarketMoversDTO> {
    return this.moverService.getMarketMovers();
  }
}
