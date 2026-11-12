import { describe, expect, it } from 'vitest';
import { formatMoney, toCoins, toCopper } from './money';

describe('money', () => {
  it('splits copper into gold, silver and copper', () => {
    expect(toCoins(1234)).toEqual({ gold: 12, silver: 3, copper: 4 });
  });

  it.each([
    [0, { gold: 0, silver: 0, copper: 0 }],
    [9, { gold: 0, silver: 0, copper: 9 }],
    [10, { gold: 0, silver: 1, copper: 0 }],
    [99, { gold: 0, silver: 9, copper: 9 }],
    [100, { gold: 1, silver: 0, copper: 0 }],
    [1_000_000, { gold: 10_000, silver: 0, copper: 0 }],
  ])('carries over at the coin boundaries: %i cp', (copper, coins) => {
    expect(toCoins(copper)).toEqual(coins);
  });

  it('round-trips through toCopper', () => {
    expect(toCopper(toCoins(987))).toBe(987);
    expect(toCopper({ gold: 2 })).toBe(200);
  });

  it('treats missing coins as none', () => {
    expect(toCopper({})).toBe(0);
    expect(toCopper({ silver: 3 })).toBe(30);
    expect(toCopper({ gold: 1, copper: 5 })).toBe(105);
  });

  it('formats amounts, leaving out empty coins', () => {
    expect(formatMoney(1234)).toBe('12 gp 3 sp 4 cp');
    expect(formatMoney(500)).toBe('5 gp');
    expect(formatMoney(7)).toBe('7 cp');
    expect(formatMoney(0)).toBe('0 cp');
    expect(formatMoney(1005)).toBe('10 gp 5 cp');
    expect(formatMoney(30)).toBe('3 sp');
  });

  it('rejects negative or fractional copper', () => {
    expect(() => toCoins(-1)).toThrow();
    expect(() => toCoins(1.5)).toThrow();
    expect(() => toCoins(Number.NaN)).toThrow();
    expect(() => formatMoney(-5)).toThrow();
  });
});
