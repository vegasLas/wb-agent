import type { SupplyTrigger, CreateTriggerRequest } from '@/types';

export type BadgeColor =
  | 'gray'
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'blue'
  | 'indigo'
  | 'purple'
  | 'pink';

export interface StatusCounts {
  [key: string]: number;
}

export { SupplyTrigger, CreateTriggerRequest };
