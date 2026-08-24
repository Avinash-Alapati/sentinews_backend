import { InstitutionalActivityService } from "../../services/institutional-activity.service";
import { InstitutionalActivityDTO } from "../../dtos/institutional-activity.dto";

/**
 * Use Case resolving daily EOD institutional flows list.
 */
export class GetInstitutionalActivityUseCase {
  constructor(private institutionalService: InstitutionalActivityService) {}

  async execute(limit: number): Promise<InstitutionalActivityDTO[]> {
    return this.institutionalService.getInstitutionalActivity(limit);
  }
}
