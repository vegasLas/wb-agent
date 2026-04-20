/**
 * Wildberries product image URL generator
 * Shared across feedback components to avoid duplication.
 */

export function getWbImageUrl(wbArticle: number | undefined): string {
  if (!wbArticle) return '/placeholder-product.png';
  const articleStr = wbArticle.toString();
  const first4 = articleStr.slice(0, 4);
  const first6 = articleStr.slice(0, 6);
  return `https://rst-basket-cdn-06.geobasket.ru/vol${first4}/part${first6}/${wbArticle}/images/tm/1.webp`;
}
