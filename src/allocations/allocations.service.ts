import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAllocationDto } from './dto/create-allocation.dto';

@Injectable()
export class AllocationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAllocationDto) {
    const event = await this.prisma.event.findUnique({
      where: { id: BigInt(dto.eventId) },
      select: { id: true, orgId: true },
    });
    if (!event) throw new NotFoundException('Event not found');

    const resource = await this.prisma.resource.findUnique({
      where: { id: BigInt(dto.resourceId) },
      select: {
        id: true,
        isGlobal: true,
        ownerOrgId: true,
        type: true,
        totalQuantity: true,
      },
    });
    if (!resource) throw new NotFoundException('Resource not found');

    // Multi-tenant rule: resource must be global OR owned by the same org as the event
    const sameOrg =
      resource.ownerOrgId !== null && resource.ownerOrgId === event.orgId;
    if (!resource.isGlobal && !sameOrg) {
      throw new BadRequestException(
        'Resource is not available to this organization',
      );
    }

    // Consumable rule: quantityUsed required
    if (resource.type === 'CONSUMABLE') {
      if (dto.quantityUsed == null || dto.quantityUsed <= 0) {
        throw new BadRequestException(
          'quantityUsed is required for CONSUMABLE resources',
        );
      }
      if (
        resource.totalQuantity !== null &&
        dto.quantityUsed > resource.totalQuantity
      ) {
        throw new BadRequestException(
          'quantityUsed exceeds available totalQuantity',
        );
      }
    }

    // Prevent duplicate (eventId, resourceId)
    const existing = await this.prisma.resourceAllocation.findUnique({
      where: {
        eventId_resourceId: {
          eventId: BigInt(dto.eventId),
          resourceId: BigInt(dto.resourceId),
        },
      },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException(
        'This resource is already allocated to this event',
      );
    }

    // Create allocation
    return this.prisma.resourceAllocation.create({
      data: {
        eventId: BigInt(dto.eventId),
        resourceId: BigInt(dto.resourceId),
        quantityUsed: dto.quantityUsed ?? null,
      },
    });
  }

  async remove(id: number) {
    const existing = await this.prisma.resourceAllocation.findUnique({
      where: { id: BigInt(id) },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Allocation not found');

    return this.prisma.resourceAllocation.delete({
      where: { id: BigInt(id) },
    });
  }

  async listByEvent(eventId: number) {
    return this.prisma.resourceAllocation.findMany({
      where: { eventId: BigInt(eventId) },
      include: { resource: true },
      orderBy: { id: 'asc' },
    });
  }
}

