import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { CreateExternalDto } from './dto/create-external.dto';

@Injectable()
export class RegistrationsService {
  constructor(private prisma: PrismaService) {}

  register(dto: CreateRegistrationDto) {
    return this.prisma.eventRegistration.create({
      data: {
        eventId: BigInt(dto.eventId),
        userId: BigInt(dto.userId),
      },
    });
  }

  list(eventId: number) {
    return this.prisma.eventRegistration.findMany({
      where: { eventId: BigInt(eventId) },
      include: { user: true },
    });
  }

  registerExternal(dto: CreateExternalDto) {
    return this.prisma.externalAttendee.create({
      data: {
        eventId: BigInt(dto.eventId),
        email: dto.email,
      },
    });
  }

  listExternal(eventId: number) {
    return this.prisma.externalAttendee.findMany({
      where: { eventId: BigInt(eventId) },
    });
  }
}

