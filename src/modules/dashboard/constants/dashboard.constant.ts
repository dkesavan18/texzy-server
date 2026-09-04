export const DASHBOARD_METRICS = {
  PRODUCTS: 'products',
  VIEWS: 'views',
  ORDERS: 'orders',
  RESPONSE_RATE: 'responseRate',
  ORDERS_SERIES: 'ordersSeries',
  ANALYTICS: 'analytics',
} as const;

export type DashboardMetricValue =
  (typeof DASHBOARD_METRICS)[keyof typeof DASHBOARD_METRICS];

export const DASHBOARD_INTERVAL = {
  MONTH: 'month',
  WEEK: 'week',
  DAY: 'day',
} as const;

export type DashboardIntervalValue =
  (typeof DASHBOARD_INTERVAL)[keyof typeof DASHBOARD_INTERVAL];

export const DEFAULT_DASHBOARD_METRICS: DashboardMetricValue[] = [
  DASHBOARD_METRICS.PRODUCTS,
  DASHBOARD_METRICS.VIEWS,
  DASHBOARD_METRICS.ORDERS,
  DASHBOARD_METRICS.RESPONSE_RATE,
  DASHBOARD_METRICS.ORDERS_SERIES,
  DASHBOARD_METRICS.ANALYTICS,
];
