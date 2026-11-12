import { describe, expect, it } from 'vitest';
// The services' lists of valid values. The portal keeps its own copy for display.
import * as domain from '../../../packages/shared/src/domain';
import { formatMoney as sharedFormatMoney } from '../../../packages/shared/src/money';
import { CONDITIONS, GENRE_COLOURS, GENRES, MONSTERS, MOODS, RACES, SEVERITIES, TIERS } from './lore';
import { formatMoney } from './money';

describe("the portal's copy of the shop's vocabulary matches the services'", () => {
  it.each([
    ['genres', GENRES, domain.GENRES],
    ['conditions', CONDITIONS, domain.CONDITIONS],
    ['severities', SEVERITIES, domain.SEVERITIES],
    ['races', Object.keys(RACES), domain.RACES],
    ['monsters', Object.keys(MONSTERS), domain.MONSTERS],
    ['membership tiers', Object.keys(TIERS), domain.TIERS],
  ])('%s', (_name, portal, services) => {
    expect([...portal].sort()).toEqual([...services].sort());
  });

  it('has a cover colour for every genre', () => {
    expect(Object.keys(GENRE_COLOURS).sort()).toEqual([...domain.GENRES].sort());
  });

  it('has words for every mood the incidents service can report', () => {
    expect(Object.keys(MOODS).sort()).toEqual(['besieged', 'calm', 'wary']);
  });

  it('formats money exactly as the services do', () => {
    for (const copper of [0, 1, 9, 10, 11, 99, 100, 101, 110, 999, 1234, 1450, 100_000]) {
      expect(formatMoney(copper), `${copper} cp`).toBe(sharedFormatMoney(copper));
    }
  });
});
