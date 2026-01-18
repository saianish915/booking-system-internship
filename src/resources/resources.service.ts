import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';

@Injectable()
export class ResourcesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateResourceDto) {
    if (!dto.isGlobal && !dto.ownerOrgId) {
      throw new BadRequestException('ownerOrgId is required when isGlobal=false');
    }
    if (dto.isGlobal) {
      // keep ownerOrgId null for global resources
      dto.ownerOrgId = null;
    }

    return this.prisma.resource.create({
      data: {
        name: dto.name,
        type: dto.type as any,
        isGlobal: dto.isGlobal,
        ownerOrgId: dto.ownerOrgId ? BigInt(dto.ownerOrgId) : null,
        maxConcurrent: dto.maxConcurrent ?? null,
        totalQuantity: dto.totalQuantity ?? null,
      },
    });
  }

  // org resources + global resources
  async findAll(orgId: number) {
    return this.prisma.resource.findMany({
      where: {
        OR: [{ isGlobal: true }, { ownerOrgId: BigInt(orgId) }],
      },
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number) {
    const resource = await this.prisma.resource.findUnique({
      where: { id: BigInt(id) },
    });
    if (!resource) throw new NotFoundException('Resource not found');
    return resource;
  }

  async update(id: number, dto: UpdateResourceDto) {
    await this.findOne(id);

    // If switching to global, clear ownerOrgId.
    const setOwner =
      dto.isGlobal === true ? null : dto.ownerOrgId !== undefined ? (dto.ownerOrgId ? BigInt(dto.ownerOrgId) : null) : undefined;

    return this.prisma.resource.update({
      where: { id: BigInt(id) },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.type !== undefined ? { type: dto.type as any } : {}),
        ...(dto.isGlobal !== undefined ? { isGlobal: dto.isGlobal } : {}),
        ...(setOwner !== undefined ? { ownerOrgId: setOwner } : {}),
        ...(dto.maxConcurrent !== undefined ? { maxConcurrent: dto.maxConcurrent } : {}),
        ...(dto.totalQuantity !== undefined ? { totalQuantity: dto.totalQuantity } : {}),
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.resource.delete({ where: { id: BigInt(id) } });
  }
}

