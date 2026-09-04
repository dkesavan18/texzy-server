export const DEAL_STATUS = {
  PENDING: 'pending',
  QUOTED: 'quoted',
  COUNTERED: 'countered',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
} as const;

export type DealStatusValue = (typeof DEAL_STATUS)[keyof typeof DEAL_STATUS];

export const DEAL_SOURCE_KIND = {
  NEED_RESPONSE: 'need_response',
  PRODUCT: 'product',
} as const;

export type DealSourceKind =
  (typeof DEAL_SOURCE_KIND)[keyof typeof DEAL_SOURCE_KIND];

/** Structured quotation snapshot stored as JSON in deals.notes. */
export type QuotationDocument = {
  version: 1
  kind: DealSourceKind
  title: string
  description: string | null
  unit: string | null
  unitPrice: number | null
  quantity: number
  lineTotal: number | null
  currency: 'INR'
  productId: string | null
  needId: string | null
  needResponseId: string | null
  images: string[]
  buyerNote: string | null
  sellerNote: string | null
  deliverAddress: string | null
  specs: { label: string; value: string }[]
}

export const DEAL_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  quoted: 'Quoted',
  countered: 'Countered',
  accepted: 'Accepted',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  completed: 'Completed',
}
