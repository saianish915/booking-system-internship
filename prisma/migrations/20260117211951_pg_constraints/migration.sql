-- 1) Event time sanity
ALTER TABLE "Event"
  ADD CONSTRAINT event_time_check CHECK ("endsAt" > "startsAt");

-- 2) Generated time range + GiST index (for overlap queries)
ALTER TABLE "Event"
  ADD COLUMN "timeRange" tstzrange
  GENERATED ALWAYS AS (tstzrange("startsAt", "endsAt", '[)')) STORED;

CREATE INDEX event_timerange_gist ON "Event" USING gist ("timeRange");

-- 3) Resource scope rule: global must have NULL ownerOrgId, org-scoped must have ownerOrgId
ALTER TABLE "Resource"
  ADD CONSTRAINT resource_scope_check CHECK (
    ("isGlobal" = TRUE AND "ownerOrgId" IS NULL)
    OR
    ("isGlobal" = FALSE AND "ownerOrgId" IS NOT NULL)
  );

-- 4) Resource type rules
ALTER TABLE "Resource"
  ADD CONSTRAINT resource_shareable_check CHECK (
    ("type" = 'SHAREABLE' AND "maxConcurrent" IS NOT NULL AND "maxConcurrent" > 0)
    OR
    ("type" <> 'SHAREABLE' AND "maxConcurrent" IS NULL)
  );

ALTER TABLE "Resource"
  ADD CONSTRAINT resource_consumable_check CHECK (
    ("type" = 'CONSUMABLE' AND "totalQuantity" IS NOT NULL AND "totalQuantity" >= 0)
    OR
    ("type" <> 'CONSUMABLE' AND "totalQuantity" IS NULL)
  );

-- 5) Attendance identity rule: either userId OR externalAttendeeId (not both)
ALTER TABLE "Attendance"
  ADD CONSTRAINT attendance_identity_check CHECK (
    ("userId" IS NOT NULL AND "externalAttendeeId" IS NULL)
    OR
    ("userId" IS NULL AND "externalAttendeeId" IS NOT NULL)
  );

