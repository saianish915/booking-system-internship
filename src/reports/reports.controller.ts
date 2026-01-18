import { Controller, Get, Post, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('double-booked-users')
  doubleBookedUsers() {
    return this.reports.doubleBookedUsers();
  }

  @Get('resource-violations/exclusive')
  exclusiveConflicts() {
    return this.reports.exclusiveResourceConflicts();
  }

  @Get('resource-violations/shareable')
  shareableOverAllocated() {
    return this.reports.shareableOverAllocated();
  }

  @Get('resource-violations/consumables')
  consumablesExceeded() {
    return this.reports.consumablesExceeded();
  }

  @Get('resource-hours')
  resourceHours(@Query('ownerOrgId') ownerOrgId: string) {
    return this.reports.resourceHoursFromMV(Number(ownerOrgId));
  }

  // Peak concurrent usage
  @Get('peak-concurrency')
  peakConcurrency(@Query('ownerOrgId') ownerOrgId: string) {
    return this.reports.peakConcurrentUsage(Number(ownerOrgId));
  }

  @Get('underutilized')
  underutilized(@Query('hours') hours?: string) {
    return this.reports.underutilizedResources(hours ? Number(hours) : 2);
  }

  @Get('parent-boundary-violations')
  parentBoundaryViolations() {
    return this.reports.parentBoundaryViolations();
  }

  @Get('external-threshold')
  externalThreshold(@Query('threshold') threshold: string) {
    return this.reports.externalAttendeesExceeding(Number(threshold));
  }

  @Get('event-tree')
  eventTree() {
    return this.reports.eventTree();
  }

  @Post('refresh-resource-hours')
  refreshMV() {
    return this.reports.refreshResourceHoursMV();
  }
}

