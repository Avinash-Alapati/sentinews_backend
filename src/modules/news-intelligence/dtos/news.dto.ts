export interface PaginationDto {
  page?: number;
  limit?: number;
}

export interface SearchNewsDto extends PaginationDto {
  q?: string;
}

export interface CompanyNewsDto extends PaginationDto {
  company: string;
}

export interface SectorNewsDto extends PaginationDto {
  sector: string;
}

export interface NewsResponseDto<T> {
  success: boolean;
  message: string;
  data: T;
}