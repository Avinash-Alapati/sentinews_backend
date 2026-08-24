/**
 * DTO representing institutional segment transaction value parameters.
 */
export interface InstitutionalActivityFlowDTO {
  buyValue: number;
  sellValue: number;
  netValue: number;
}

/**
 * DTO representing EOD capital flows in INR Crores.
 */
export interface InstitutionalActivityDTO {
  date: string; // YYYY-MM-DD
  fii: InstitutionalActivityFlowDTO;
  dii: InstitutionalActivityFlowDTO;
  combinedNetValue: number;
  timestamp: string; // ISO 8601 string
}
