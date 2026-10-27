/**
 * Field definitions that drive the dynamic "Add product" form (category_input_mapping).
 *
 * Resolution order for a product type: global (all products) -> product group -> product type.
 * A more specific row with the same `key` replaces the less specific one, and an `exclude`
 * entry switches an inherited field off for that scope.
 */
export type InputType =
  | 'TEXT'
  | 'TEXTAREA'
  | 'NUMBER'
  | 'DECIMAL'
  | 'BOOLEAN'
  | 'SINGLE_SELECT'
  | 'MULTI_SELECT'
  | 'DATE'
  | 'COLOR_SELECT'
  | 'IMAGE'
  | 'FILE'
  | 'MEASUREMENT'
  | 'TAG_SELECT';

export type VisibilityRule =
  | { key: string; op: 'eq' | 'neq' | 'in' | 'notIn' | 'truthy' | 'falsy'; value?: unknown }
  | { all: VisibilityRule[] }
  | { any: VisibilityRule[] };

export type InputFieldSeed = {
  key: string;
  label: string;
  type: InputType;
  option?: string;
  required?: boolean;
  variant?: boolean;
  rules?: Record<string, unknown>;
  visible?: VisibilityRule;
  unit?: string;
  units?: string[];
  placeholder?: string;
  help?: string;
  defaultValue?: string;
};

export type InputDefinition = InputFieldSeed & {
  step: 'details' | 'pricing';
  sectionKey: string;
  sectionLabel: string;
  order: number;
};

export type InputScopeSeed = {
  /** `null` = every product; otherwise a product group or product type code. */
  scope: string | null;
  fields: InputDefinition[];
  /** Inherited keys switched off for this scope. */
  exclude?: string[];
};

type Opts = Partial<Omit<InputFieldSeed, 'key' | 'label' | 'type'>>;

const t = (key: string, label: string, o: Opts = {}): InputFieldSeed => ({ key, label, type: 'TEXT', ...o });
const ta = (key: string, label: string, o: Opts = {}): InputFieldSeed => ({ key, label, type: 'TEXTAREA', ...o });
const n = (key: string, label: string, o: Opts = {}): InputFieldSeed => ({ key, label, type: 'NUMBER', ...o });
const d = (key: string, label: string, o: Opts = {}): InputFieldSeed => ({ key, label, type: 'DECIMAL', ...o });
const b = (key: string, label: string, o: Opts = {}): InputFieldSeed => ({ key, label, type: 'BOOLEAN', ...o });
const ss = (key: string, label: string, option: string, o: Opts = {}): InputFieldSeed => ({
  key,
  label,
  type: 'SINGLE_SELECT',
  option,
  ...o,
});
const ms = (key: string, label: string, option: string, o: Opts = {}): InputFieldSeed => ({
  key,
  label,
  type: 'MULTI_SELECT',
  option,
  ...o,
});
const cs = (key: string, label: string, o: Opts = {}): InputFieldSeed => ({
  key,
  label,
  type: 'COLOR_SELECT',
  option: 'COLOUR',
  ...o,
});
const m = (key: string, label: string, unit: string, units: string[], o: Opts = {}): InputFieldSeed => ({
  key,
  label,
  type: 'MEASUREMENT',
  unit,
  units,
  ...o,
});
const img = (key: string, label: string, o: Opts = {}): InputFieldSeed => ({ key, label, type: 'IMAGE', ...o });
const file = (key: string, label: string, o: Opts = {}): InputFieldSeed => ({ key, label, type: 'FILE', ...o });
const tags = (key: string, label: string, o: Opts = {}): InputFieldSeed => ({ key, label, type: 'TAG_SELECT', ...o });

function section(
  step: 'details' | 'pricing',
  sectionKey: string,
  sectionLabel: string,
  base: number,
  fields: InputFieldSeed[],
): InputDefinition[] {
  return fields.map((field, index) => ({
    ...field,
    step,
    sectionKey,
    sectionLabel,
    order: base + index * 10,
  }));
}

const GROUP_BASE = 1000;
const detailsSection = (index: number, key: string, label: string, fields: InputFieldSeed[]) =>
  section('details', key, label, GROUP_BASE + index * 100, fields);

// ---------------------------------------------------------------------------
// Visibility helpers
// ---------------------------------------------------------------------------
const truthy = (key: string): VisibilityRule => ({ key, op: 'truthy' });
const isIn = (key: string, value: string[]): VisibilityRule => ({ key, op: 'in', value });

