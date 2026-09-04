import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { dbTimetzNow } from '../../common/utils/auth.utils';
import {
  Conversation,
  Deal,
  DealStatus,
  Need,
  NeedResponse,
  Product,
  Profile,
} from '../../database/entities';
import {
  NOTIFICATION_REFERENCE_TYPE,
  NOTIFICATION_TYPE,
} from '../notifications/constants/notification-type.constant';
import { NotificationsService } from '../notifications/notifications.service';
import {
  DEAL_SOURCE_KIND,
  DEAL_STATUS,
  type QuotationDocument,
} from './constants/deal-status.constant';
import {
  CreateDealFromNeedResponseDto,
  CreateDealFromProductDto,
  RespondDealDto,
  UpdateDealStatusDto,
} from './dto/deal.dto';
import {
  buildQuotationPdf,
  parseQuotationNotes,
  stringifyQuotation,
} from './quotation-pdf';

@Injectable()
export class DealsService {
  constructor(
    @InjectRepository(Deal)
    private readonly dealsRepository: Repository<Deal>,
    @InjectRepository(DealStatus)
    private readonly dealStatusRepository: Repository<DealStatus>,
    @InjectRepository(Conversation)
    private readonly conversationsRepository: Repository<Conversation>,
    @InjectRepository(Need)
    private readonly needsRepository: Repository<Need>,
    @InjectRepository(NeedResponse)
    private readonly needResponsesRepository: Repository<NeedResponse>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(Profile)
    private readonly profilesRepository: Repository<Profile>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findMine(userId: string, role?: 'buyer' | 'seller') {
    const where =
      role === 'buyer'
        ? { buyerUserId: userId }
        : role === 'seller'
          ? { sellerUserId: userId }
          : [{ buyerUserId: userId }, { sellerUserId: userId }];

    const deals = await this.dealsRepository.find({
      where,
      order: { dealId: 'DESC' },
      take: 100,
      relations: { statusHistory: true },
    });
    return Promise.all(deals.map((deal) => this.toDealResponse(deal, userId)));
  }

  async findOneForUser(userId: string, dealId: string) {
    const deal = await this.requireParticipant(userId, dealId);
    return this.toDealResponse(deal, userId);
  }

  /**
   * Buyer starts a Bulk Order from a seller's need response
   * (request → response → bulk order).
   */
  async createFromNeedResponse(
    buyerUserId: string,
    dto: CreateDealFromNeedResponseDto,
  ) {
    const response = await this.needResponsesRepository.findOne({
      where: { needResponseId: dto.needResponseId, isActive: true },
      relations: { media: true },
    });
    if (!response?.needId) {
      throw new NotFoundException('Need response not found');
    }

    const need = await this.needsRepository.findOne({
      where: { needId: response.needId, isActive: true },
      relations: { media: true },
    });
    if (!need) {
      throw new NotFoundException('Need not found');
    }
    if (need.userId !== buyerUserId) {
      throw new ForbiddenException(
        'Only the request owner can start a bulk order from a response',
      );
    }
    if (!response.reponsedBy) {
      throw new BadRequestException('Response has no seller');
    }
    if (response.reponsedBy === buyerUserId) {
      throw new BadRequestException('Invalid buyer/seller pair');
    }

    const quantity =
      dto.quantity ?? response.availableQuantity ?? need.quantity ?? 1;
    const unitPrice = response.estimatedPrice ?? null;
    const unit = response.unit ?? need.unit ?? null;

    const images = [
      ...(response.media ?? [])
        .filter((item) => item.isActive !== false)
        .map((item) => item.mediaUrl ?? item.thumbnailUrl)
        .filter(Boolean),
      ...(need.media ?? [])
        .filter((item) => item.isActive !== false)
        .map((item) => item.mediaUrl ?? item.thumbnailUrl)
        .filter(Boolean),
    ].filter((url): url is string => Boolean(url));

    const quotation: QuotationDocument = {
      version: 1,
      kind: DEAL_SOURCE_KIND.NEED_RESPONSE,
      title: need.title ?? 'Bulk order request',
      description: need.needDescription,
      unit,
      unitPrice,
      quantity,
      lineTotal:
        unitPrice != null ? Math.round(unitPrice * quantity * 100) / 100 : null,
      currency: 'INR',
      productId: null,
      needId: need.needId,
      needResponseId: response.needResponseId,
      images: [...new Set(images)].slice(0, 8),
      buyerNote: dto.notes?.trim() || null,
      sellerNote: response.message,
      deliverAddress: dto.deliverAddress?.trim() || need.address,
      specs: [
        need.priority ? { label: 'Priority', value: need.priority } : null,
        need.budgetMin != null || need.budgetMax != null
          ? {
              label: 'Budget',
              value: `${need.budgetMin ?? '—'} – ${need.budgetMax ?? '—'}`,
            }
          : null,
        response.estimatedDelivery
          ? { label: 'Est. delivery', value: response.estimatedDelivery }
          : null,
      ].filter(Boolean) as { label: string; value: string }[],
    };

    return this.createDealRecord({
      buyerUserId,
      sellerUserId: response.reponsedBy,
      sourceType: DEAL_SOURCE_KIND.NEED_RESPONSE,
      sourceId: response.needResponseId,
      quantity,
      finalPrice: quotation.lineTotal,
      deliverAddress: quotation.deliverAddress,
      quotation,
      initialStatus:
        unitPrice != null ? DEAL_STATUS.QUOTED : DEAL_STATUS.PENDING,
    });
  }

  /** Buyer requests a bulk order for a product that allows bulk. */
  async createFromProduct(buyerUserId: string, dto: CreateDealFromProductDto) {
    const product = await this.productsRepository.findOne({
      where: { productId: dto.productId, isActive: true },
      relations: { media: true },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    if (!product.allowBulkOrder) {
      throw new BadRequestException('This product does not allow bulk orders');
    }
    if (!product.userId) {
      throw new BadRequestException('Product has no seller');
    }
    if (product.userId === buyerUserId) {
      throw new BadRequestException('You cannot bulk-order your own product');
    }
    if (
      product.minOrderQuantity != null &&
      dto.quantity < product.minOrderQuantity
    ) {
      throw new BadRequestException(
        `Minimum order quantity is ${product.minOrderQuantity}`,
      );
    }

    const unitPrice = product.price ?? null;
    const quantity = dto.quantity;
    const images = (product.media ?? [])
      .filter((item) => item.isActive !== false)
      .map((item) => item.mediaUrl ?? item.thumbnailUrl)
      .filter((url): url is string => Boolean(url));

    const quotation: QuotationDocument = {
      version: 1,
      kind: DEAL_SOURCE_KIND.PRODUCT,
      title: product.productName ?? 'Bulk product order',
      description: product.description,
      unit: product.unit,
      unitPrice,
      quantity,
      lineTotal:
        unitPrice != null ? Math.round(unitPrice * quantity * 100) / 100 : null,
      currency: 'INR',
      productId: product.productId,
      needId: null,
      needResponseId: null,
      images: [...new Set(images)].slice(0, 8),
      buyerNote: dto.notes?.trim() || null,
      sellerNote: null,
      deliverAddress: dto.deliverAddress?.trim() || null,
      specs: [
        product.minOrderQuantity != null
          ? {
              label: 'Min order qty',
              value: String(product.minOrderQuantity),
            }
          : null,
        product.priceType
          ? { label: 'Price type', value: product.priceType }
          : null,
      ].filter(Boolean) as { label: string; value: string }[],
    };

    return this.createDealRecord({
      buyerUserId,
      sellerUserId: product.userId,
      sourceType: DEAL_SOURCE_KIND.PRODUCT,
      sourceId: product.productId,
      quantity,
      finalPrice: quotation.lineTotal,
      deliverAddress: quotation.deliverAddress,
      quotation,
      initialStatus: DEAL_STATUS.PENDING,
    });
  }

  /** Seller or buyer updates price/qty/status on a bulk-order deal. */
  async respond(userId: string, dealId: string, dto: RespondDealDto) {
    const deal = await this.requireParticipant(userId, dealId);
    const isSeller = deal.sellerUserId === userId;
    const isBuyer = deal.buyerUserId === userId;
    const quotation =
      parseQuotationNotes(deal.notes) ?? this.emptyQuotationFromDeal(deal);

    if (dto.finalPrice !== undefined) {
      deal.finalPrice =
        Math.round(
          dto.finalPrice * (dto.quantity ?? deal.quantity ?? 1) * 100,
        ) / 100;
      quotation.unitPrice = dto.finalPrice;
      quotation.lineTotal =
        Math.round(
          dto.finalPrice * (dto.quantity ?? quotation.quantity) * 100,
        ) / 100;
    }
    if (dto.quantity !== undefined) {
      deal.quantity = dto.quantity;
      quotation.quantity = dto.quantity;
      if (quotation.unitPrice != null) {
        quotation.lineTotal =
          Math.round(quotation.unitPrice * dto.quantity * 100) / 100;
        deal.finalPrice = quotation.lineTotal;
      }
    }
    if (dto.deliverAddress !== undefined) {
      deal.deliverAddress = dto.deliverAddress.trim() || null;
      quotation.deliverAddress = deal.deliverAddress;
    }
    if (dto.note !== undefined) {
      if (isSeller) quotation.sellerNote = dto.note.trim() || null;
      if (isBuyer) quotation.buyerNote = dto.note.trim() || null;
    }

    let nextStatus = dto.status;
    if (!nextStatus) {
      if (
        isSeller &&
        (dto.finalPrice !== undefined || dto.quantity !== undefined)
      ) {
        nextStatus = DEAL_STATUS.QUOTED;
      } else if (
        isBuyer &&
        (dto.finalPrice !== undefined || dto.quantity !== undefined)
      ) {
        nextStatus = DEAL_STATUS.COUNTERED;
      }
    }
    if (nextStatus) {
      deal.status = nextStatus;
      if (nextStatus === DEAL_STATUS.COMPLETED) {
        deal.completedAt = dbTimetzNow();
      }
    }

    deal.notes = stringifyQuotation(quotation);
    await this.dealsRepository.save(deal);

    if (nextStatus) {
      await this.appendStatus(deal.dealId, nextStatus, userId);
    }

    // Seller replying notifies the buyer (QUOTE_RESPONSE); buyer countering/messaging
    // notifies the seller (QUOTE_MESSAGE). Either way the counterparty lands back on
    // the same Quotation conversation.
    const counterpartyUserId = isSeller ? deal.buyerUserId : deal.sellerUserId;
    if (counterpartyUserId) {
      void this.notificationsService.notify({
        userId: counterpartyUserId,
        type: isSeller
          ? NOTIFICATION_TYPE.QUOTE_RESPONSE
          : NOTIFICATION_TYPE.QUOTE_MESSAGE,
        title: isSeller
          ? 'Seller responded to your bulk order'
          : 'New message on your quotation',
        message: `${quotation.title} — ${nextStatus ? `status: ${nextStatus}` : 'updated'}`,
        referenceId: deal.dealId,
        referenceType: NOTIFICATION_REFERENCE_TYPE.DEAL,
        data: { link: `/catalogues/bulk/${deal.dealId}` },
      });
    }

    return this.toDealResponse(deal, userId);
  }

  async updateStatus(userId: string, dealId: string, dto: UpdateDealStatusDto) {
    return this.respond(userId, dealId, { status: dto.status });
  }

  async downloadQuotationPdf(userId: string, dealId: string) {
    const deal = await this.requireParticipant(userId, dealId);
    const quotation =
      parseQuotationNotes(deal.notes) ?? this.emptyQuotationFromDeal(deal);
    const names = await this.profileNames([
      deal.buyerUserId,
      deal.sellerUserId,
    ]);

    const buffer = await buildQuotationPdf({
      dealId: deal.dealId,
      status: deal.status ?? 'pending',
      createdAt: deal.createdAt,
      buyerName: names.get(deal.buyerUserId ?? '') ?? 'Buyer',
      sellerName: names.get(deal.sellerUserId ?? '') ?? 'Seller',
      quotation,
    });

    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="texzy-bulk-order-${deal.dealId}.pdf"`,
    });
  }

  private async createDealRecord(input: {
    buyerUserId: string;
    sellerUserId: string;
    sourceType: string;
    sourceId: string;
    quantity: number;
    finalPrice: number | null;
    deliverAddress: string | null;
    quotation: QuotationDocument;
    initialStatus: string;
  }) {
    const now = dbTimetzNow();
    const conversation = await this.conversationsRepository.save(
      this.conversationsRepository.create({
        buyerUserId: input.buyerUserId,
        sellerUserId: input.sellerUserId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        createdAt: now,
        updatedAt: now,
      }),
    );

    const deal = await this.dealsRepository.save(
      this.dealsRepository.create({
        conversationId: conversation.conversationId,
        buyerUserId: input.buyerUserId,
        sellerUserId: input.sellerUserId,
        sourceId: input.sourceId,
        finalPrice: input.finalPrice,
        quantity: input.quantity,
        deliverAddress: input.deliverAddress,
        notes: stringifyQuotation(input.quotation),
        status: input.initialStatus,
        contactShared: false,
        createdAt: now,
      }),
    );

    await this.appendStatus(
      deal.dealId,
      input.initialStatus,
      input.buyerUserId,
    );

    void this.notificationsService.notify({
      userId: input.sellerUserId,
      type: NOTIFICATION_TYPE.QUOTE_REQUEST,
      title: 'New quotation request',
      message: `${input.quotation.title} — qty ${input.quantity}`,
      referenceId: deal.dealId,
      referenceType: NOTIFICATION_REFERENCE_TYPE.DEAL,
      data: { link: `/catalogues/bulk/${deal.dealId}` },
    });

    return this.toDealResponse(deal, input.buyerUserId);
  }

  private async appendStatus(
    dealId: string,
    status: string,
    changedBy: string,
  ) {
    await this.dealStatusRepository.save(
      this.dealStatusRepository.create({
        dealId,
        status,
        changedBy,
        createdAt: dbTimetzNow(),
      }),
    );
  }

  private async requireParticipant(userId: string, dealId: string) {
    const deal = await this.dealsRepository.findOne({
      where: { dealId },
      relations: { statusHistory: true },
    });
    if (!deal) {
      throw new NotFoundException(`Deal ${dealId} not found`);
    }
    if (deal.buyerUserId !== userId && deal.sellerUserId !== userId) {
      throw new ForbiddenException('You are not a participant in this deal');
    }
    return deal;
  }

  private emptyQuotationFromDeal(deal: Deal): QuotationDocument {
    return {
      version: 1,
      kind: DEAL_SOURCE_KIND.PRODUCT,
      title: `Bulk order #${deal.dealId}`,
      description: null,
      unit: null,
      unitPrice: null,
      quantity: deal.quantity ?? 1,
      lineTotal: deal.finalPrice,
      currency: 'INR',
      productId: null,
      needId: null,
      needResponseId: null,
      images: [],
      buyerNote: null,
      sellerNote: null,
      deliverAddress: deal.deliverAddress,
      specs: [],
    };
  }

  private async toDealResponse(deal: Deal, viewerUserId: string) {
    const quotation =
      parseQuotationNotes(deal.notes) ?? this.emptyQuotationFromDeal(deal);
    const names = await this.profileNames([
      deal.buyerUserId,
      deal.sellerUserId,
    ]);

    return {
      dealId: deal.dealId,
      conversationId: deal.conversationId,
      buyerUserId: deal.buyerUserId,
      sellerUserId: deal.sellerUserId,
      sourceId: deal.sourceId,
      finalPrice: deal.finalPrice,
      quantity: deal.quantity,
      deliverAddress: deal.deliverAddress,
      status: deal.status,
      contactShared: deal.contactShared,
      completedAt: deal.completedAt,
      createdAt: deal.createdAt,
      role:
        deal.buyerUserId === viewerUserId
          ? 'buyer'
          : deal.sellerUserId === viewerUserId
            ? 'seller'
            : null,
      buyer: deal.buyerUserId
        ? {
            userId: deal.buyerUserId,
            displayName: names.get(deal.buyerUserId) ?? null,
          }
        : null,
      seller: deal.sellerUserId
        ? {
            userId: deal.sellerUserId,
            displayName: names.get(deal.sellerUserId) ?? null,
          }
        : null,
      quotation,
      statusHistory: (deal.statusHistory ?? [])
        .slice()
        .sort((a, b) => Number(a.dealStatusId) - Number(b.dealStatusId)),
    };
  }

  private async profileNames(userIds: (string | null | undefined)[]) {
    const unique = [...new Set(userIds.filter(Boolean) as string[])];
    const map = new Map<string, string>();
    if (!unique.length) return map;

    const profiles = await this.profilesRepository
      .createQueryBuilder('profile')
      .where('profile.user_id IN (:...ids)', { ids: unique })
      .getMany();

    for (const userId of unique) {
      const profile = profiles.find((item) => item.userId === userId);
      if (profile?.displayName) map.set(userId, profile.displayName);
    }
    return map;
  }
}
