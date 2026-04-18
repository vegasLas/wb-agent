export interface DraftOption {
  number: number;
  label: string;
  value: string;
}

export function formatDraftOption(
  index: number,
  draft: any,
): DraftOption {
  const date = draft.createdAt
    ? new Date(draft.createdAt).toLocaleDateString('ru-RU')
    : 'неизвестно';
  return {
    number: index + 1,
    label: `Черновик от ${date} — ${draft.goodQuantity} товаров, ${draft.barcodeQuantity} штрихкодов`,
    value: draft.ID,
  };
}

export function findBestDraftMatch(
  drafts: any[],
  hint?: string,
): { match: any | null; confidence: 'high' | 'low' | 'none' } {
  if (!hint || drafts.length === 0) {
    return { match: null, confidence: 'none' };
  }

  const numHint = parseInt(hint.replace(/\D/g, ''), 10);
  if (!isNaN(numHint)) {
    // Try exact match on goodQuantity first, then barcodeQuantity, then closest diff
    const scored = drafts.map((d) => {
      const gqDiff = Math.abs(d.goodQuantity - numHint);
      const bqDiff = Math.abs(d.barcodeQuantity - numHint);
      const minDiff = Math.min(gqDiff, bqDiff);
      return { draft: d, diff: minDiff };
    });

    scored.sort((a, b) => a.diff - b.diff);
    const best = scored[0];
    if (best.diff === 0) return { match: best.draft, confidence: 'high' };
    if (best.diff <= 5) return { match: best.draft, confidence: 'high' };
    if (best.diff <= 20) return { match: best.draft, confidence: 'low' };
  }

  return { match: null, confidence: 'none' };
}
