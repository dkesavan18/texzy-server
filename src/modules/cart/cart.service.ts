import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import {
  Cart,
  CartItem,
  Product,
  ProductVariant,
} from '../../database/entities';
import { PRODUCT_STATUS } from '../products/constants/product-status.constant';
import { AddCartItemDto, UpdateCartItemDto } from './dto/cart-item.dto';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartsRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemsRepository: Repository<CartItem>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(ProductVariant)
    private readonly variantsRepository: Repository<ProductVariant>,
  ) {}

  /** Returns the caller's cart (with live product/variant info), creating an empty one lazily. */
  async getMine(userId: string) {
    const cart = await this.getOrCreateCart(userId);
    return this.toCartResponse(cart);
  }

  async addItem(userId: string, dto: AddCartItemDto) {
    const product = await this.productsRepository.findOne({
      where: { productId: dto.productId },
    });
    if (!product) {
      throw new NotFoundException(`Product ${dto.productId} not found`);
    }
    if (
      product.isActive === false ||
      product.status !== PRODUCT_STATUS.ACTIVE
    ) {
      throw new BadRequestException(
        'This product is not available for purchase',
      );
    }

    if (dto.productVariantId) {
      const variant = await this.variantsRepository.findOne({
        where: {
          productVariantId: dto.productVariantId,
          productId: product.productId,
        },
      });
      if (!variant) {
        throw new NotFoundException(
          `Variant ${dto.productVariantId} not found for this product`,
        );
      }
    }

    const cart = await this.getOrCreateCart(userId);
    const quantity = dto.quantity ?? 1;

    const existing = await this.cartItemsRepository.findOne({
      where: {
        cartId: cart.cartId,
        productId: product.productId,
        productVariantId: dto.productVariantId ?? IsNull(),
      },
    });

    const now = new Date();
    if (existing) {
      existing.quantity += quantity;
      existing.updatedAt = now;
      await this.cartItemsRepository.save(existing);
    } else {
      await this.cartItemsRepository.save(
        this.cartItemsRepository.create({
          cartId: cart.cartId,
          productId: product.productId,
          productVariantId: dto.productVariantId ?? null,
          quantity,
          createdAt: now,
          updatedAt: now,
        }),
      );
    }

    return this.getMine(userId);
  }

  async updateItem(userId: string, cartItemId: string, dto: UpdateCartItemDto) {
    const item = await this.requireOwnedItem(userId, cartItemId);
    item.quantity = dto.quantity;
    item.updatedAt = new Date();
    await this.cartItemsRepository.save(item);
    return this.getMine(userId);
  }

  async removeItem(userId: string, cartItemId: string) {
    const item = await this.requireOwnedItem(userId, cartItemId);
    await this.cartItemsRepository.remove(item);
    return this.getMine(userId);
  }

  async clear(userId: string) {
    const cart = await this.getOrCreateCart(userId);
    await this.cartItemsRepository.delete({ cartId: cart.cartId });
    return this.getMine(userId);
  }

  /** Used by checkout — resolves cart items into validated, priced order-item candidates. */
  async getValidatedItemsForCheckout(userId: string) {
    const cart = await this.getOrCreateCart(userId);
    const items = await this.cartItemsRepository.find({
      where: { cartId: cart.cartId },
      relations: { product: true, variant: true },
    });
    if (items.length === 0) {
      throw new BadRequestException('Your cart is empty');
    }

    return items.map((item) => {
      const { product, variant } = item;
      if (
        !product ||
        product.isActive === false ||
        product.status !== PRODUCT_STATUS.ACTIVE
      ) {
        throw new BadRequestException(
          `"${product?.productName ?? 'A product'}" in your cart is no longer available`,
        );
      }

      const unitPrice = variant?.price ?? product.price;
      if (unitPrice == null || unitPrice <= 0) {
        throw new BadRequestException(
          `"${product.productName}" does not have a valid price`,
        );
      }

      const availableStock = variant?.quantity ?? product.quantity;
      if (availableStock != null && availableStock < item.quantity) {
        throw new BadRequestException(
          `Only ${availableStock} unit(s) of "${product.productName}" left in stock`,
        );
      }

      return {
        productId: product.productId,
        productVariantId: variant?.productVariantId ?? null,
        sellerUserId: product.userId,
        quantity: item.quantity,
        unitPrice,
        productName: product.productName,
      };
    });
  }

  private async getOrCreateCart(userId: string): Promise<Cart> {
    let cart = await this.cartsRepository.findOne({ where: { userId } });
    if (!cart) {
      const now = new Date();
      cart = await this.cartsRepository.save(
        this.cartsRepository.create({ userId, createdAt: now, updatedAt: now }),
      );
    }
    return cart;
  }

  private async requireOwnedItem(
    userId: string,
    cartItemId: string,
  ): Promise<CartItem> {
    const item = await this.cartItemsRepository.findOne({
      where: { cartItemId },
      relations: { cart: true },
    });
    if (!item) {
      throw new NotFoundException(`Cart item ${cartItemId} not found`);
    }
    if (item.cart.userId !== userId) {
      throw new ForbiddenException('You can only modify your own cart');
    }
    return item;
  }

  private async toCartResponse(cart: Cart) {
    const items = await this.cartItemsRepository.find({
      where: { cartId: cart.cartId },
      order: { createdAt: 'ASC' },
      relations: { product: { media: true }, variant: true },
    });
    return { ...cart, items };
  }
}
