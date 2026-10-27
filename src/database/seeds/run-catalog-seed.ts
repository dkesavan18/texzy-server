/**
 * Idempotent seed for the product catalogue overhaul:
 *   1. PRODUCT_CATEGORY hierarchy (groups -> product types) with codes + parent_id
 *   2. Shared option sets (MATERIAL, COLOUR, ...) as category types + categories
 *   3. category_input_mapping rows that drive the dynamic product form
 *   4. Re-points existing products to the new product types and removes the legacy
 *      product categories / category types
 *
 * Run (after migrations/019_product_catalog_overhaul.sql):  npm run seed:catalog
 * Everything runs in a single transaction — a failure leaves the database untouched.
 */
import { existsSync } from 'node:fs';
import { Client } from 'pg';
import {
  assertUnique,
  codeToName,
  nameToCode,
} from './catalog/catalog.helpers';
import {
  INPUT_SCOPES,
  GLOBAL_FIELDS,
  type InputDefinition,
} from './catalog/input-definitions.data';
import {
  OPTION_SETS,
  type OptionValueSeed,
} from './catalog/option-values.data';
import {
  LEGACY_CATEGORY_REMAP,
  LEGACY_PRODUCT_CATEGORY_TYPES,
  PRODUCT_CATEGORY_TYPE_CODE,
  PRODUCT_GROUPS,
} from './catalog/product-categories.data';

type Db = Pick<Client, 'query'>;

async function upsertCategoryType(
  db: Db,
  code: string,
  options: { reuseLegacyName?: string } = {},
): Promise<number> {
  if (options.reuseLegacyName) {
    const legacy = await db.query<{ category_type_id: number }>(
      `SELECT category_type_id FROM category_types
       WHERE code = $1 OR LOWER(category_type) = LOWER($2)
       ORDER BY category_type_id LIMIT 1`,
      [code, options.reuseLegacyName],
    );
    if (legacy.rows[0]) {
      await db.query(
        `UPDATE category_types
         SET category_type = $2, code = $1, is_active = true, updated_at = CURRENT_TIME
         WHERE category_type_id = $3`,
        [code, code, legacy.rows[0].category_type_id],
      );
      return legacy.rows[0].category_type_id;
    }
  }

  const existing = await db.query<{ category_type_id: number }>(
    `SELECT category_type_id FROM category_types WHERE code = $1`,
    [code],
  );
  if (existing.rows[0]) {
    await db.query(
      `UPDATE category_types SET is_active = true, updated_at = CURRENT_TIME
       WHERE category_type_id = $1`,
      [existing.rows[0].category_type_id],
    );
    return existing.rows[0].category_type_id;
  }

  const inserted = await db.query<{ category_type_id: number }>(
    `INSERT INTO category_types (category_type, code, is_active, created_at, updated_at)
     VALUES ($1, $1, true, CURRENT_TIME, CURRENT_TIME)
     RETURNING category_type_id`,
    [code],
  );
  return inserted.rows[0].category_type_id;
}

async function upsertCategory(
  db: Db,
  input: {
    typeId: number;
    code: string;
    name: string;
    parentId: string | null;
    displayOrder: number;
    metadata?: Record<string, unknown> | null;
  },
): Promise<string> {
  const result = await db.query<{ category_id: string }>(
    `INSERT INTO categories
       (category_type_id, code, category_name, parent_id, display_order, metadata,
        is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, true, CURRENT_TIME, CURRENT_TIME)
     ON CONFLICT (category_type_id, code) WHERE code IS NOT NULL
     DO UPDATE SET
       category_name = EXCLUDED.category_name,
       parent_id = EXCLUDED.parent_id,
       display_order = EXCLUDED.display_order,
       metadata = EXCLUDED.metadata,
       is_active = true,
       updated_at = CURRENT_TIME
     RETURNING category_id`,
    [
      input.typeId,
      input.code,
      input.name,
      input.parentId,
      input.displayOrder,
      input.metadata ? JSON.stringify(input.metadata) : null,
    ],
  );
  return result.rows[0].category_id;
}

function normaliseValue(value: string | OptionValueSeed): OptionValueSeed {
  return typeof value === 'string' ? { name: value } : value;
}