const SILK_MATERIALS = [
  'PURE_SILK',
  'MULBERRY_SILK',
  'SOFT_SILK',
  'TUSSAR_SILK',
  'ART_SILK',
  'SILK_COTTON',
];
const COTTON_MATERIALS = ['COTTON', 'ORGANIC_COTTON', 'SILK_COTTON'];
const FILAMENT_MATERIALS = ['POLYESTER', 'NYLON', 'RAYON', 'VISCOSE', 'ART_SILK', 'PURE_SILK', 'MULBERRY_SILK'];

const MM_CM_IN = ['mm', 'cm', 'in'];
const M_IN = ['m', 'in'];
const G_KG = ['g', 'kg'];

// ---------------------------------------------------------------------------
// A. Common inputs — apply to every sellable product
// ---------------------------------------------------------------------------
export const GLOBAL_FIELDS: InputDefinition[] = [
  ...section('details', 'basic', 'Basic Information', 0, [
    t('brand', 'Brand', { placeholder: 'e.g. Elampillai Weavers' }),
    t('manufacturer', 'Manufacturer', { placeholder: 'Maker / mill / weaving unit' }),
    t('sku', 'Product code', { rules: { maxLength: 100 }, placeholder: 'Your internal product code' }),
    ss('country_of_origin', 'Country of origin', 'COUNTRY_OF_ORIGIN', { defaultValue: 'INDIA' }),
    ss('product_condition', 'Product condition', 'PRODUCT_CONDITION', { defaultValue: 'NEW' }),
  ]),
  ...section('details', 'media_tags', 'Media & Search', 9000, [
    tags('search_tags', 'Search tags', {
      placeholder: 'Type a tag and press Enter',
      help: 'Helps buyers find this product',
      rules: { maxItems: 15 },
    }),
  ]),
  ...section('details', 'care', 'Care', 9100, [
    ms('care_instructions', 'Care instructions', 'CARE_INSTRUCTION'),
  ]),
  ...section('pricing', 'pricing', 'Pricing', 0, [
    ss('selling_unit', 'Selling unit', 'SELLING_UNIT', { required: true, defaultValue: 'PIECE' }),
    d('price', 'Price (₹)', { required: true, rules: { min: 0.01, max: 100000000 } }),
    d('mrp', 'MRP (₹)', {
      rules: { min: 0, max: 100000000, gteKey: 'price' },
      help: 'Discount % is calculated automatically from price and MRP',
    }),
    d('wholesale_price', 'Wholesale price (₹)', { rules: { min: 0, max: 100000000 } }),
    d('gst_rate', 'GST rate (%)', { rules: { min: 0, max: 28 }, defaultValue: '5', placeholder: 'e.g. 5' }),
  ]),
  ...section('pricing', 'inventory', 'Inventory', 100, [
    n('stock_quantity', 'Stock quantity', { required: true, rules: { min: 0, max: 100000000 } }),
    n('moq', 'Minimum order quantity (MOQ)', { rules: { min: 1, max: 100000000 }, defaultValue: '1' }),
    n('low_stock_threshold', 'Low-stock threshold', { rules: { min: 0, max: 100000000 } }),
    ss('availability', 'Availability', 'AVAILABILITY', { defaultValue: 'IN_STOCK' }),
    b('made_to_order', 'Made to order', { help: 'Produced only after the buyer orders' }),
    n('lead_time_days', 'Lead time (days)', {
      rules: { min: 0, max: 365, requiredWhen: truthy('made_to_order') },
      visible: truthy('made_to_order'),
    }),
  ]),
  ...section('pricing', 'shipping', 'Shipping & Packaging', 200, [
    d('package_weight', 'Package weight (g)', { rules: { min: 0, max: 10000000 } }),
    d('package_length', 'Package length (cm)', { rules: { min: 0, max: 10000 } }),
    d('package_width', 'Package width (cm)', { rules: { min: 0, max: 10000 } }),
    d('package_height', 'Package height (cm)', { rules: { min: 0, max: 10000 } }),
    ta('shipping_info', 'Shipping information', {
      rules: { maxLength: 500 },
      placeholder: 'Dispatch time, courier, packing notes…',
    }),
  ]),
];

// ---------------------------------------------------------------------------
// Re-usable field blocks
// ---------------------------------------------------------------------------
const materialBlock = (materialKey: string): InputFieldSeed[] => [
  ss(materialKey, 'Primary material', 'MATERIAL', { required: true }),
  t('material_composition', 'Material composition', { placeholder: 'e.g. 100% mulberry silk' }),
  ss('silk_type', 'Silk type', 'SILK_TYPE', { visible: isIn(materialKey, SILK_MATERIALS) }),
  ss('yarn_type', 'Yarn type', 'YARN_TYPE'),
  ss('weave_type', 'Weave type', 'WEAVE_TYPE'),
  ss('loom_type', 'Handloom / Powerloom', 'LOOM_TYPE'),
];

