import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // (a) Find all users who are double-booked (overlapping event ranges)
  async doubleBookedUsers() {
    return this.prisma.$queryRaw`
      SELECT
        u.id AS user_id,
        u."fullName" AS full_name,
        u.email,
        e1.id AS event1_id, e1.title AS event1_title, e1."startsAt" AS event1_start, e1."endsAt" AS event1_end,
        e2.id AS event2_id, e2.title AS event2_title, e2."startsAt" AS event2_start, e2."endsAt" AS event2_end
      FROM "EventRegistration" r1
      JOIN "EventRegistration" r2
        ON r1."userId" = r2."userId"
       AND r1."eventId" < r2."eventId"
      JOIN "Event" e1 ON e1.id = r1."eventId"
      JOIN "Event" e2 ON e2.id = r2."eventId"
      JOIN "User" u ON u.id = r1."userId"
      WHERE e1."timeRange" && e2."timeRange";
    `;
  }

  // (b) Exclusive resources double-booked (overlapping events)
  async exclusiveResourceConflicts() {
    return this.prisma.$queryRaw`
      SELECT
        r.id AS resource_id,
        r.name AS resource_name,
        e1.id AS event1_id, e1.title AS event1_title,
        e2.id AS event2_id, e2.title AS event2_title
      FROM "ResourceAllocation" ra1
      JOIN "ResourceAllocation" ra2
        ON ra1."resourceId" = ra2."resourceId"
       AND ra1."eventId" < ra2."eventId"
      JOIN "Resource" r ON r.id = ra1."resourceId"
      JOIN "Event" e1 ON e1.id = ra1."eventId"
      JOIN "Event" e2 ON e2.id = ra2."eventId"
      WHERE r.type = 'EXCLUSIVE'
        AND e1."timeRange" && e2."timeRange";
    `;
  }

  // (b) Shareable resources over-allocated (max concurrent usage exceeded)
  async shareableOverAllocated() {
    return this.prisma.$queryRaw`
      WITH alloc AS (
        SELECT
          r.id AS resource_id,
          r.name,
          r."maxConcurrent" AS max_concurrent,
          e.id AS event_id,
          e.title,
          e."startsAt",
          e."timeRange"
        FROM "ResourceAllocation" ra
        JOIN "Resource" r ON r.id = ra."resourceId"
        JOIN "Event" e ON e.id = ra."eventId"
        WHERE r.type = 'SHAREABLE'
      ),
      concurrency AS (
        SELECT
          a1.resource_id,
          a1.name,
          a1.max_concurrent,
          a1.event_id,
          a1.title,
          a1."startsAt"::text AS "startsAt",
          (
            SELECT COUNT(*)
            FROM alloc a2
            WHERE a2.resource_id = a1.resource_id
              AND a2."timeRange" && a1."timeRange"
          ) AS concurrent_count
        FROM alloc a1
      )
      SELECT *
      FROM concurrency
      WHERE concurrent_count > max_concurrent
      ORDER BY resource_id, "startsAt";
    `;
  }

  // (b) Consumables exceeding available quantity (per event)
  async consumablesExceeded() {
    return this.prisma.$queryRaw`
      SELECT
        r.id AS resource_id,
        r.name,
        r."totalQuantity" AS total_quantity,
        e.id AS event_id,
        e.title,
        SUM(ra."quantityUsed") AS used_quantity
      FROM "ResourceAllocation" ra
      JOIN "Resource" r ON r.id = ra."resourceId"
      JOIN "Event" e ON e.id = ra."eventId"
      WHERE r.type = 'CONSUMABLE'
      GROUP BY r.id, r.name, r."totalQuantity", e.id, e.title
      HAVING SUM(ra."quantityUsed") > r."totalQuantity";
    `;
  }

  // (c) Resource utilization per org (materialized view)
  async resourceHoursFromMV(ownerOrgId: number) {
    return this.prisma.$queryRawUnsafe(
      `
      SELECT
        resource_id,
        owner_org_id,
        name,
        total_hours_used::float8 AS total_hours_used
      FROM mv_resource_hours
      WHERE owner_org_id = $1
      ORDER BY total_hours_used DESC;
      `,
      ownerOrgId,
    );
  }

  // (c) Peak concurrent usage per resource (required)
  async peakConcurrentUsage(ownerOrgId: number) {
    return this.prisma.$queryRawUnsafe(
      `
      WITH alloc AS (
        SELECT
          r.id AS resource_id,
          r.name,
          r."ownerOrgId" AS owner_org_id,
          e."startsAt",
          e."endsAt"
        FROM "ResourceAllocation" ra
        JOIN "Resource" r ON r.id = ra."resourceId"
        JOIN "Event" e ON e.id = ra."eventId"
        WHERE r."ownerOrgId" = $1
          AND r.type IN ('EXCLUSIVE','SHAREABLE')
      ),
      points AS (
        SELECT resource_id, name, owner_org_id, "startsAt" AS ts, +1 AS delta FROM alloc
        UNION ALL
        SELECT resource_id, name, owner_org_id, "endsAt"   AS ts, -1 AS delta FROM alloc
      ),
      running AS (
        SELECT
          resource_id, name, owner_org_id, ts,
          SUM(delta) OVER (
            PARTITION BY resource_id
            ORDER BY ts, delta DESC
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
          ) AS concurrent
        FROM points
      )
      SELECT
        resource_id,
        owner_org_id,
        name,
        MAX(concurrent) AS peak_concurrent
      FROM running
      GROUP BY resource_id, owner_org_id, name
      ORDER BY peak_concurrent DESC, resource_id;
      `,
      ownerOrgId,
    );
  }

  // (c) Underutilized resources (simple threshold in hours)
  async underutilizedResources(hoursThreshold = 2) {
    return this.prisma.$queryRaw`
      WITH usage AS (
        SELECT
          r.id,
          r.name,
          COALESCE(SUM(EXTRACT(EPOCH FROM (e."endsAt" - e."startsAt")))/3600.0, 0) AS hours_used
        FROM "Resource" r
        LEFT JOIN "ResourceAllocation" ra ON ra."resourceId" = r.id
        LEFT JOIN "Event" e ON e.id = ra."eventId"
        WHERE r.type IN ('EXCLUSIVE','SHAREABLE')
        GROUP BY r.id, r.name
      )
      SELECT *
      FROM usage
      WHERE hours_used < ${hoursThreshold}
      ORDER BY hours_used ASC;
    `;
  }

  // (d) Parent events whose child sessions violate time boundaries
  async parentBoundaryViolations() {
    return this.prisma.$queryRaw`
      SELECT
        p.id AS parent_id, p.title AS parent_title,
        c.id AS child_id, c.title AS child_title
      FROM "Event" c
      JOIN "Event" p ON p.id = c."parentEventId"
      WHERE NOT (p."timeRange" @> c."timeRange");
    `;
  }

  // (e) Events with external attendees exceeding a threshold
  async externalAttendeesExceeding(threshold: number) {
    return this.prisma.$queryRaw`
      SELECT
        e.id, e.title,
        COUNT(x.id) AS external_count
      FROM "Event" e
      JOIN "ExternalAttendee" x ON x."eventId" = e.id
      GROUP BY e.id, e.title
      HAVING COUNT(x.id) > ${threshold}
      ORDER BY external_count DESC;
    `;
  }

  // Recursive CTE (required)
  async eventTree() {
    return this.prisma.$queryRaw`
      WITH RECURSIVE tree AS (
        SELECT id, "parentEventId", title, 0 AS depth
        FROM "Event"
        WHERE "parentEventId" IS NULL

        UNION ALL

        SELECT e.id, e."parentEventId", e.title, t.depth + 1
        FROM "Event" e
        JOIN tree t ON e."parentEventId" = t.id
      )
      SELECT * FROM tree ORDER BY depth, id;
    `;
  }

  // Refresh materialized view (manual for demo)
  async refreshResourceHoursMV() {
    return this.prisma.$executeRaw`REFRESH MATERIALIZED VIEW mv_resource_hours;`;
  }
}

