-- Materialized view: total hours used per resource (non-consumables)
CREATE MATERIALIZED VIEW mv_resource_hours AS
SELECT
  r.id AS resource_id,
  COALESCE(r."ownerOrgId", -1) AS owner_org_id,
  r.name,
  SUM(EXTRACT(EPOCH FROM (e."endsAt" - e."startsAt")))/3600.0 AS total_hours_used
FROM "ResourceAllocation" ra
JOIN "Resource" r ON r.id = ra."resourceId"
JOIN "Event" e ON e.id = ra."eventId"
WHERE r.type IN ('EXCLUSIVE','SHAREABLE')
GROUP BY r.id, COALESCE(r."ownerOrgId", -1), r.name;

CREATE INDEX idx_mv_resource_hours_org ON mv_resource_hours(owner_org_id);