const zariBlock = (variantZari = false): InputFieldSeed[] => [
  b('zari_work_present', 'Zari work present'),
  ss('zari_type', 'Zari type', 'ZARI_TYPE', { visible: truthy('zari_work_present'), variant: variantZari }),
  cs('zari_colour', 'Zari colour', { visible: truthy('zari_work_present') }),
  ss('zari_base_material', 'Zari material / base', 'ZARI_BASE', { visible: truthy('zari_work_present') }),
  ss('zari_coverage', 'Zari coverage', 'COVERAGE', { visible: truthy('zari_work_present') }),
  t('zari_design', 'Zari design', { visible: truthy('zari_work_present') }),
  ss('zari_quality', 'Zari quality / grade', 'QUALITY_GRADE', { visible: truthy('zari_work_present') }),
];

// ---------------------------------------------------------------------------
// B. SAREE
// ---------------------------------------------------------------------------
const SAREE_FIELDS: InputDefinition[] = [
  ...detailsSection(0, 'saree_basic', 'Saree Details', [
    t('design_number', 'Design / model number'),
  ]),
  ...detailsSection(1, 'material', 'Material & Weaving', [
    ...materialBlock('primary_material'),
    t('yarn_count', 'Yarn count', { placeholder: 'e.g. 80s / 2 ply', help: 'If known' }),
    ss('fabric_finish', 'Fabric finish', 'FABRIC_FINISH'),
    n('gsm', 'GSM', { rules: { min: 10, max: 1500 } }),
    m('fabric_width', 'Fabric width', 'in', M_IN, { rules: { min: 0, max: 200 } }),
    ss('transparency', 'Fabric transparency', 'TRANSPARENCY'),
  ]),
  ...detailsSection(2, 'design', 'Design & Colour', [
    ss('pattern', 'Pattern', 'PATTERN'),
    t('motif', 'Motif / design'),
    cs('primary_colour', 'Primary colour', { variant: true }),
    cs('secondary_colour', 'Secondary colour', { variant: true }),
    ms('additional_colours', 'Additional colours', 'COLOUR'),
    t('colour_combination', 'Colour combination', { placeholder: 'e.g. Maroon with gold' }),
    ss('print_type', 'Print type', 'PRINT_TECHNIQUE'),
    t('design_style', 'Design style'),
    b('reversible', 'Reversible'),
  ]),
  ...detailsSection(3, 'zari', 'Zari', zariBlock(true)),
  ...detailsSection(4, 'border', 'Border', [
    b('border_present', 'Border present', { defaultValue: 'true' }),
    ss('border_type', 'Border type', 'BORDER_TYPE', { variant: true, visible: truthy('border_present') }),
    ss('border_size', 'Border size', 'BORDER_SIZE', { visible: truthy('border_present') }),
    cs('border_colour', 'Border colour', { visible: truthy('border_present') }),
    ss('border_material', 'Border material', 'MATERIAL', { visible: truthy('border_present') }),
    ss('border_work', 'Border work', 'WORK_TYPE', { visible: truthy('border_present') }),
    t('border_design', 'Border design', { visible: truthy('border_present') }),
    m('border_width', 'Border width', 'in', M_IN, {
      rules: { min: 0, max: 60 },
      visible: truthy('border_present'),
    }),
  ]),
  ...detailsSection(5, 'pallu', 'Pallu', [
    ss('pallu_type', 'Pallu type', 'PALLU_TYPE', { variant: true }),
    cs('pallu_colour', 'Pallu colour'),
    ss('pallu_match', 'Contrast or matching pallu', 'PALLU_MATCH'),
    t('pallu_design', 'Pallu design'),
    ss('pallu_work', 'Pallu work', 'WORK_TYPE'),
    ss('pallu_material', 'Pallu material', 'MATERIAL'),
  ]),
  ...detailsSection(6, 'blouse', 'Blouse', [
    b('blouse_included', 'Blouse piece included', { defaultValue: 'true' }),
    ss('blouse_match', 'Blouse type', 'BLOUSE_MATCH', {
      variant: true,
      visible: truthy('blouse_included'),
    }),
    ss('blouse_fabric', 'Blouse fabric', 'MATERIAL', { visible: truthy('blouse_included') }),
    cs('blouse_colour', 'Blouse colour', { visible: truthy('blouse_included') }),
    t('blouse_design', 'Blouse design', { visible: truthy('blouse_included') }),
    ss('blouse_work', 'Blouse work', 'WORK_TYPE', { visible: truthy('blouse_included') }),
    m('blouse_length', 'Blouse-piece length', 'm', ['m', 'in'], {
      rules: { min: 0, max: 5 },
      visible: truthy('blouse_included'),
    }),
    img('blouse_image', 'Blouse image', {
      visible: truthy('blouse_included'),
      help: 'Pick one of the photos you uploaded',
    }),
  ]),
  ...detailsSection(7, 'work', 'Embroidery & Work', [
    ms('work_type', 'Work type', 'WORK_TYPE'),
    ss('embroidery_technique', 'Embroidery technique', 'EMBROIDERY_TECHNIQUE', {
      visible: embroideryVisible(),
    }),
    t('embroidery_design', 'Embroidery design', { visible: embroideryVisible() }),
    ss('embroidery_coverage', 'Embroidery coverage', 'COVERAGE', { visible: embroideryVisible() }),
    cs('embroidery_colour', 'Embroidery colour', { visible: embroideryVisible() }),
  ]),
  ...detailsSection(8, 'measurements', 'Measurements', [
    m('saree_length', 'Saree length', 'm', ['m', 'in'], { required: true, rules: { min: 1, max: 12 } }),
    m('saree_width', 'Saree width', 'm', ['m', 'in'], { rules: { min: 0.3, max: 3 } }),
    m('total_weight', 'Total product weight', 'g', G_KG, { rules: { min: 0, max: 20000 } }),
  ]),
  ...detailsSection(9, 'usage', 'Usage', [
    ms('occasion', 'Occasion', 'OCCASION'),
    ss('season', 'Season', 'SEASON'),
  ]),
];