async function seedProductCategories(
  db: Db,
): Promise<{ typeId: number; idByCode: Map<string, string>; allCodes: string[] }> {
  const typeId = await upsertCategoryType(db, PRODUCT_CATEGORY_TYPE_CODE, {
    reuseLegacyName: 'product_category',
  });

  const allCodes = PRODUCT_GROUPS.flatMap((group) => [group.code, ...group.types]);
  assertUnique('PRODUCT_CATEGORY tree', allCodes);

  const idByCode = new Map<string, string>();
  for (const [groupIndex, group] of PRODUCT_GROUPS.entries()) {
    const groupId = await upsertCategory(db, {
      typeId,
      code: group.code,
      name: codeToName(group.code),
      parentId: null,
      displayOrder: (groupIndex + 1) * 10,
    });
    idByCode.set(group.code, groupId);

    for (const [typeIndex, code] of group.types.entries()) {
      const id = await upsertCategory(db, {
        typeId,
        code,
        name: codeToName(code),
        parentId: groupId,
        displayOrder: (typeIndex + 1) * 10,
      });
      idByCode.set(code, id);
    }
  }
  return { typeId, idByCode, allCodes };
}

async function seedOptionSets(db: Db): Promise<number> {
  let total = 0;
  assertUnique(
    'option sets',
    OPTION_SETS.map((set) => set.code),
  );

  for (const set of OPTION_SETS) {
    const typeId = await upsertCategoryType(db, set.code);
    const values = set.values.map(normaliseValue);
    assertUnique(
      `option set ${set.code}`,
      values.map((value) => value.code ?? nameToCode(value.name)),
    );

    const idByName = new Map<string, string>();
    // Base (parent) values first so children can reference them.
    const ordered = [
      ...values.filter((value) => !value.parent),
      ...values.filter((value) => value.parent),
    ];

    for (const value of ordered) {
      const code = value.code ?? nameToCode(value.name);
      const parentId = value.parent ? (idByName.get(value.parent) ?? null) : null;
      if (value.parent && !parentId) {
        throw new Error(`Parent "${value.parent}" not found for ${set.code}/${value.name}`);
      }
      const order = (values.indexOf(value) + 1) * 10;
      const id = await upsertCategory(db, {
        typeId,
        code,
        name: value.name,
        parentId,
        displayOrder: order,
        metadata: value.hex ? { hex: value.hex.toUpperCase() } : null,
      });
      idByName.set(value.name, id);
      total += 1;
    }
  }
  return total;
}

async function retireLegacyProductCategories(
  db: Db,
  productTypeId: number,
  idByCode: Map<string, string>,
  seededCodes: string[],
): Promise<{ remapped: number; removed: number }> {
  const legacy = await db.query<{ category_id: string; category_name: string | null }>(
    `SELECT c.category_id, c.category_name
     FROM categories c
     JOIN category_types ct ON ct.category_type_id = c.category_type_id
     WHERE (ct.category_type = ANY($1::text[]) OR ct.category_type_id = $2)
       AND NOT (c.category_type_id = $2 AND c.code = ANY($3::text[]))`,
    [LEGACY_PRODUCT_CATEGORY_TYPES, productTypeId, seededCodes],
  );

  let remapped = 0;
  for (const row of legacy.rows) {
    const targetCode = LEGACY_CATEGORY_REMAP[(row.category_name ?? '').trim().toLowerCase()];
    const targetId = targetCode ? idByCode.get(targetCode) : undefined;
    if (!targetId) continue;
    const result = await db.query(
      `UPDATE products SET product_category_id = $1 WHERE product_category_id = $2`,
      [targetId, row.category_id],
    );
    remapped += result.rowCount ?? 0;
  }

  const legacyIds = legacy.rows.map((row) => row.category_id);
  if (legacyIds.length > 0) {
    // Anything not remapped loses its category (the seller re-selects it when editing).
    await db.query(
      `UPDATE products SET product_category_id = NULL WHERE product_category_id = ANY($1::bigint[])`,
      [legacyIds],
    );
    await db.query(
      `UPDATE products SET product_subcategory_id = NULL WHERE product_subcategory_id = ANY($1::bigint[])`,
      [legacyIds],
    );
    await db.query(`DELETE FROM categories WHERE category_id = ANY($1::bigint[])`, [legacyIds]);
  }

  await db.query(
    `DELETE FROM category_types ct
     WHERE ct.category_type = ANY($1::text[])
       AND ct.category_type_id <> $2
       AND NOT EXISTS (SELECT 1 FROM categories c WHERE c.category_type_id = ct.category_type_id)`,
    [LEGACY_PRODUCT_CATEGORY_TYPES, productTypeId],
  );

  return { remapped, removed: legacyIds.length };
}

