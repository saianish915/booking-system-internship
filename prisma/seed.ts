import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  // clean
  await prisma.attendance.deleteMany();
  await prisma.externalAttendee.deleteMany();
  await prisma.eventRegistration.deleteMany();
  await prisma.resourceAllocation.deleteMany();
  await prisma.event.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  const org = await prisma.organization.create({ data: { name: 'Org A' } });

  const alice = await prisma.user.create({
    data: { orgId: org.id, email: 'alice@orga.com', fullName: 'Alice' },
  });
  const bob = await prisma.user.create({
    data: { orgId: org.id, email: 'bob@orga.com', fullName: 'Bob' },
  });

  const e1 = await prisma.event.create({
    data: {
      orgId: org.id,
      title: 'Event 1',
      startsAt: new Date('2026-01-18T10:00:00-05:00'),
      endsAt: new Date('2026-01-18T12:00:00-05:00'),
      capacity: 50,
      allowExternal: true,
    },
  });

  const e2 = await prisma.event.create({
    data: {
      orgId: org.id,
      title: 'Event 2 (overlaps)',
      startsAt: new Date('2026-01-18T11:00:00-05:00'),
      endsAt: new Date('2026-01-18T13:00:00-05:00'),
      capacity: 50,
      allowExternal: true,
    },
  });

  const room = await prisma.resource.create({
    data: { name: 'Room 101', type: 'EXCLUSIVE', isGlobal: false, ownerOrgId: org.id },
  });

  const projector = await prisma.resource.create({
    data: { name: 'Projector', type: 'SHAREABLE', isGlobal: false, ownerOrgId: org.id, maxConcurrent: 1 },
  });

  await prisma.resourceAllocation.createMany({
    data: [
      { eventId: e1.id, resourceId: room.id },
      { eventId: e2.id, resourceId: room.id }, // exclusive conflict
      { eventId: e1.id, resourceId: projector.id },
      { eventId: e2.id, resourceId: projector.id }, // shareable conflict
    ],
  });

  await prisma.externalAttendee.createMany({
    data: Array.from({ length: 12 }).map((_, i) => ({
      eventId: e1.id,
      email: `guest${i}@example.com`,
    })),
  });

  await prisma.eventRegistration.create({ data: { eventId: e1.id, userId: alice.id } });
  try {
    await prisma.eventRegistration.create({ data: { eventId: e2.id, userId: alice.id } });
  } catch {
    console.log('Expected: double-booking prevented for Alice');
  }
  await prisma.eventRegistration.create({ data: { eventId: e2.id, userId: bob.id } });

  console.log('Seed done. orgId=', org.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

