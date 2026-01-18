import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { CheckinDto } from './dto/checkin.dto';

@Controller('attendance')
export class AttendanceController {
  constructor(private service: AttendanceService) {}

  @Post('checkin')
  checkin(@Body() dto: CheckinDto) {
    return this.service.checkin(dto);
  }

  @Get()
  list(@Query('eventId') eventId: string) {
    return this.service.list(Number(eventId));
  }
}

