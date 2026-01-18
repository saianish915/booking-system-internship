import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { RegistrationsService } from './registrations.service';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { CreateExternalDto } from './dto/create-external.dto';

@Controller('registrations')
export class RegistrationsController {
  constructor(private service: RegistrationsService) {}

  @Post()
  register(@Body() dto: CreateRegistrationDto) {
    return this.service.register(dto);
  }

  @Get()
  list(@Query('eventId') eventId: string) {
    return this.service.list(Number(eventId));
  }

  @Post('external')
  registerExternal(@Body() dto: CreateExternalDto) {
    return this.service.registerExternal(dto);
  }

  @Get('external')
  listExternal(@Query('eventId') eventId: string) {
    return this.service.listExternal(Number(eventId));
  }
}

