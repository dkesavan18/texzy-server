import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ProductVariant } from './product-variant.entity';

/** The value a variant takes for one variant attribute (e.g. colour = Rani Pink). */
@Entity({ name: 'product_variant_attributes' })
export class ProductVariantAttribute {
  @PrimaryGeneratedColumn({ name: 'product_variant_attribute_id', type: 'bigint' })
  productVariantAttributeId: string;

  @Column({ name: 'product_variant_id', type: 'bigint' })
  productVariantId: string;

  @Column({ name: 'input_key', type: 'varchar', length: 80 })
  inputKey: string;

  @Column({ name: 'option_category_id', type: 'bigint', nullable: true })
  optionCategoryId: string | null;

  @Column({ name: 'value_text', type: 'varchar', length: 200, nullable: true })
  valueText: string | null;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt: Date;

  @ManyToOne(() => ProductVariant, (variant) => variant.attributes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_variant_id' })
  variant: ProductVariant;
}
