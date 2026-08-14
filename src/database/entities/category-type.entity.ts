import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Category } from './category.entity';

@Entity({ name: 'category_types' })
export class CategoryType {
  @PrimaryGeneratedColumn({ name: 'category_type_id', type: 'int' })
  categoryTypeId: number;

  @Column({ name: 'category_type', type: 'varchar', length: 50, nullable: true })
  categoryType: string | null;

  @Column({ name: 'created_at', type: 'timetz', nullable: true })
  createdAt: string | null;

  @Column({ name: 'updated_at', type: 'timetz', nullable: true })
  updatedAt: string | null;

  @Column({ name: 'is_active', type: 'boolean', nullable: true })
  isActive: boolean | null;

  @OneToMany(() => Category, (category) => category.categoryType)
  categories: Category[];
}
