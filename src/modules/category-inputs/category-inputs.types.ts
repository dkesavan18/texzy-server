import type {
  InputStep,
  InputType,
  ValidationRules,
  VisibilityRule,
} from '../../database/entities/category-input-mapping.entity';

export const PRODUCT_CATEGORY_TYPE_CODE = 'PRODUCT_CATEGORY';

export type FormFieldConfig = {
  id: string;
  key: string;
  label: string;
  type: InputType;
  /** category_types.code supplying the options (select-like inputs). */
  optionType: string | null;
  /** Key into `FormConfig.optionSets`. */
  optionSetKey: string | null;
  stepKey: InputStep;
  sectionKey: string;
  sectionLabel: string;
  required: boolean;
  isVariantAttribute: boolean;
  order: number;
  rules: ValidationRules;
  visibility: VisibilityRule | null;
  unit: string | null;
  units: string[] | null;
  defaultValue: string | null;
  placeholder: string | null;
  helpText: string | null;
  /** Where the field was defined: every product, the product group, or the product type. */
  scope: 'GLOBAL' | 'GROUP' | 'TYPE';
};

export type FormOption = {
  categoryId: string;
  code: string;
  name: string;
  parentId: string | null;
  hex: string | null;
};

export type FormConfig = {
  category: {
    categoryId: string;
    code: string | null;
    name: string | null;
    groupId: string | null;
    groupCode: string | null;
    groupName: string | null;
  };
  fields: FormFieldConfig[];
  optionSets: Record<string, FormOption[]>;
};
