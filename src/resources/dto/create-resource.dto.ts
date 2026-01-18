export type ResourceType = 'EXCLUSIVE' | 'SHAREABLE' | 'CONSUMABLE';

export class CreateResourceDto {
  // Ownership / tenancy
  ownerOrgId?: number | null; // required if isGlobal=false
  isGlobal: boolean;

  // Core
  name: string;
  type: ResourceType;

  // Shareable
  maxConcurrent?: number | null;

  // Consumable
  totalQuantity?: number | null;
}

