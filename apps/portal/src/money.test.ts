import { describe, expect, it } from 'vitest';
import { formatMoney, goldToCopper, when } from './money';

describe('portal money helpers', () => {
  it('formats copper as gold, silver and copper', () => {
    expect(formatMoney(1234)).toBe('12 gp 3 sp 4 cp');
    expect(formatMoney(0)).toBe('0 cp');
  });

  it('converts typed gold into copper without rounding surprises', () => {
    expect(goldToCopper('14.5')).toBe(1450);
    expect(goldToCopper('0.07')).toBe(7);
  });

  it.each([
    ['12', 1200],
    ['0', 0],
    ['0.01', 1],
    ['0.29', 29],
    ['1.15', 115],
    ['19.99', 1999],
    ['8.2', 820],
    [' 3 ', 300],
  ])('reads "%s" gold as %i copper', (typed, copper) => {
    expect(goldToCopper(typed)).toBe(copper);
  });

  it('rounds a third decimal place to the nearest copper', () => {
    expect(goldToCopper('1.234')).toBe(123);
    expect(goldToCopper('1.236')).toBe(124);
  });

  it('gives something the API will refuse when the price is not a number', () => {
    // NaN becomes null in JSON, which the catalog rejects as an invalid price.
    expect(goldToCopper('abc')).toBeNaN();
    expect(JSON.stringify({ priceCp: goldToCopper('abc') })).toBe('{"priceCp":null}');
  });
});

describe('when', () => {
  it('shows a date and time a person can read', () => {
    const text = when('2026-11-12T14:30:00Z');
    expect(text).toMatch(/\d/);
    expect(text).not.toContain('T14');
  });
});
