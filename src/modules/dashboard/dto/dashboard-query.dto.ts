import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Matches } from 'class-validator';
import {
  DASHBOARD_INTERVAL,
  DASHBOARD_METRICS,
} from '../constants/dashboard.constant';

/**
 * Query-style dashboard API — filters and metric selection stay in the query string
 * so future dashboard filters / drill-down charts can extend without new endpoints.
 *
 * Example:
 *   GET /dashboard?metrics=products,orders,ordersSeries&from=2026-01-01&to=2026-12-31&interval=month
 */
export class DashboardQueryDto {
  @ApiPropertyOptional({
    description:
      'Comma-separated metrics to include. Omit for the full dashboard payload.',
    example: 'products,orders,views,responseRate,ordersSeries,analytics',
  })
  @IsOptional()
  @IsString()
  metrics?: string;

  @ApiPropertyOptional({
    description: 'Inclusive start date (YYYY-MM-DD). Applies to order series / order KPIs.',
    example: '2026-01-01',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'from must be YYYY-MM-DD',
  })
  from?: string;

  @ApiPropertyOptional({
    description: 'Inclusive end date (YYYY-MM-DD). Applies to order series / order KPIs.',
    example: '2026-12-31',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'to must be YYYY-MM-DD',
  })
  to?: string;

  @ApiPropertyOptional({
    enum: Object.values(DASHBOARD_INTERVAL),
    example: 'month',
    description: 'Bucket size for ordersSeries (ready for future day/week drill-down).',
  })
  @IsOptional()
  @IsIn(Object.values(DASHBOARD_INTERVAL))
  interval?: string;

  /** Reserved for future chart drill-down (e.g. status=pending). */
  @ApiPropertyOptional({ example: 'pending' })
  @IsOptional()
  @IsString()
  status?: string;
}

export function parseMetrics(raw?: string): string[] {
  if (!raw?.trim()) return Object.values(DASHBOARD_METRICS);
  return [
    ...new Set(
      raw
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}
