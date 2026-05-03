import type {
  OfficialContentCard,
  OfficialContentCardsResponse,
} from './wb-content-official.service';

// ---------------------------------------------------------------------------
// DTOs — Lean shapes exposed to consumers (frontend, AI tools)
// ---------------------------------------------------------------------------

/** Single item in a content cards list (table view). */
export interface ContentCardListItemDTO {
  title: string;
  nmID: number;
  stocks: number;
  subject: string;
  feedbackRating: number;
  vendorCode: string;
  thumbnail: string | null;
}

/** Paginated list response for content cards. */
export interface ContentCardListResponseDTO {
  cards: ContentCardListItemDTO[];
  cursor: {
    next: boolean;
    n: number;
    nmID: number;
  };
  totalCount: number;
}

/** Detailed content card (IMT / detail view). */
export interface ContentCardDetailDTO {
  nmID: number;
  vendorCode: string;
  title: string;
  imtID: number;
  subjectName: string;
  brand: string;
  sizes: {
    chrtID: number;
    techSize: string;
    wbSize: string;
    skus: string[];
  }[];
  mediaFiles: {
    url: string;
    miniUrl: string;
  }[];
  colors: string[];
  stocks: number;
}

// ---------------------------------------------------------------------------
// Mappers — Transform official upstream types → lean DTOs
// ---------------------------------------------------------------------------

export function toContentCardListItemDTO(
  card: OfficialContentCard,
): ContentCardListItemDTO {
  return {
    title: card.title,
    nmID: card.nmID,
    stocks: card.stocks,
    subject: card.subjectName,
    feedbackRating: card.feedbackRating,
    vendorCode: card.vendorCode,
    thumbnail:
      card.mediaFiles?.[0]?.miniUrl || card.mediaFiles?.[0]?.url || null,
  };
}

export function toContentCardListResponseDTO(
  response: OfficialContentCardsResponse,
  limit: number,
): ContentCardListResponseDTO {
  const cards = response.cards || [];
  const cursor = response.cursor;

  return {
    cards: cards.map(toContentCardListItemDTO),
    cursor: {
      next: cards.length === limit && cursor != null,
      n: limit,
      nmID: cursor?.nmID ?? 0,
    },
    totalCount: cursor?.total ?? cards.length,
  };
}

export function toContentCardDetailDTO(
  card: OfficialContentCard,
): ContentCardDetailDTO {
  return {
    nmID: card.nmID,
    vendorCode: card.vendorCode,
    title: card.title,
    imtID: card.imtID,
    subjectName: card.subjectName,
    brand: card.brand,
    sizes: card.sizes.map((s) => ({
      chrtID: s.chrtID,
      techSize: s.techSize,
      wbSize: s.wbSize,
      skus: s.skus,
    })),
    mediaFiles: card.mediaFiles.map((m) => ({
      url: m.url,
      miniUrl: m.miniUrl,
    })),
    colors: card.colors,
    stocks: card.stocks,
  };
}
