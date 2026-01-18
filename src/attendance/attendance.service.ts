import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CheckinDto } from './dto/checkin.dto';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  async checkin(dto: CheckinDto) {
    if (!dto.userId && !dto.externalAttendeeId) {
      throw new BadRequestException('userId or externalAttendeeId required');
    }

    return this.prisma.attendance.create({
      data: {
        eventId: BigInt(dto.eventId),
        userId: dto.userId ? BigInt(dto.userId) : null,
        externalAttendeeId: dto.externalAttendeeId
          ? BigInt(dto.externalAttendeeId)
          : null,
        checkedInAt: new Date(),
      },
    });
  }

  list(eventId: number) {
    return this.prisma.attendance.findMany({
      where: { eventId: BigInt(eventId) },
      include: { user: true, externalAttendee: true },
    });
  }
}

