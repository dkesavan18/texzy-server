import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Address } from '../../database/entities';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';

/** Buyer address book — capped at 3 saved addresses per user (Flipkart/Amazon-style). */
export const MAX_ADDRESSES_PER_USER = 3;

@Injectable()
export class AddressesService {
  constructor(
    @InjectRepository(Address)
    private readonly addressesRepository: Repository<Address>,
  ) {}

  async findAllMine(userId: string) {
    return this.addressesRepository.find({
      where: { userId },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
  }

  async findOneMine(userId: string, addressId: string) {
    const address = await this.requireOwned(userId, addressId);
    return address;
  }

  async create(userId: string, dto: CreateAddressDto) {
    const count = await this.addressesRepository.count({ where: { userId } });
    if (count >= MAX_ADDRESSES_PER_USER) {
      throw new BadRequestException(
        `You can save up to ${MAX_ADDRESSES_PER_USER} addresses. Delete one to add a new address.`,
      );
    }

    const now = new Date();
    // First saved address is the default automatically; otherwise respect the flag.
    const makeDefault = count === 0 || dto.isDefault === true;
    if (makeDefault) {
      await this.addressesRepository.update({ userId }, { isDefault: false });
    }

    const address = await this.addressesRepository.save(
      this.addressesRepository.create({
        userId,
        fullName: dto.fullName,
        phone: dto.phone,
        addressLine1: dto.addressLine1,
        addressLine2: dto.addressLine2 ?? null,
        city: dto.city,
        state: dto.state,
        pincode: dto.pincode,
        country: dto.country ?? 'India',
        label: dto.label ?? 'Home',
        isDefault: makeDefault,
        createdAt: now,
        updatedAt: now,
      }),
    );
    return address;
  }

  async update(userId: string, addressId: string, dto: UpdateAddressDto) {
    const address = await this.requireOwned(userId, addressId);

    if (dto.isDefault === true && !address.isDefault) {
      await this.addressesRepository.update({ userId }, { isDefault: false });
      address.isDefault = true;
    }

    if (dto.fullName !== undefined) address.fullName = dto.fullName;
    if (dto.phone !== undefined) address.phone = dto.phone;
    if (dto.addressLine1 !== undefined) address.addressLine1 = dto.addressLine1;
    if (dto.addressLine2 !== undefined) address.addressLine2 = dto.addressLine2 ?? null;
    if (dto.city !== undefined) address.city = dto.city;
    if (dto.state !== undefined) address.state = dto.state;
    if (dto.pincode !== undefined) address.pincode = dto.pincode;
    if (dto.country !== undefined) address.country = dto.country;
    if (dto.label !== undefined) address.label = dto.label;
    address.updatedAt = new Date();

    return this.addressesRepository.save(address);
  }

  async setDefault(userId: string, addressId: string) {
    const address = await this.requireOwned(userId, addressId);
    await this.addressesRepository.update({ userId }, { isDefault: false });
    address.isDefault = true;
    address.updatedAt = new Date();
    return this.addressesRepository.save(address);
  }

  async remove(userId: string, addressId: string) {
    const address = await this.requireOwned(userId, addressId);
    await this.addressesRepository.remove(address);

    if (address.isDefault) {
      const [next] = await this.addressesRepository.find({
        where: { userId },
        order: { createdAt: 'ASC' },
        take: 1,
      });
      if (next) {
        next.isDefault = true;
        await this.addressesRepository.save(next);
      }
    }

    return { success: true };
  }

  /** Used by OrdersService to resolve a snapshot for buy-now / checkout. */
  async requireOwned(userId: string, addressId: string): Promise<Address> {
    const address = await this.addressesRepository.findOne({
      where: { addressId },
    });
    if (!address) {
      throw new NotFoundException(`Address ${addressId} not found`);
    }
    if (address.userId !== userId) {
      throw new ForbiddenException('You can only use your own saved addresses');
    }
    return address;
  }
}