function embroideryVisible(): VisibilityRule {
  return {
    all: [
      { key: 'work_type', op: 'truthy' },
      { key: 'work_type', op: 'notIn', value: ['NONE'] },
    ],
  };
}

// ---------------------------------------------------------------------------
// C. DHOTI & VESHTI
// ---------------------------------------------------------------------------
const DHOTI_FIELDS: InputDefinition[] = [
  ...detailsSection(1, 'material', 'Material & Weaving', materialBlock('primary_material').filter((f) => f.key !== 'silk_type')),
  ...detailsSection(2, 'design', 'Design & Colour', [
    cs('primary_colour', 'Primary colour', { variant: true }),
    cs('secondary_colour', 'Secondary colour', { variant: true }),
    ss('pattern', 'Pattern', 'PATTERN'),
  ]),
  ...detailsSection(3, 'border', 'Border', [
    ss('border_type', 'Border type', 'BORDER_TYPE', { variant: true }),
    cs('border_colour', 'Border colour'),
    m('border_width', 'Border width', 'in', M_IN, { rules: { min: 0, max: 30 } }),
  ]),
  ...detailsSection(4, 'zari', 'Zari', [
    b('zari_work_present', 'Zari present'),
    ss('zari_type', 'Zari type', 'ZARI_TYPE', { visible: truthy('zari_work_present') }),
    cs('zari_colour', 'Zari colour', { visible: truthy('zari_work_present') }),
  ]),
  ...detailsSection(5, 'set', 'Size & Set', [
    ss('dhoti_piece', 'Single or double', 'SINGLE_DOUBLE'),
    m('length', 'Length', 'm', ['m', 'in'], { rules: { min: 0, max: 12 } }),
    m('width', 'Width', 'm', ['m', 'in'], { rules: { min: 0, max: 5 } }),
    t('size', 'Size', { placeholder: 'e.g. 4 x 2.5 m' }),
    ss('set_type', 'Set type', 'SET_TYPE', { variant: true }),
    b('angavastram_included', 'Angavastram included'),
    cs('angavastram_colour', 'Angavastram colour', { visible: truthy('angavastram_included') }),
  ]),
  ...detailsSection(6, 'usage', 'Usage', [ms('occasion', 'Occasion', 'OCCASION')]),
];

// ---------------------------------------------------------------------------
// D. KIDS TRADITIONAL WEAR
// ---------------------------------------------------------------------------
const requiredForCustomMade = { requiredWhen: truthy('made_to_order') };

