/** Junction-table types: multiple ordered images, one primary, thumbnail generated via `sharp`. */
export type JunctionEntityType = 'product' | 'need' | 'need-response';

/** Single-field types: one plain URL column, no thumbnail column in the existing schema. */
export type SingleFieldEntityType =
  | 'collection-cover'
  | 'profile-logo'
  | 'profile-cover'
  | 'profile-website-logo'
  | 'order-item-delivery';

export type UploadEntityType = JunctionEntityType | SingleFieldEntityType;

export const JUNCTION_ENTITY_TYPES: JunctionEntityType[] = [
  'product',
  'need',
  'need-response',
];

export const SINGLE_FIELD_ENTITY_TYPES: SingleFieldEntityType[] = [
  'collection-cover',
  'profile-logo',
  'profile-cover',
  'profile-website-logo',
  'order-item-delivery',
];

export const UPLOAD_ENTITY_TYPES: UploadEntityType[] = [
  ...JUNCTION_ENTITY_TYPES,
  ...SINGLE_FIELD_ENTITY_TYPES,
];
