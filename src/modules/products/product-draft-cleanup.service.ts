import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { R2StorageService } from '../../common/storage/r2-storage.service';
import { Product, ProductMedia } from '../../database/entities';
import { PRODUCT_STATUS } from './constants/product-status.constant';

const DRAFT_TTL_HOURS = 24;
const BATCH_SIZE = 200;

/**
 * Auto-clears abandoned DRAFT products (created via "Add Product" but never published)
 * after 24h of inactivity. Safe to run repeatedly: each run only ever touches rows that
 * are still `status = 'draft'` and stale, and R2 deletes are best-effort/idempotent
 * (deleting an already-deleted object is a no-op).
 */
@Injectable()
export class ProductDraftCleanupService {
  private readonly logger = new Logger(ProductDraftCleanupService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(ProductMedia)
    private readonly productMediaRepository: Repository<ProductMedia>,
    private readonly storageService: R2StorageService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleCron(): Promise<void> {
    try {
      const removed = await this.cleanupAbandonedDrafts();
      if (removed > 0) {
        this.logger.log(`Cleaned up ${removed} abandoned draft product(s)`);
      }
    } catch (error) {
      this.logger.error('Draft cleanup run failed', error as Error);
    }
  }

  /** Exposed for manual invocation/testing outside of the cron schedule. */
  async cleanupAbandonedDrafts(): Promise<number> {
    const cutoff = new Date(Date.now() - DRAFT_TTL_HOURS * 60 * 60 * 1000);

    const staleDrafts = await this.productsRepository.find({
      where: {
        status: PRODUCT_STATUS.DRAFT,
        lastActivityAt: LessThan(cutoff),
      },
      take: BATCH_SIZE,
    });

    for (const draft of staleDrafts) {
      await this.deleteDraftAndMedia(draft);
    }

    return staleDrafts.length;
  }

  private async deleteDraftAndMedia(draft: Product): Promise<void> {
    // Re-check status/staleness right before deleting — guards against a concurrent
    // publish/edit that happened between the scan above and this point.
    const fresh = await this.productsRepository.findOne({
      where: { productId: draft.productId },
    });
    if (!fresh || fresh.status !== PRODUCT_STATUS.DRAFT) {
      return;
    }

    const media = await this.productMediaRepository.find({
      where: { productId: draft.productId },
    });

    const keys = media.flatMap((item) =>
      item.storageKey
        ? [item.storageKey, this.storageService.deriveThumbnailKey(item.storageKey)]
        : [],
    );
    if (keys.length > 0) {
      await this.storageService.deleteObjects(keys).catch((error) => {
        this.logger.warn(
          `Failed to delete R2 objects for draft product ${draft.productId}: ${
            (error as Error).message
          }`,
        );
      });
    }

    if (media.length > 0) {
      await this.productMediaRepository.remove(media);
    }

    await this.productsRepository.delete({ productId: draft.productId });
  }
}
