-- Trigger 1: Prevent internal user double-booking on registration
CREATE OR REPLACE FUNCTION prevent_user_double_booking()
RETURNS trigger AS $$
DECLARE new_range tstzrange;
BEGIN
  SELECT "timeRange" INTO new_range
  FROM "Event"
  WHERE id = NEW."eventId";

  IF EXISTS (
    SELECT 1
    FROM "EventRegistration" er
    JOIN "Event" e ON e.id = er."eventId"
    WHERE er."userId" = NEW."userId"
      AND e."timeRange" && new_range
      AND e.id <> NEW."eventId"
  ) THEN
    RAISE EXCEPTION 'User is double-booked for overlapping events';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_user_double_booking ON "EventRegistration";
CREATE TRIGGER trg_prevent_user_double_booking
BEFORE INSERT ON "EventRegistration"
FOR EACH ROW EXECUTE FUNCTION prevent_user_double_booking();


-- Trigger 2: Child session must be within parent event time range
CREATE OR REPLACE FUNCTION enforce_parent_contains_child()
RETURNS trigger AS $$
DECLARE parent_range tstzrange;
BEGIN
  IF NEW."parentEventId" IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT "timeRange" INTO parent_range
  FROM "Event"
  WHERE id = NEW."parentEventId";

  IF parent_range IS NULL THEN
    RAISE EXCEPTION 'Parent event not found';
  END IF;

  IF NOT (parent_range @> NEW."timeRange") THEN
    RAISE EXCEPTION 'Child session must be fully within parent event time';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_parent_contains_child ON "Event";
CREATE TRIGGER trg_parent_contains_child
BEFORE INSERT OR UPDATE OF "startsAt","endsAt","parentEventId" ON "Event"
FOR EACH ROW EXECUTE FUNCTION enforce_parent_contains_child();

