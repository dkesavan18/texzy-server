import { BadRequestException, Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Product, ProductAttributeValue } from '../../database/entities';
import { evaluateRule, type ComparableValues } from '../category-inputs/form-rules.util';
import type {
  FormConfig,
  FormFieldConfig,
  FormOption,
} from '../category-inputs/category-inputs.types';

/**
 * Wire format of a dynamic value:
 *  TEXT/TEXTAREA/DATE/FILE/IMAGE -> string          NUMBER/DECIMAL -> number
 *  BOOLEAN -> boolean                               SINGLE_SELECT/COLOR_SELECT -> option id (string)
 *  MULTI_SELECT -> option ids (string[])            TAG_SELECT -> string[]
 *  MEASUREMENT -> { value: number, unit: string }
 */
export type MeasurementValue = { value: number; unit: string };
export type AttributeValue =
  | string
  | number
  | boolean
  | string[]
  | MeasurementValue
  | null;
export type AttributeMap = Record<string, AttributeValue>;

export type AttributeSpec = {
  key: string;
  label: string;
  value: string;
  section: string;
};

/** Inputs stored in `products` columns (queried / used for pricing) rather than as attribute rows. */
const CORE_NUMBER_COLUMNS: Record<string, keyof Product> = {
  price: 'price',
  mrp: 'compareAtPrice',
  stock_quantity: 'quantity',
  moq: 'minOrderQuantity',
  gst_rate: 'gstRate',
  lead_time_days: 'leadTimeDays',
  low_stock_threshold: 'lowStockThreshold',
  wholesale_price: 'wholesalePrice',
  package_weight: 'packageWeight',
};
const CORE_TEXT_COLUMNS: Record<string, keyof Product> = {
  sku: 'sku',
  hsn_code: 'hsnCode',
};
const CORE_BOOLEAN_COLUMNS: Record<string, keyof Product> = {
  made_to_order: 'isMadeToOrder',
};
const DIMENSION_KEYS: Record<string, 'length' | 'width' | 'height'> = {
  package_length: 'length',
  package_width: 'width',
  package_height: 'height',
};

const isCoreKey = (key: string) =>
  key in CORE_NUMBER_COLUMNS ||
  key in CORE_TEXT_COLUMNS ||
  key in CORE_BOOLEAN_COLUMNS ||
  key in DIMENSION_KEYS;

type Row = {
  key: string;
  optionCategoryId: string | null;
  valueText: string | null;
  valueNumber: number | null;
  valueBoolean: boolean | null;
  valueDate: string | null;
  valueJson: unknown;
  unit: string | null;
};

const SELECT_SINGLE = new Set(['SINGLE_SELECT', 'COLOR_SELECT']);

@Injectable()
export class ProductAttributesService {
  // ---------------------------------------------------------------------------
  // Read
  // ---------------------------------------------------------------------------

  /** Stored values of a product in wire format (core columns + attribute rows). */
  async load(
    manager: EntityManager,
    product: Product,
    config: FormConfig,
  ): Promise<AttributeMap> {
    const rows = await manager.find(ProductAttributeValue, {
      where: { productId: product.productId },
    });
    return this.rowsToMap(config, product, rows);
  }

