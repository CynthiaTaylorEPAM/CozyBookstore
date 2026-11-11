import type { Severity } from '@griffin/shared';

export type ShopMood = 'calm' | 'wary' | 'besieged';

/**
 * Sums up the open incidents in one word for the landing page and dashboard:
 * no open incidents is calm, any dire one means besieged, otherwise wary.
 */
export function shopMood(openSeverities: Severity[]): ShopMood {
  if (openSeverities.length === 0) return 'calm';
  return openSeverities.includes('dire') ? 'besieged' : 'wary';
}
