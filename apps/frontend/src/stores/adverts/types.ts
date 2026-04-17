import type {
  AdvertContent,
  AdvertPresetItem,
  AdvertPresetTotal,
} from '@/types';

export type AdvertItem = AdvertContent

export type PresetInfoItem = AdvertPresetItem

export type PresetInfoTotal = AdvertPresetTotal

export interface PresetInfo {
  items: PresetInfoItem[];
  total: PresetInfoTotal;
  count: number;
}