  private rowsToMap(
    config: FormConfig,
    product: Product,
    rows: ProductAttributeValue[],
  ): AttributeMap {
    const map: AttributeMap = {};

    for (const field of config.fields) {
      if (isCoreKey(field.key)) {
        const value = this.readCore(product, field);
        if (value !== null && value !== undefined) map[field.key] = value;
        continue;
      }

      const fieldRows = rows.filter((row) => row.inputKey === field.key);
      if (fieldRows.length === 0) continue;

      switch (field.type) {
        case 'SINGLE_SELECT':
        case 'COLOR_SELECT':
          if (fieldRows[0].optionCategoryId) map[field.key] = fieldRows[0].optionCategoryId;
          break;
        case 'MULTI_SELECT':
          map[field.key] = fieldRows
            .map((row) => row.optionCategoryId)
            .filter((id): id is string => Boolean(id));
          break;
        case 'TAG_SELECT':
          map[field.key] = Array.isArray(fieldRows[0].valueJson)
            ? (fieldRows[0].valueJson as string[])
            : [];
          break;
        case 'MEASUREMENT':
          if (fieldRows[0].valueNumber !== null) {
            map[field.key] = {
              value: fieldRows[0].valueNumber,
              unit: fieldRows[0].unit ?? field.unit ?? '',
            };
          }
          break;
        case 'NUMBER':
        case 'DECIMAL':
          if (fieldRows[0].valueNumber !== null) map[field.key] = fieldRows[0].valueNumber;
          break;
        case 'BOOLEAN':
          if (fieldRows[0].valueBoolean !== null) map[field.key] = fieldRows[0].valueBoolean;
          break;
        case 'DATE':
          if (fieldRows[0].valueDate) map[field.key] = String(fieldRows[0].valueDate);
          break;
        default:
          if (fieldRows[0].valueText !== null) map[field.key] = fieldRows[0].valueText;
      }
    }
    return map;
  }

  private readCore(product: Product, field: FormFieldConfig): AttributeValue | undefined {
    const key = field.key;
    if (key in CORE_NUMBER_COLUMNS) {
      return (product[CORE_NUMBER_COLUMNS[key]] as number | null) ?? undefined;
    }
    if (key in CORE_TEXT_COLUMNS) {
      return (product[CORE_TEXT_COLUMNS[key]] as string | null) ?? undefined;
    }
    if (key in CORE_BOOLEAN_COLUMNS) {
      return (product[CORE_BOOLEAN_COLUMNS[key]] as boolean | null) ?? undefined;
    }
    if (key in DIMENSION_KEYS) {
      return product.packageDimensions?.[DIMENSION_KEYS[key]] ?? undefined;
    }
    return undefined;
  }

  // ---------------------------------------------------------------------------
  // Write
  // ---------------------------------------------------------------------------

  /**
   * Merges `incoming` into the stored values, drops values of hidden / unknown fields, writes core
   * columns onto `product` (caller saves it) and diffs the attribute rows. Returns the final map.
   *
   * `strict` additionally enforces numeric / length / pattern limits (published products). Drafts
   * only get type and option checks so partially typed values never lose autosaved work.
   */
  async apply(
    manager: EntityManager,
    product: Product,
    config: FormConfig,
    incoming: Record<string, unknown>,
    options: { strict: boolean },
  ): Promise<AttributeMap> {
    const rows = await manager.find(ProductAttributeValue, {
      where: { productId: product.productId },
    });
    const existing = this.rowsToMap(config, product, rows);
    const fieldByKey = new Map(config.fields.map((field) => [field.key, field]));
    const optionsById = this.indexOptions(config);
    const errors: string[] = [];

    const merged: AttributeMap = { ...existing };
    for (const [key, raw] of Object.entries(incoming)) {
      const field = fieldByKey.get(key);
      if (!field) continue; // unknown for this category — ignored
      const normalised = this.normalise(field, raw, config, options.strict, errors, product);
      if (normalised === null) delete merged[key];
      else merged[key] = normalised;
    }
    if (errors.length > 0) throw new BadRequestException(errors);

    // Hidden fields never keep a value.
    const comparable = this.toComparable(merged, fieldByKey, optionsById);
    for (const field of config.fields) {
      if (!evaluateRule(field.visibility, comparable)) delete merged[field.key];
    }

    if (options.strict) {
      this.checkCrossFieldRules(config, merged, errors);
      if (errors.length > 0) throw new BadRequestException(errors);
    }

    this.writeCore(product, config, merged, optionsById);
    await this.syncRows(manager, product.productId, config, merged, rows);
    return merged;
  }

