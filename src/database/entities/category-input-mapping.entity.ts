import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Category } from './category.entity';

export const INPUT_TYPES = [
  'TEXT',
  'TEXTAREA',
  'NUMBER',
  'DECIMAL',
  'BOOLEAN',
  'SINGLE_SELECT',
  'MULTI_SELECT',
  'DATE',
  'COLOR_SELECT',
  'IMAGE',
  'FILE',
  'MEASUREMENT',
  'TAG_SELECT',
] as const;

export type InputType = (typeof INPUT_TYPES)[number];

export const INPUT_STEPS = ['details', 'pricing'] as const;
export type InputStep = (typeof INPUT_STEPS)[number];

/** Conditional-visibility rule evaluated against the other field values of the form. */
export type VisibilityRule =
  | { key: string; op: 'eq' | 'neq' | 'in' | 'notIn' | 'truthy' | 'falsy'; value?: unknown }
  | { all: VisibilityRule[] }
  | { any: VisibilityRule[] };

export type ValidationRules = {
  min?: number;
  max?: number;
  step?: number;
  minLength?: number;
  maxLength?: number;
  maxItems?: number;
  pattern?: string;
  /** Value must be >= the value of another field (e.g. mrp >= price). */
  gteKey?: string;
  /** Field becomes required while this rule matches. */
  requiredWhen?: VisibilityRule;
  /** Only top-level options (parent_id IS NULL) are offered. */
  optionsRootOnly?: boolean;
};

/**
 * Maps a dynamic input to a product group / product type. `categoryId = NULL` means the
 * field applies to every product category.
 */
@Entity({ name: 'category_input_mapping' })
export class CategoryInputMapping {
  @PrimaryGeneratedColumn({ name: 'id', type: 'bigint' })
  id: string;

  @Column({ name: 'category_id', type: 'bigint', nullable: true })
  categoryId: string | null;

  @Column({ name: 'input_key', type: 'varchar', length: 80 })
  inputKey: string;

  @Column({ name: 'input_label', type: 'varchar', length: 150 })
  inputLabel: string;

  @Column({ name: 'input_type', type: 'varchar', length: 30 })
  inputType: InputType;

  /** `category_types.code` that supplies dropdown options. */
  @Column({ name: 'option_category_type', type: 'varchar', length: 60, nullable: true })
  optionCategoryType: string | null;

  @Column({ name: 'option_parent_id', type: 'bigint', nullable: true })
  optionParentId: string | null;

  @Column({ name: 'step_key', type: 'varchar', length: 30, default: 'details' })
  stepKey: InputStep;

  @Column({ name: 'section_key', type: 'varchar', length: 60, default: 'basic' })
  sectionKey: string;

  @Column({ name: 'section_label', type: 'varchar', length: 120, default: 'Basic Information' })
  sectionLabel: string;

  @Column({ name: 'is_required', type: 'boolean', default: false })
  isRequired: boolean;

  @Column({ name: 'is_variant_attribute', type: 'boolean', default: false })
  isVariantAttribute: boolean;

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number;

  @Column({ name: 'validation_rules', type: 'jsonb', default: () => "'{}'" })
  validationRules: ValidationRules;

  @Column({ name: 'visibility_rule', type: 'jsonb', nullable: true })
  visibilityRule: VisibilityRule | null;

  @Column({ name: 'unit', type: 'varchar', length: 30, nullable: true })
  unit: string | null;

  @Column({ name: 'unit_options', type: 'jsonb', nullable: true })
  unitOptions: string[] | null;

  @Column({ name: 'default_value', type: 'text', nullable: true })
  defaultValue: string | null;

  @Column({ name: 'placeholder', type: 'varchar', length: 200, nullable: true })
  placeholder: string | null;

  @Column({ name: 'help_text', type: 'varchar', length: 300, nullable: true })
  helpText: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'created_at', type: 'timestamptz', nullable: true })
  createdAt: Date | null;

  @Column({ name: 'updated_at', type: 'timestamptz', nullable: true })
  updatedAt: Date | null;

  @ManyToOne(() => Category, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'category_id' })
  category: Category | null;
}
