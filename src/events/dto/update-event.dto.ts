export class UpdateEventDto {
  title?: string;
  startsAt?: string;          // ISO string
  endsAt?: string;            // ISO string
  capacity?: number;
  allowExternal?: boolean;
  parentEventId?: number | null;
}