  /** Required-field / limit check for publishing. Returns human readable messages. */
  validateForPublish(config: FormConfig, values: AttributeMap, product: Product): string[] {
    const errors: string[] = [];
    const fieldByKey = new Map(config.fields.map((field) => [field.key, field]));
    const optionsById = this.indexOptions(config);
    const comparable = this.toComparable(values, fieldByKey, optionsById);

    for (const field of config.fields) {
      if (!evaluateRule(field.visibility, comparable)) continue;
      // Colour / border live on variants — they are not required at product level.
      if (field.isVariantAttribute) continue;
      if (['hsn_code', 'selling_type', 'video_url', 'sku'].includes(field.key)) continue;
      const value = values[field.key];
      const present = this.hasValue(value);
      const required =
        field.required || (field.rules.requiredWhen && evaluateRule(field.rules.requiredWhen, comparable));

      if (required && !present) {
        errors.push(`${field.label} is required`);
        continue;
      }
      if (present) {
        this.normalise(field, value, config, true, errors, product);
      }
    }
    this.checkCrossFieldRules(config, values, errors);
    return [...new Set(errors)];
  }

  /** Display rows for the product detail page (visible 'details' fields with a value). */
  describe(config: FormConfig, values: AttributeMap): AttributeSpec[] {
    const optionsById = this.indexOptions(config);
    const fieldByKey = new Map(config.fields.map((field) => [field.key, field]));
    const comparable = this.toComparable(values, fieldByKey, optionsById);
    const specs: AttributeSpec[] = [];

    for (const field of config.fields) {
      if (field.stepKey !== 'details') continue;
      if (field.type === 'FILE' || field.type === 'IMAGE') continue;
      if (['hsn_code', 'selling_type', 'video_url'].includes(field.key)) continue;
      if (!evaluateRule(field.visibility, comparable)) continue;
      const value = values[field.key];
      if (!this.hasValue(value)) continue;

      const text = this.formatValue(field, value, optionsById);
      if (text) {
        specs.push({ key: field.key, label: field.label, value: text, section: field.sectionLabel });
      }
    }
    return specs;
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  private indexOptions(config: FormConfig): Map<string, FormOption> {
    const byId = new Map<string, FormOption>();
    for (const options of Object.values(config.optionSets)) {
      for (const option of options) byId.set(option.categoryId, option);
    }
    return byId;
  }

  private hasValue(value: AttributeValue | undefined): boolean {
    if (value === undefined || value === null || value === '') return false;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  }

  private toComparable(
    values: AttributeMap,
    fieldByKey: Map<string, FormFieldConfig>,
    optionsById: Map<string, FormOption>,
  ): ComparableValues {
    const comparable: ComparableValues = {};
    for (const [key, value] of Object.entries(values)) {
      const field = fieldByKey.get(key);
      if (!field) continue;
      if (field.type === 'SINGLE_SELECT' || field.type === 'COLOR_SELECT') {
        comparable[key] = optionsById.get(String(value))?.code;
      } else if (field.type === 'MULTI_SELECT' && Array.isArray(value)) {
        comparable[key] = value.map((id) => optionsById.get(String(id))?.code).filter(Boolean);
      } else if (field.type === 'MEASUREMENT' && typeof value === 'object' && value !== null) {
        comparable[key] = (value as MeasurementValue).value;
      } else {
        comparable[key] = value;
      }
    }
    return comparable;
  }

  private checkCrossFieldRules(config: FormConfig, values: AttributeMap, errors: string[]) {
    for (const field of config.fields) {
      const otherKey = field.rules.gteKey;
      if (!otherKey) continue;
      const value = values[field.key];
      const other = values[otherKey];
      if (typeof value === 'number' && typeof other === 'number' && value < other) {
        const otherLabel = config.fields.find((item) => item.key === otherKey)?.label ?? otherKey;
        errors.push(`${field.label} must be greater than or equal to ${otherLabel}`);
      }
    }
  }

  /** Validates and coerces one raw value. Returns `null` for an empty value. */
  private normalise(
    field: FormFieldConfig,
    raw: unknown,
    config: FormConfig,
    strict: boolean,
    errors: string[],
    product: Product,
  ): AttributeValue {
    if (raw === undefined || raw === null || raw === '') return null;
    if (Array.isArray(raw) && raw.length === 0) return null;

    const fail = (message: string): null => {
      errors.push(`${field.label}: ${message}`);
      return null;
    };
    const rules = field.rules;

    switch (field.type) {
      case 'TEXT':
      case 'TEXTAREA':
      case 'FILE':
      case 'IMAGE': {
        if (typeof raw !== 'string') return fail('must be text');
        const text = raw.trim();
        if (!text) return null;
        const max = rules.maxLength ?? (field.type === 'TEXTAREA' ? 2000 : 255);
        if (text.length > max) return fail(`must be at most ${max} characters`);
        if (strict && rules.minLength && text.length < rules.minLength) {
          return fail(`must be at least ${rules.minLength} characters`);
        }
        if (strict && rules.pattern && !new RegExp(rules.pattern).test(text)) {
          return fail('has an invalid format');
        }
        if (field.type === 'IMAGE') {
          const mediaIds = (product.media ?? [])
            .filter((media) => media.isActive !== false)
            .map((media) => media.productMediaId);
          if (product.media && !mediaIds.includes(text)) {
            return fail('must be one of the product photos');
          }
        }
        return text;
      }

      case 'NUMBER':
      case 'DECIMAL': {
        const num = typeof raw === 'number' ? raw : Number(raw);
        if (!Number.isFinite(num)) return fail('must be a number');
        if (field.type === 'NUMBER' && !Number.isInteger(num)) return fail('must be a whole number');
        this.checkRange(field, num, strict, errors);
        return num;
      }

      case 'BOOLEAN':
        if (typeof raw !== 'boolean') return fail('must be true or false');
        return raw;

      case 'DATE':
        if (typeof raw !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw) || Number.isNaN(Date.parse(raw))) {
          return fail('must be a valid date (YYYY-MM-DD)');
        }
        return raw;

      case 'SINGLE_SELECT':
      case 'COLOR_SELECT': {
        const id = String(raw);
        const options = field.optionSetKey ? config.optionSets[field.optionSetKey] : undefined;
        if (!options?.some((option) => option.categoryId === id)) {
          return fail('is not a valid option');
        }
        return id;
      }

      case 'MULTI_SELECT': {
        if (!Array.isArray(raw)) return fail('must be a list of options');
        const options = field.optionSetKey ? config.optionSets[field.optionSetKey] : undefined;
        const ids = [...new Set(raw.map((item) => String(item)))];
        if (ids.some((id) => !options?.some((option) => option.categoryId === id))) {
          return fail('contains an invalid option');
        }
        if (strict && rules.maxItems && ids.length > rules.maxItems) {
          return fail(`allows at most ${rules.maxItems} options`);
        }
        return ids;
      }

      case 'TAG_SELECT': {
        if (!Array.isArray(raw)) return fail('must be a list of tags');
        const tags = [
          ...new Set(raw.map((item) => String(item).trim()).filter(Boolean)),
        ];
        if (tags.some((tag) => tag.length > 50)) return fail('tags must be at most 50 characters');
        const max = rules.maxItems ?? 20;
        if (tags.length > max) return fail(`allows at most ${max} tags`);
        return tags.length > 0 ? tags : null;
      }

      case 'MEASUREMENT': {
        const candidate =
          typeof raw === 'object' && raw !== null && !Array.isArray(raw)
            ? (raw as { value?: unknown; unit?: unknown })
            : { value: raw, unit: field.unit };
        const num = typeof candidate.value === 'number' ? candidate.value : Number(candidate.value);
        if (candidate.value === '' || candidate.value == null) return null;
        if (!Number.isFinite(num)) return fail('must be a number');
        const unit = String(candidate.unit ?? field.unit ?? '');
        const allowed = new Set([...(field.units ?? []), ...(field.unit ? [field.unit] : [])]);
        if (allowed.size > 0 && !allowed.has(unit)) return fail(`unit must be one of ${[...allowed].join(', ')}`);
        this.checkRange(field, num, strict, errors);
        return { value: num, unit };
      }

      default:
        return fail('has an unsupported input type');
    }
  }

