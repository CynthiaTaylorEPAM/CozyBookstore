/** 1 gold piece = 10 silver = 100 copper. The API always sends copper. */
export function formatMoney(totalCopper: number): string {
  const gold = Math.floor(totalCopper / 100);
  const silver = Math.floor((totalCopper % 100) / 10);
  const copper = totalCopper % 10;
  const parts: string[] = [];
  if (gold) parts.push(`${gold} gp`);
  if (silver) parts.push(`${silver} sp`);
  if (copper) parts.push(`${copper} cp`);
  return parts.length ? parts.join(' ') : '0 cp';
}

/** Turns "12.5" gold pieces typed into a form into copper pieces. */
export function goldToCopper(gold: string): number {
  return Math.round(Number(gold) * 100);
}

export function when(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}