const KIDS_FIELDS: InputDefinition[] = [
  ...detailsSection(0, 'kids_basic', 'Kids Details', [
    ss('gender', 'Gender', 'GENDER'),
    ss('age_group', 'Age group', 'AGE_GROUP', { required: true, variant: true }),
  ]),
  ...detailsSection(1, 'material', 'Material & Weaving', [
    ss('primary_material', 'Fabric / material', 'MATERIAL', { required: true }),
    t('material_composition', 'Material composition'),
    ss('silk_type', 'Silk type', 'SILK_TYPE', { visible: isIn('primary_material', SILK_MATERIALS) }),
    ss('yarn_type', 'Yarn type', 'YARN_TYPE'),
    ss('weave_type', 'Weave type', 'WEAVE_TYPE'),
  ]),
  ...detailsSection(2, 'design', 'Design & Colour', [
    cs('primary_colour', 'Primary colour', { variant: true }),
    cs('secondary_colour', 'Secondary colour', { variant: true }),
    ms('additional_colours', 'Additional colours', 'COLOUR'),
    t('colour_combination', 'Colour combination'),
    ss('pattern', 'Pattern', 'PATTERN'),
    ss('border_type', 'Border type', 'BORDER_TYPE'),
    cs('border_colour', 'Border colour'),
    ss('zari_type', 'Zari type', 'ZARI_TYPE'),
    ss('embroidery_type', 'Embroidery type', 'EMBROIDERY_TECHNIQUE'),
    ms('work_type', 'Work type', 'WORK_TYPE'),
  ]),
  ...detailsSection(3, 'sizing', 'Size & Measurements', [
    ss('standard_size', 'Standard size', 'KIDS_SIZE', { variant: true }),
    b('custom_size_available', 'Custom size available'),
    m('chest', 'Chest', 'in', M_IN, {
      rules: { min: 0, max: 60, ...requiredForCustomMade },
      help: 'Required only for custom-made products',
    }),
    m('waist', 'Waist', 'in', M_IN, { rules: { min: 0, max: 60, ...requiredForCustomMade } }),
    m('shoulder', 'Shoulder', 'in', M_IN, { rules: { min: 0, max: 30 } }),
    m('top_length', 'Top length', 'in', M_IN, { rules: { min: 0, max: 60, ...requiredForCustomMade } }),
    m('skirt_length', 'Skirt length', 'in', M_IN, { rules: { min: 0, max: 60 } }),
    m('dhavani_length', 'Dhavani / dupatta length', 'in', M_IN, { rules: { min: 0, max: 200 } }),
  ]),
  ...detailsSection(4, 'styling', 'Styling', [
    ss('sleeve_type', 'Sleeve type', 'SLEEVE_TYPE'),
    m('sleeve_length', 'Sleeve length', 'in', M_IN, { rules: { min: 0, max: 40 } }),
    ss('neck_design', 'Neck design', 'NECK_DESIGN'),
    ss('closure_type', 'Closure type', 'CLOSURE_TYPE'),
  ]),
  ...detailsSection(5, 'set', 'Set Contents', [
    b('top_included', 'Blouse / top included'),
    b('dhavani_included', 'Dupatta / dhavani included'),
    n('pieces_in_set', 'Number of pieces in set', { rules: { min: 1, max: 20 } }),
  ]),
  ...detailsSection(6, 'usage', 'Usage', [ms('occasion', 'Occasion', 'OCCASION')]),
];

