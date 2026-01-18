import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { AllocationsService } from './allocations.service';
import { CreateAllocationDto } from './dto/create-allocation.dto';

@Controller('allocations')
export class AllocationsController {
  constructor(private readonly allocations: AllocationsService) {}

  @Post()
  create(@Body() dto: CreateAllocationDto) {
    return this.allocations.create(dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.allocations.remove(Number(id));
  }

  // convenience: list allocations for an event
  @Get()
  listByEvent(@Query('eventId') eventId: string) {
    return this.allocations.listByEvent(Number(eventId));
  }
}