  private checkRange(field: FormFieldConfig, value: number, strict: boolean, errors: string[]) {
    if (!strict) return;
    const { min, max } = field.rules;
    if (min !== undefined && value < min) errors.push(`${field.label} must be at least ${min}`);
    if (max !== undefined && value > max) errors.push(`${field.label} must be at most ${max}`);
  }

  private formatValue(
    field: FormFieldConfig,
    value: AttributeValue,
    optionsById: Map<string, FormOption>,
  ): string {
    switch (field.type) {
      case 'SINGLE_SELECT':
      case 'COLOR_SELECT':
        return optionsById.get(String(value))?.name ?? '';
      case 'MULTI_SELECT':
        return (Array.isArray(value) ? value : [])
          .map((id) => optionsById.get(String(id))?.name)
          .filter(Boolean)
          .join(', ');
      case 'TAG_SELECT':
        return Array.isArray(value) ? value.join(', ') : '';
      case 'BOOLEAN':
        return value === true ? 'Yes' : 'No';
      case 'MEASUREMENT': {
        const measurement = value as MeasurementValue;
        return `${measurement.value} ${measurement.unit}`.trim();
      }
      case 'NUMBER':
      case 'DECIMAL':
        return field.unit ? `${value} ${field.unit}` : String(value);
      default:
        return String(value);
    }
  }

