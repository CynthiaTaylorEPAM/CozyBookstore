/**
 * Emberhollow coinage. Every price in the system is stored as a whole number
 * of copper pieces (cp), so we never do arithmetic on fractions.
 *
 *   1 gold piece (gp) = 10 silver pieces (sp) = 100 copper pieces (cp)
 */
export const COPPER_PER_SILVER = 10;
export const COPPER_PER_GOLD = 100;

export interface Coins {
  gold: number;
  silver: number;
  copper: number;
}

export function toCoins(totalCopper: number): Coins {
  if (!Number.isInteger(totalCopper) || totalCopper < 0) {
    throw new Error(`Not a valid amount of copper: ${totalCopper}`);
  }
  return {
    gold: Math.floor(totalCopper / COPPER_PER_GOLD),
    silver: Math.floor((totalCopper % COPPER_PER_GOLD) / COPPER_PER_SILVER),
    copper: totalCopper % COPPER_PER_SILVER,
  };
}

export function toCopper(coins: Partial<Coins>): number {
  return (
    (coins.gold ?? 0) * COPPER_PER_GOLD + (coins.silver ?? 0) * COPPER_PER_SILVER + (coins.copper ?? 0)
  );
}

/** Formats 1234 as "12 gp 3 sp 4 cp". Zero-value coins are left out. */
export function formatMoney(totalCopper: number): string {
  const { gold, silver, copper } = toCoins(totalCopper);
  const parts: string[] = [];
  if (gold) parts.push(`${gold} gp`);
  if (silver) parts.push(`${silver} sp`);
  if (copper) parts.push(`${copper} cp`);
  return parts.length ? parts.join(' ') : '0 cp';
}
