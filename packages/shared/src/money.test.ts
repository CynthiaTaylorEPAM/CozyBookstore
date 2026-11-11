import { describe, expect, it } from 'vitest';
import { formatMoney, toCoins, toCopper } from './money';

describe('money', () => {
  it('splits copper into gold, silver and copper', () => {
    expect(toCoins(1234)).toEqual({ gold: 12, silver: 3, copper: 4 });
  });

  it('round-trips through toCopper', () => {
    expect(toCopper(toCoins(987))).toBe(987);
    expect(toCopper({ gold: 2 })).toBe(200);
  });

  it('formats amounts, leaving out empty coins', () => {
    expect(formatMoney(1234)).toBe('12 gp 3 sp 4 cp');
    expect(formatMoney(500)).toBe('5 gp');
    expect(formatMoney(7)).toBe('7 cp');
    expect(formatMoney(0)).toBe('0 cp');
  });

  it('rejects negative or fractional copper', () => {
    expect(() => toCoins(-1)).toThrow();
    expect(() => toCoins(1.5)).toThrow();
  });
});
