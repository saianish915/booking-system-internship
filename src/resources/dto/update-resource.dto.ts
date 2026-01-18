import type { ResourceType } from './create-resource.dto';

export class UpdateResourceDto {
  name?: string;
  type?: ResourceType;
  isGlobal?: boolean;

  ownerOrgId?: number | null;

  maxConcurrent?: number | null;
  totalQuantity?: number | null;
}