async function upsertMapping(
  db: Db,
  categoryId: string | null,
  field: InputDefinition,
  isActive: boolean,
): Promise<void> {
  const params = [
    categoryId,
    field.key,
    field.label,
    field.type,
    field.option ?? null,
    field.step,
    field.sectionKey,
    field.sectionLabel,
    Boolean(field.required),
    Boolean(field.variant),
    field.order,
    JSON.stringify(field.rules ?? {}),
    field.visible ? JSON.stringify(field.visible) : null,
    field.unit ?? null,
    field.units ? JSON.stringify(field.units) : null,
    field.defaultValue ?? null,
    field.placeholder ?? null,
    field.help ?? null,
    isActive,
  ];

  const conflictTarget =
    categoryId === null
      ? `(input_key) WHERE category_id IS NULL`
      : `(category_id, input_key) WHERE category_id IS NOT NULL`;

  await db.query(
    `INSERT INTO category_input_mapping
       (category_id, input_key, input_label, input_type, option_category_type, step_key,
        section_key, section_label, is_required, is_variant_attribute, display_order,
        validation_rules, visibility_rule, unit, unit_options, default_value, placeholder,
        help_text, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13::jsonb,$14,$15::jsonb,$16,$17,$18,$19)
     ON CONFLICT ${conflictTarget}
     DO UPDATE SET
       input_label = EXCLUDED.input_label,
       input_type = EXCLUDED.input_type,
       option_category_type = EXCLUDED.option_category_type,
       step_key = EXCLUDED.step_key,
       section_key = EXCLUDED.section_key,
       section_label = EXCLUDED.section_label,
       is_required = EXCLUDED.is_required,
       is_variant_attribute = EXCLUDED.is_variant_attribute,
       display_order = EXCLUDED.display_order,
       validation_rules = EXCLUDED.validation_rules,
       visibility_rule = EXCLUDED.visibility_rule,
       unit = EXCLUDED.unit,
       unit_options = EXCLUDED.unit_options,
       default_value = EXCLUDED.default_value,
       placeholder = EXCLUDED.placeholder,
       help_text = EXCLUDED.help_text,
       is_active = EXCLUDED.is_active,
       updated_at = NOW()`,
    params,
  );
}

/** Inputs that were removed from the product form (HSN, selling type, video link → video upload). */
const RETIRED_INPUT_KEYS = ['hsn_code', 'selling_type', 'video_url'];

async function seedInputMappings(db: Db, idByCode: Map<string, string>): Promise<number> {
  await db.query(`DELETE FROM category_input_mapping WHERE input_key = ANY($1::text[])`, [
    RETIRED_INPUT_KEYS,
  ]);
  const optionCodes = new Set(OPTION_SETS.map((set) => set.code));
  optionCodes.add(PRODUCT_CATEGORY_TYPE_CODE);
  let count = 0;

  for (const scope of INPUT_SCOPES) {
    const categoryId = scope.scope === null ? null : (idByCode.get(scope.scope) ?? null);
    if (scope.scope !== null && !categoryId) {
      throw new Error(`Unknown product group/type "${scope.scope}" in input definitions`);
    }

    assertUnique(
      `inputs of ${scope.scope ?? 'GLOBAL'}`,
      scope.fields.map((field) => field.key),
    );

    for (const field of scope.fields) {
      if (field.option && !optionCodes.has(field.option)) {
        throw new Error(`Field ${field.key} references unknown option set ${field.option}`);
      }
      await upsertMapping(db, categoryId, field, true);
      count += 1;
    }

    for (const key of scope.exclude ?? []) {
      const inherited = GLOBAL_FIELDS.find((field) => field.key === key);
      if (!inherited || categoryId === null) {
        throw new Error(`Cannot exclude "${key}" for ${scope.scope ?? 'GLOBAL'}`);
      }
      await upsertMapping(db, categoryId, inherited, false);
      count += 1;
    }
  }
  return count;
}

async function main(): Promise<void> {
  if (existsSync('.env') && typeof process.loadEnvFile === 'function') {
    process.loadEnvFile('.env');
  }

  const client = new Client({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });
  await client.connect();

  try {
    await client.query('BEGIN');

    const { typeId, idByCode, allCodes } = await seedProductCategories(client);
    const optionValues = await seedOptionSets(client);
    const legacy = await retireLegacyProductCategories(client, typeId, idByCode, allCodes);
    const mappings = await seedInputMappings(client, idByCode);

    await client.query('COMMIT');

    console.log(
      [
        'Catalog seed complete:',
        `  product groups : ${PRODUCT_GROUPS.length}`,
        `  product types  : ${allCodes.length - PRODUCT_GROUPS.length}`,
        `  option sets    : ${OPTION_SETS.length} (${optionValues} values)`,
        `  input mappings : ${mappings}`,
        `  legacy removed : ${legacy.removed} categories (${legacy.remapped} product(s) re-pointed)`,
      ].join('\n'),
    );
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error('Catalog seed failed — no changes were applied.');
  console.error(error);
  process.exit(1);
});
