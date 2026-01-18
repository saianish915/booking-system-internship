import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateEventDto) {
    return this.prisma.event.create({
      data: {
        orgId: BigInt(dto.orgId),
        title: dto.title,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
        capacity: dto.capacity,
        allowExternal: dto.allowExternal ?? false,
        parentEventId: dto.parentEventId ? BigInt(dto.parentEventId) : null,
      },
    });
  }

  async findAll(orgId: number) {
    return this.prisma.event.findMany({
      where: { orgId: BigInt(orgId) },
      orderBy: { startsAt: 'asc' },
    });
  }

  async findOne(id: number) {
    const event = await this.prisma.event.findUnique({
      where: { id: BigInt(id) },
    });
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  async update(id: number, dto: UpdateEventDto) {
    await this.findOne(id);

    return this.prisma.event.update({
      where: { id: BigInt(id) },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.startsAt !== undefined ? { startsAt: new Date(dto.startsAt) } : {}),
        ...(dto.endsAt !== undefined ? { endsAt: new Date(dto.endsAt) } : {}),
        ...(dto.capacity !== undefined ? { capacity: dto.capacity } : {}),
        ...(dto.allowExternal !== undefined ? { allowExternal: dto.allowExternal } : {}),
        ...(dto.parentEventId !== undefined
          ? { parentEventId: dto.parentEventId ? BigInt(dto.parentEventId) : null }
          : {}),
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.event.delete({ where: { id: BigInt(id) } });
  }
}

