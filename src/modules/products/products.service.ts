import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { dbTimetzNow } from '../../common/utils/auth.utils';
import { Product } from '../../database/entities';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
  ) {}

  findAll(take = 50) {
    return this.productsRepository.find({
      where: { isActive: true },
      take,
      order: { productId: 'DESC' },
      relations: { media: true },
    });
  }

  findAllByUser(userId: string, take = 100) {
    return this.productsRepository.find({
      where: { userId, isActive: true },
      take,
      order: { productId: 'DESC' },
      relations: { media: true },
    });
  }

  async findOne(productId: string) {
    const product = await this.productsRepository.findOne({
      where: { productId },
      relations: { media: true },
    });
    if (!product) {
      throw new NotFoundException(`Product ${productId} not found`);
    }
    return product;
  }

  async create(userId: string, dto: CreateProductDto) {
    const now = dbTimetzNow();
    const product = this.productsRepository.create({
      ...dto,
      userId,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    return this.productsRepository.save(product);
  }

  async update(userId: string, productId: string, dto: UpdateProductDto) {
    const product = await this.findOne(productId);
    if (product.userId && product.userId !== userId) {
      throw new ForbiddenException('You can only update your own products');
    }
    Object.assign(product, dto, { updatedAt: dbTimetzNow() });
    return this.productsRepository.save(product);
  }

  async remove(userId: string, productId: string) {
    const product = await this.findOne(productId);
    if (product.userId && product.userId !== userId) {
      throw new ForbiddenException('You can only delete your own products');
    }
    product.isActive = false;
    product.updatedAt = dbTimetzNow();
    await this.productsRepository.save(product);
    return { success: true };
  }
}