  private writeCore(
    product: Product,
    config: FormConfig,
    values: AttributeMap,
    optionsById: Map<string, FormOption>,
  ) {
    const target = product as unknown as Record<string, unknown>;
    const configured = new Set(config.fields.map((field) => field.key));
    const dimensions = { ...(product.packageDimensions ?? {}) };
    let dimensionsTouched = false;

    for (const [key, column] of Object.entries(CORE_NUMBER_COLUMNS)) {
      if (!configured.has(key)) continue;
      const value = values[key];
      target[column] = typeof value === 'number' ? value : null;
    }
    for (const [key, column] of Object.entries(CORE_TEXT_COLUMNS)) {
      if (!configured.has(key)) continue;
      const value = values[key];
      target[column] = typeof value === 'string' ? value : null;
    }
    for (const [key, column] of Object.entries(CORE_BOOLEAN_COLUMNS)) {
      if (!configured.has(key)) continue;
      const value = values[key];
      target[column] = typeof value === 'boolean' ? value : null;
    }
    for (const [key, dimension] of Object.entries(DIMENSION_KEYS)) {
      if (!configured.has(key)) continue;
      dimensionsTouched = true;
      const value = values[key];
      if (typeof value === 'number') dimensions[dimension] = value;
      else delete dimensions[dimension];
    }
    if (dimensionsTouched) {
      product.packageDimensions = Object.keys(dimensions).length > 0 ? dimensions : null;
    }

    // Keep the legacy columns that other screens read in sync with the dynamic inputs.
    if (configured.has('selling_unit')) {
      const unit = optionsById.get(String(values.selling_unit ?? ''));
      product.unit = unit?.name ?? product.unit;
    }
    if (configured.has('selling_type')) {
      const type = optionsById.get(String(values.selling_type ?? ''));
      if (type) product.isCustomerSale = type.code !== 'WHOLESALE';
    }
  }

