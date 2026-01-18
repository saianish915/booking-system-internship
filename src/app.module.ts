import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ReportsModule } from './reports/reports.module';
import { EventsModule } from './events/events.module';
import { ResourcesModule } from './resources/resources.module';
import { AllocationsModule } from './allocations/allocations.module';
import { RegistrationsModule } from './registrations/registrations.module';
import { AttendanceModule } from './attendance/attendance.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // loads .env automatically
    ReportsModule, EventsModule, ResourcesModule, AllocationsModule, RegistrationsModule, AttendanceModule,
  ],
})
export class AppModule {}

