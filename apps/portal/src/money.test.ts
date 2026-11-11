import { describe, expect, it } from 'vitest';
import { formatMoney, goldToCopper } from './money';

describe('portal money helpers', () => {
  it('formats copper as gold, silver and copper', () => {
    expect(formatMoney(1234)).toBe('12 gp 3 sp 4 cp');
    expect(formatMoney(0)).toBe('0 cp');
  });

  it('converts typed gold into copper without rounding surprises', () => {
    expect(goldToCopper('14.5')).toBe(1450);
    expect(goldToCopper('0.07')).toBe(7);
  });
});
