import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ResourcesService } from './resources.service';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';

@Controller('resources')
export class ResourcesController {
  constructor(private readonly resources: ResourcesService) {}

  @Post()
  create(@Body() dto: CreateResourceDto) {
    return this.resources.create(dto);
  }

  @Get()
  findAll(@Query('orgId') orgId: string) {
    return this.resources.findAll(Number(orgId));
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.resources.findOne(Number(id));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateResourceDto) {
    return this.resources.update(Number(id), dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.resources.remove(Number(id));
  }
}

