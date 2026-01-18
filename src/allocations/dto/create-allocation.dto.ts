export class CreateAllocationDto {
  eventId: number;
  resourceId: number;

  // only for consumables; optional otherwise
  quantityUsed?: number | null;
}