// ---------------------------------------------------------------------------
// E. YARN
// ---------------------------------------------------------------------------
const YARN_FIELDS: InputDefinition[] = [
  ...detailsSection(1, 'fibre', 'Fibre & Count', [
    ss('fibre_material', 'Fibre / material', 'MATERIAL', { required: true }),
    ss('silk_type', 'Silk type', 'SILK_TYPE', { visible: isIn('fibre_material', SILK_MATERIALS) }),
    n('yarn_count', 'Yarn count', { required: true, variant: true, rules: { min: 0.1, max: 5000 } }),
    ss('count_system', 'Count system', 'COUNT_SYSTEM', { required: true, defaultValue: 'NE' }),
    n('ply', 'Ply', { required: true, variant: true, rules: { min: 1, max: 24 }, defaultValue: '1' }),
    n('denier', 'Denier', {
      rules: { min: 1, max: 100000 },
      visible: {
        any: [isIn('fibre_material', FILAMENT_MATERIALS), isIn('count_system', ['DENIER', 'DTEX'])],
      },
      help: 'Only for filament / synthetic yarns',
    }),
  ]),
  ...detailsSection(2, 'spinning', 'Spinning & Finish', [
    ss('twist_type', 'Twist type', 'TWIST_TYPE'),
    ss('spinning_method', 'Spinning method', 'SPINNING_METHOD'),
    ss('carded_combed', 'Carded / combed', 'CARDED_COMBED', {
      visible: isIn('fibre_material', COTTON_MATERIALS),
    }),
    ss('yarn_finish', 'Yarn finish', 'YARN_FINISH'),
  ]),
  ...detailsSection(3, 'dyeing', 'Dyeing & Colour', [
    ss('dye_status', 'Dye status', 'DYE_STATUS', { required: true }),
    ss('dye_type', 'Dye type', 'DYE_TYPE', { visible: isIn('dye_status', ['DYED']) }),
    cs('colour', 'Colour', { variant: true, visible: { key: 'dye_status', op: 'neq', value: 'GREY' } }),
    t('colour_code', 'Colour code', { placeholder: 'Shade / dye lot code' }),
  ]),
  ...detailsSection(4, 'packaging', 'Weight & Packaging', [
    m('net_weight', 'Net weight per package', 'kg', G_KG, { required: true, rules: { min: 0, max: 100000 } }),
    m('length', 'Length', 'm', ['m', 'km'], { rules: { min: 0, max: 100000000 } }),
    ss('packaging_type', 'Packaging', 'PACKAGING_TYPE', { variant: true }),
    n('units_per_package', 'Cones / hanks per package', { rules: { min: 1, max: 10000 } }),
    t('lot_number', 'Lot / batch number'),
    ss('quality_grade', 'Quality / grade', 'QUALITY_GRADE'),
  ]),
];

// ---------------------------------------------------------------------------
// F. FABRIC
// ---------------------------------------------------------------------------
const FABRIC_FIELDS: InputDefinition[] = [
  ...detailsSection(1, 'material', 'Fabric & Composition', [
    ss('primary_material', 'Material', 'MATERIAL', { required: true }),
    t('fibre_composition', 'Fibre composition', { placeholder: 'e.g. 60% cotton, 40% silk' }),
    ss('weave_type', 'Weave type', 'WEAVE_TYPE'),
    ss('loom_type', 'Handloom / Powerloom', 'LOOM_TYPE'),
  ]),
  ...detailsSection(2, 'design', 'Design & Colour', [
    cs('primary_colour', 'Colour', { variant: true }),
    t('colour_combination', 'Colour combination'),
    ss('pattern', 'Pattern', 'PATTERN', { variant: true }),
    ss('print_technique', 'Print technique', 'PRINT_TECHNIQUE'),
  ]),
  ...detailsSection(3, 'specs', 'Specifications', [
    m('fabric_width', 'Fabric width', 'in', ['in', 'cm', 'm'], { required: true, rules: { min: 0, max: 400 } }),
    n('gsm', 'GSM', { variant: true, rules: { min: 10, max: 1500 } }),
    d('thickness', 'Thickness (mm)', { rules: { min: 0, max: 50 } }),
    m('weight_per_metre', 'Weight per metre', 'g', G_KG, { rules: { min: 0, max: 100000 } }),
    ss('fabric_finish', 'Finish', 'FABRIC_FINISH'),
    ss('dye_type', 'Dye type', 'DYE_TYPE'),
    t('shrinkage', 'Shrinkage information'),
    ss('transparency', 'Transparency', 'TRANSPARENCY'),
    ss('stretchability', 'Stretchability', 'STRETCHABILITY'),
  ]),
  ...detailsSection(4, 'length', 'Length & Supply', [
    m('length_available', 'Length available', 'm', ['m', 'yd'], { rules: { min: 0, max: 1000000 } }),
    m('roll_length', 'Roll length', 'm', ['m', 'yd'], { rules: { min: 0, max: 1000000 } }),
    m('minimum_cut_length', 'Minimum cut length', 'm', ['m', 'yd'], { rules: { min: 0, max: 100000 } }),
    ms('intended_use', 'Intended use', 'INTENDED_USE'),
    t('lot_number', 'Lot / batch number'),
  ]),
];

