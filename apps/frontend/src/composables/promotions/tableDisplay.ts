/**
 * usePromotionTableDisplay Composable
 *
 * Display helpers for the promotion participants table.
 */

import type { PromotionGoodsItem } from '@/types';

export function usePromotionTableDisplay() {
  function formatPrice(price: number): string {
    if (!price && price !== 0) return '-';
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  }

  function getDiscountClass(item: PromotionGoodsItem): string {
    const current = Number(item.currentDiscount) || 0;
    const uploaded = Number(item.uploadedDiscount) || 0;

    if (uploaded > current) {
      return 'text-green-600 dark:text-green-400';
    } else if (uploaded < current) {
      return 'text-orange-600 dark:text-orange-400';
    }
    return 'text-gray-600 dark:text-gray-400';
  }

  function getStockClass(stock: number): string {
    if (stock === 0) return 'text-red-500 dark:text-red-400 font-medium';
    if (stock < 10) return 'text-orange-500 dark:text-orange-400';
    return 'text-gray-600 dark:text-gray-400';
  }

  function getTurnoverClass(turnover: number): string {
    if (turnover <= 30) return 'text-green-600 dark:text-green-400';
    if (turnover <= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  }

  return {
    formatPrice,
    getDiscountClass,
    getStockClass,
    getTurnoverClass,
  };
}
