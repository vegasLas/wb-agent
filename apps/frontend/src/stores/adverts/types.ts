import type {
  AdvertContent,
  AdvertPresetItem,
  AdvertPresetTotal,
} from '@/types';

export interface AdvertItem extends AdvertContent {}

export interface PresetInfoItem extends AdvertPresetItem {}

export interface PresetInfoTotal extends AdvertPresetTotal {}

export interface PresetInfo {
  items: PresetInfoItem[];
  total: PresetInfoTotal;
  count: number;
}