// ---------------------------------------------------------------------------
// G. ZARI PRODUCTS (+ Zari Kattai at product-type level)
// ---------------------------------------------------------------------------
const ZARI_FIELDS: InputDefinition[] = [
  ...detailsSection(1, 'zari_spec', 'Zari Details', [
    ss('zari_type', 'Zari type', 'ZARI_TYPE', { required: true, variant: true }),
    ss('base_material', 'Base material', 'ZARI_BASE'),
    t('metallic_material', 'Metallic material', { placeholder: 'e.g. Silver, copper alloy' }),
    cs('zari_colour', 'Zari colour', { variant: true }),
    ss('metallic_finish', 'Gold / silver / copper / other finish', 'METALLIC_FINISH'),
    ss('quality_grade', 'Quality / grade', 'QUALITY_GRADE'),
  ]),
  ...detailsSection(2, 'zari_size', 'Size & Packaging', [
    d('thickness', 'Thickness (mm)', { rules: { min: 0, max: 100 } }),
    m('width', 'Width', 'mm', MM_CM_IN, { rules: { min: 0, max: 5000 } }),
    m('length', 'Length', 'm', ['m', 'cm'], { rules: { min: 0, max: 10000000 } }),
    m('weight', 'Weight', 'g', G_KG, { rules: { min: 0, max: 1000000 } }),
    ss('packaging_type', 'Packaging type', 'PACKAGING_TYPE', { variant: true }),
    n('pieces_per_package', 'Pieces per package', { rules: { min: 1, max: 100000 } }),
  ]),
  ...detailsSection(3, 'zari_use', 'Design & Application', [
    t('design', 'Design / pattern'),
    ms('application', 'Application', 'INTENDED_USE'),
    t('lot_number', 'Lot / batch number'),
  ]),
];

const ZARI_KATTAI_FIELDS: InputDefinition[] = detailsSection(4, 'kattai', 'Zari Kattai', [
  t('kattai_size', 'Kattai size', { required: true, variant: true, placeholder: 'e.g. 100 g / 250 g' }),
  t('kattai_dimensions', 'Kattai dimensions', { placeholder: 'L x W x H' }),
  n('kattai_packaging_quantity', 'Packaging quantity', { rules: { min: 1, max: 100000 } }),
]);

// ---------------------------------------------------------------------------
// H. BORDERS & LACES
// ---------------------------------------------------------------------------
const BORDER_FIELDS: InputDefinition[] = [
  ...detailsSection(1, 'border_spec', 'Border / Lace Details', [
    ss('border_material', 'Material', 'MATERIAL', { required: true }),
    t('fabric_composition', 'Fabric composition'),
    ss('zari_type', 'Zari type', 'ZARI_TYPE'),
    ss('pattern', 'Pattern', 'PATTERN', { variant: true }),
    ms('work_type', 'Embroidery / work type', 'WORK_TYPE'),
    t('motif', 'Motif'),
    ss('finish', 'Finish', 'FABRIC_FINISH'),
  ]),
  ...detailsSection(2, 'border_colour', 'Colour', [
    cs('primary_colour', 'Primary colour', { variant: true }),
    cs('secondary_colour', 'Secondary colour', { variant: true }),
  ]),
  ...detailsSection(3, 'border_size', 'Size', [
    m('width', 'Width', 'mm', MM_CM_IN, { required: true, rules: { min: 0, max: 1000 } }),
    m('length_per_roll', 'Length per roll', 'm', ['m', 'yd'], { rules: { min: 0, max: 100000 } }),
  ]),
];

// ---------------------------------------------------------------------------
// I. EMBROIDERY SUPPLIES
// ---------------------------------------------------------------------------
const EMBROIDERY_FIELDS: InputDefinition[] = [
  ...detailsSection(1, 'supply', 'Supply Details', [
    t('supply_material', 'Material', { placeholder: 'e.g. Glass, acrylic, polyester' }),
    ss('thread_fibre_type', 'Thread / fibre type', 'YARN_TYPE'),
    cs('colour', 'Colour', { variant: true }),
    t('size', 'Size', { variant: true }),
    t('needle_size', 'Needle size'),
    t('thread_thickness', 'Thread thickness'),
    m('length_or_weight', 'Length or weight', 'g', ['g', 'kg', 'm'], { rules: { min: 0, max: 10000000 } }),
    m('bead_size', 'Bead / stone / pearl size', 'mm', ['mm', 'cm'], { rules: { min: 0, max: 500 } }),
    ss('supply_finish', 'Finish', 'SUPPLY_FINISH'),
  ]),
  ...detailsSection(2, 'supply_pack', 'Packaging & Use', [
    ss('packaging_type', 'Packaging type', 'PACKAGING_TYPE', { variant: true }),
    n('quantity_per_pack', 'Quantity per pack', { rules: { min: 1, max: 1000000 } }),
    ms('application', 'Intended application', 'INTENDED_USE'),
    t('lot_number', 'Lot / batch number'),
  ]),
];

