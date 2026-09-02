import { CategoryType } from './category-type.entity';
import { Category } from './category.entity';
import { Collection } from './collection.entity';
import { ConversationEvent } from './conversation-event.entity';
import { Conversation } from './conversation.entity';
import { DealStatus } from './deal-status.entity';
import { Deal } from './deal.entity';
import { NeedMedia } from './need-media.entity';
import { NeedResponse } from './need-response.entity';
import { NeedTag } from './need-tag.entity';
import { NeedTagsMapping } from './need-tags-mapping.entity';
import { Need } from './need.entity';
import { OrderItem } from './order-item.entity';
import { Order } from './order.entity';
import { Payment } from './payment.entity';
import { ProductMedia } from './product-media.entity';
import { ProductVariant } from './product-variant.entity';
import { Product } from './product.entity';
import { Profile } from './profile.entity';
import { ResponseMedia } from './response-media.entity';
import { UserDevice } from './user-device.entity';
import { UserSession } from './user-session.entity';
import { User } from './user.entity';
import { Verification } from './verification.entity';

export const entities = [
  CategoryType,
  Category,
  User,
  Profile,
  Verification,
  UserDevice,
  UserSession,
  Product,
  ProductMedia,
  ProductVariant,
  Need,
  NeedMedia,
  NeedResponse,
  ResponseMedia,
  NeedTag,
  NeedTagsMapping,
  Collection,
  Conversation,
  ConversationEvent,
  Deal,
  DealStatus,
  Order,
  OrderItem,
  Payment,
];

export {
  CategoryType,
  Category,
  Collection,
  ConversationEvent,
  Conversation,
  DealStatus,
  Deal,
  NeedMedia,
  NeedResponse,
  NeedTag,
  NeedTagsMapping,
  Need,
  Order,
  OrderItem,
  Payment,
  ProductMedia,
  Product,
  ProductVariant,
  Profile,
  ResponseMedia,
  UserDevice,
  UserSession,
  User,
  Verification,
};