  private async syncRows(
    manager: EntityManager,
    productId: string,
    config: FormConfig,
    values: AttributeMap,
    existingRows: ProductAttributeValue[],
  ) {
    const knownKeys = new Set(config.fields.map((field) => field.key));
    const desired = new Map<string, Row[]>();

    for (const field of config.fields) {
      if (isCoreKey(field.key)) continue;
      const value = values[field.key];
      if (!this.hasValue(value)) continue;
      desired.set(field.key, this.toRows(field, value as AttributeValue));
    }

    const signature = (rows: Row[]) =>
      JSON.stringify(
        [...rows]
          .map((row) => [
            row.optionCategoryId,
            row.valueText,
            row.valueNumber,
            row.valueBoolean,
            row.valueDate,
            row.valueJson,
            row.unit,
          ])
          .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
      );

    const existingByKey = new Map<string, ProductAttributeValue[]>();
    for (const row of existingRows) {
      const list = existingByKey.get(row.inputKey) ?? [];
      list.push(row);
      existingByKey.set(row.inputKey, list);
    }

    const keysToDelete: string[] = [];
    const rowsToInsert: Row[] = [];

    for (const [key, current] of existingByKey) {
      const wanted = desired.get(key);
      // Keys no longer configured (e.g. after a category change) are pruned too.
      if (!wanted || !knownKeys.has(key)) {
        keysToDelete.push(key);
        continue;
      }
      const currentSignature = signature(
        current.map((row) => ({
          key,
          optionCategoryId: row.optionCategoryId,
          valueText: row.valueText,
          valueNumber: row.valueNumber,
          valueBoolean: row.valueBoolean,
          valueDate: row.valueDate ? String(row.valueDate) : null,
          valueJson: row.valueJson ?? null,
          unit: row.unit,
        })),
      );
      if (currentSignature !== signature(wanted)) keysToDelete.push(key);
    }

    for (const [key, rows] of desired) {
      const current = existingByKey.get(key);
      if (!current || keysToDelete.includes(key)) rowsToInsert.push(...rows);
    }

    if (keysToDelete.length > 0) {
      await manager
        .createQueryBuilder()
        .delete()
        .from(ProductAttributeValue)
        .where('product_id = :productId', { productId })
        .andWhere('input_key IN (:...keys)', { keys: keysToDelete })
        .execute();
    }

    if (rowsToInsert.length > 0) {
      const now = new Date();
      await manager.save(
        ProductAttributeValue,
        manager.create(
          ProductAttributeValue,
          rowsToInsert.map((row) => ({
            productId,
            inputKey: row.key,
            optionCategoryId: row.optionCategoryId,
            valueText: row.valueText,
            valueNumber: row.valueNumber,
            valueBoolean: row.valueBoolean,
            valueDate: row.valueDate,
            valueJson: row.valueJson ?? null,
            unit: row.unit,
            createdAt: now,
            updatedAt: now,
          })),
        ),
      );
    }
  }

  private toRows(field: FormFieldConfig, value: AttributeValue): Row[] {
    const base = (): Row => ({
      key: field.key,
      optionCategoryId: null,
      valueText: null,
      valueNumber: null,
      valueBoolean: null,
      valueDate: null,
      valueJson: null,
      unit: null,
    });

    if (SELECT_SINGLE.has(field.type)) {
      return [{ ...base(), optionCategoryId: String(value) }];
    }
    switch (field.type) {
      case 'MULTI_SELECT':
        return (value as string[]).map((id) => ({ ...base(), optionCategoryId: id }));
      case 'TAG_SELECT':
        return [{ ...base(), valueJson: value }];
      case 'MEASUREMENT': {
        const measurement = value as MeasurementValue;
        return [{ ...base(), valueNumber: measurement.value, unit: measurement.unit }];
      }
      case 'NUMBER':
      case 'DECIMAL':
        return [{ ...base(), valueNumber: value as number }];
      case 'BOOLEAN':
        return [{ ...base(), valueBoolean: value as boolean }];
      case 'DATE':
        return [{ ...base(), valueDate: value as string }];
      default:
        return [{ ...base(), valueText: String(value) }];
    }
  }
}

