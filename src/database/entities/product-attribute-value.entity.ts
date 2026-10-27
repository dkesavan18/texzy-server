import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Product } from './product.entity';

/**
 * One dynamic attribute value of a product. Single values use one row; a multi-select
 * stores one row per selected option (`option_category_id`).
 */
@Entity({ name: 'product_attribute_values' })
export class ProductAttributeValue {
  @PrimaryGeneratedColumn({ name: 'product_attribute_value_id', type: 'bigint' })
  productAttributeValueId: string;

  @Column({ name: 'product_id', type: 'bigint' })
  productId: string;

  @Column({ name: 'input_key', type: 'varchar', length: 80 })
  inputKey: string;

  @Column({ name: 'option_category_id', type: 'bigint', nullable: true })
  optionCategoryId: string | null;

  @Column({ name: 'value_text', type: 'text', nullable: true })
  valueText: string | null;

  @Column({ name: 'value_number', type: 'float8', nullable: true })
  valueNumber: number | null;

  @Column({ name: 'value_boolean', type: 'boolean', nullable: true })
  valueBoolean: boolean | null;

  @Column({ name: 'value_date', type: 'date', nullable: true })
  valueDate: string | null;

  @Column({ name: 'value_json', type: 'jsonb', nullable: true })
  valueJson: unknown;

  @Column({ name: 'unit', type: 'varchar', length: 30, nullable: true })
  unit: string | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'NOW()' })
  updatedAt: Date;

  @ManyToOne(() => Product, (product) => product.attributeValues, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;
}
