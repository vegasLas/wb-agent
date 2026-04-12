import type { SupplyTrigger, CreateTriggerRequest, UpdateTriggerRequest } from '../../types';

export interface TriggersResponse {
  success: boolean;
  data: SupplyTrigger[];
}

export interface TriggerResponse {
  success: boolean;
  data: SupplyTrigger;
}

export interface DeleteTriggerResponse {
  success: boolean;
}

export { SupplyTrigger, CreateTriggerRequest, UpdateTriggerRequest };