// ---------------------------------------------------------------------------
// J. TEXTILE ACCESSORIES
// ---------------------------------------------------------------------------
const ACCESSORY_FIELDS: InputDefinition[] = [
  ...detailsSection(1, 'accessory', 'Accessory Details', [
    t('accessory_material', 'Material', { placeholder: 'e.g. Metal, plastic, cotton' }),
    cs('colour', 'Colour', { variant: true }),
    t('size', 'Size', { variant: true }),
    m('length', 'Length', 'cm', ['mm', 'cm', 'm', 'in'], { rules: { min: 0, max: 100000 } }),
    m('width', 'Width', 'cm', ['mm', 'cm', 'm', 'in'], { rules: { min: 0, max: 100000 } }),
    ms('compatible_product_types', 'Compatible product type', 'PRODUCT_CATEGORY', {
      rules: { optionsRootOnly: true },
    }),
    t('design', 'Design'),
    ss('supply_finish', 'Finish', 'SUPPLY_FINISH'),
    n('pack_quantity', 'Pack quantity', { rules: { min: 1, max: 1000000 } }),
  ]),
];

// ---------------------------------------------------------------------------
// K. OTHER TEXTILES
// ---------------------------------------------------------------------------
const OTHER_TEXTILE_FIELDS: InputDefinition[] = [
  ...detailsSection(1, 'material', 'Material & Weave', [
    ss('primary_material', 'Material', 'MATERIAL', { required: true }),
    t('material_composition', 'Composition'),
    ss('yarn_type', 'Yarn type', 'YARN_TYPE'),
    ss('weave_type', 'Weave', 'WEAVE_TYPE'),
  ]),
  ...detailsSection(2, 'design', 'Design & Colour', [
    cs('primary_colour', 'Primary colour', { variant: true }),
    t('colour_combination', 'Colour combination'),
    ss('pattern', 'Pattern', 'PATTERN'),
    ms('work_type', 'Embroidery / work', 'WORK_TYPE'),
  ]),
  ...detailsSection(3, 'dimensions', 'Dimensions', [
    m('length', 'Length', 'm', ['m', 'in', 'cm'], { rules: { min: 0, max: 100 } }),
    m('width', 'Width', 'm', ['m', 'in', 'cm'], { rules: { min: 0, max: 100 } }),
    m('weight', 'Weight', 'g', G_KG, { rules: { min: 0, max: 100000 } }),
    ss('size', 'Size', 'SIZE', { variant: true }),
  ]),
  ...detailsSection(4, 'usage', 'Usage', [ms('occasion', 'Occasion', 'OCCASION')]),
];

const SET_CONTENT_FIELDS: InputDefinition[] = detailsSection(5, 'set_contents', 'Set Contents', [
  ta('set_contents', 'Set contents', {
    required: true,
    rules: { maxLength: 500 },
    placeholder: 'List every piece included in the set',
  }),
]);

// ---------------------------------------------------------------------------
// Scope table
// ---------------------------------------------------------------------------
export const INPUT_SCOPES: InputScopeSeed[] = [
  { scope: null, fields: GLOBAL_FIELDS },
  { scope: 'SAREE', fields: SAREE_FIELDS },
  { scope: 'DHOTI_VESHTI', fields: DHOTI_FIELDS },
  { scope: 'KIDS_TRADITIONAL_WEAR', fields: KIDS_FIELDS },
  {
    scope: 'YARN',
    fields: YARN_FIELDS,
    exclude: ['care_instructions'],
  },
  { scope: 'FABRIC', fields: FABRIC_FIELDS },
  { scope: 'ZARI_PRODUCTS', fields: ZARI_FIELDS, exclude: ['care_instructions'] },
  { scope: 'ZARI_KATTAI', fields: ZARI_KATTAI_FIELDS },
  { scope: 'BORDERS_LACES', fields: BORDER_FIELDS, exclude: ['care_instructions'] },
  { scope: 'EMBROIDERY_SUPPLIES', fields: EMBROIDERY_FIELDS, exclude: ['care_instructions'] },
  { scope: 'TEXTILE_ACCESSORIES', fields: ACCESSORY_FIELDS, exclude: ['care_instructions'] },
  { scope: 'OTHER_TEXTILES', fields: OTHER_TEXTILE_FIELDS },
  { scope: 'TEXTILE_GIFT_SET', fields: SET_CONTENT_FIELDS },
  { scope: 'TRADITIONAL_CLOTHING_SET', fields: SET_CONTENT_FIELDS },
];
