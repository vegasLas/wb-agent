import type {
  OfficialPromotionItem,
  OfficialPromotionDetailItem,
  OfficialNomenclatureItem,
} from './wb-promotion-official.service';
import type { OfficialContentCard } from './wb-content-official.service';

// ─── Timeline ─────────────────────────────────────────────────────────────────

export interface PromotionTimelineItem {
  promoID: number;
  name: string;
  type: string;
  startDate: string;
  endDate: string;
}

export interface PromotionsTimelineDTO {
  data: {
    promotions: PromotionTimelineItem[];
  };
}

export function mapOfficialPromotionsToTimelineDTO(
  official: { data: { promotions: OfficialPromotionItem[] } },
): PromotionsTimelineDTO {
  const promotions = official.data?.promotions || [];

  return {
    data: {
      promotions: promotions.map((p) => ({
        promoID: p.id,
        name: p.name,
        type: p.type,
        startDate: p.startDateTime,
        endDate: p.endDateTime,
      })),
    },
  };
}

// ─── Detail ───────────────────────────────────────────────────────────────────

export interface PromotionRangingLevel {
  nomenclatures: number;
  coefficient: number;
}

export interface PromotionRanging {
  levels: PromotionRangingLevel[];
  boost: string;
  currentCoefficient: number;
  isMaxLevel: boolean;
  nmToNextLevel: number;
  nmToMaxLevel: number;
}

export interface PromotionDetailDTO {
  data: {
    promoID: number;
    periodID: number;
    name: string;
    description: string;
    advantages: string[];
    startDt: string;
    endDt: string;
    type: string;
    inPromoActionTotal: number;
    notInPromoActionTotal: number;
    participationPercentage: number;
    isParticipateInAutoPromo: boolean;
    ranging: PromotionRanging;
  };
}

export function mapOfficialPromotionDetailsToDTO(
  official: { data: { promotions: OfficialPromotionDetailItem[] } },
  promoID: number,
): PromotionDetailDTO {
  const promotions = official.data?.promotions || [];
  const p = promotions.find((item) => item.id === promoID) ?? promotions[0];

  if (!p) {
    throw new Error('Promotion not found in official response');
  }

  return {
    data: {
      promoID: p.id,
      periodID: p.id,
      name: p.name,
      description: p.description || '',
      advantages: p.advantages || [],
      startDt: p.startDateTime,
      endDt: p.endDateTime,
      type: p.type,
      inPromoActionTotal: p.inPromoActionTotal ?? 0,
      notInPromoActionTotal: p.notInPromoActionTotal ?? 0,
      participationPercentage: p.participationPercentage ?? 0,
      isParticipateInAutoPromo: p.type === 'auto',
      ranging: {
        levels: (p.ranging || []).map((r) => ({
          nomenclatures: r.participationRate ?? 0,
          coefficient: r.boost ?? 0,
        })),
        boost: String((p.ranging || [])[0]?.boost ?? 0),
        currentCoefficient: (p.ranging || [])[0]?.boost ?? 0,
        isMaxLevel: false,
        nmToNextLevel: 0,
        nmToMaxLevel: 0,
      },
    },
  };
}

// ─── Goods ────────────────────────────────────────────────────────────────────

export interface PromotionGoodsItem {
  nmId: number;
  vendorCode: string;
  name: string;
  brand: string;
  subject: string;
  inPromo: string;
  promoPrice: number;
  currentPrice: number;
  currentDiscount: number;
  uploadedDiscount: number;
  wbStock: number;
}

export function mapOfficialNomenclaturesToGoodsItems(
  nomenclatures: OfficialNomenclatureItem[],
  contentCards: OfficialContentCard[],
): PromotionGoodsItem[] {
  const cardMap = new Map<number, OfficialContentCard>();
  for (const card of contentCards) {
    cardMap.set(card.nmID, card);
  }

  return nomenclatures.map((item) => {
    const card = cardMap.get(item.id);
    return {
      nmId: item.id,
      vendorCode: card?.vendorCode || String(item.id),
      name: card?.title || '',
      brand: card?.brand || '',
      subject: card?.subjectName || '',
      inPromo: item.inAction ? 'Да' : 'Нет',
      promoPrice: item.planPrice ?? 0,
      currentPrice: item.price ?? 0,
      currentDiscount: item.discount ?? 0,
      uploadedDiscount: item.planDiscount ?? 0,
      wbStock: card?.stocks ?? 0,
    };
  });
}
