import { describe, expect, it } from 'vitest';
import { isJourneyRow, JOURNEY_NAMES, unique } from '../journeys/shop';

describe('which rows the journeys made', () => {
  it.each(JOURNEY_NAMES)('recognises a journey row named "%s"', (name) => {
    expect(isJourneyRow(unique(name))).toBe(true);
  });

  it.each(JOURNEY_NAMES)('leaves lookalikes of "%s" alone', (name) => {
    expect(isJourneyRow(name)).toBe(false);
    expect(isJourneyRow(`${name} of Doom`)).toBe(false);
    expect(isJourneyRow(`x ${unique(name)}`)).toBe(false);
  });

  it('leaves a demo patron whose name starts like a journey name alone', () => {
    expect(isJourneyRow('Loyal Grusha')).toBe(false);
  });
});
