export class CreateEventDto {
  orgId: number;              // required
  title: string;              // required
  startsAt: string;           // ISO string
  endsAt: string;             // ISO string
  capacity: number;           // required
  allowExternal?: boolean;    // optional
  parentEventId?: number | null; // optional
}

