import { describe, expect, it } from 'vitest';
import { shopMood } from '../src/shopMood';

describe('shopMood', () => {
  it('is calm when nothing is afoot', () => {
    expect(shopMood([])).toBe('calm');
  });

  it('is wary when there are open incidents but none are dire', () => {
    expect(shopMood(['minor', 'troublesome'])).toBe('wary');
  });

  it('is besieged as soon as one open incident is dire', () => {
    expect(shopMood(['minor', 'dire'])).toBe('besieged');
  });
});
