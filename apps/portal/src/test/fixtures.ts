import type { Incident, Patron, PatronStats, Sale, SalesSummary, ShopStatus, Tome, Ward } from '../types';

// A small, known shop for the screen tests.

export const dragons: Tome = {
  id: 7,
  title: 'Dragons at Tea',
  author: 'Orsolya Brightscale',
  genre: 'bestiary',
  description: 'Which dragons will share their tea.',
  priceCp: 1000,
  stock: 3,
  condition: 'pristine',
  restricted: false,
  featured: true,
};
export const breakfast: Tome = { ...dragons, id: 8, title: 'Second Breakfast', author: 'Pim Butterburr', genre: 'cookery', priceCp: 650, stock: 0, featured: false };
export const forbidden: Tome = { ...dragons, id: 9, title: 'Forbidden Names', author: 'Voss', genre: 'arcana', priceCp: 9900, stock: 2, restricted: true, featured: false };
export const tomes = [dragons, forbidden, breakfast];

export const thrain: Patron = { id: 1, name: 'Thrain Emberforge', race: 'dwarf', tier: 'regular', home: 'the Deep Halls', notes: 'Owes us a ballad.', joinedAt: '2026-01-05T10:00:00Z', totalSpentCp: 2000 };
export const ilyana: Patron = { id: 2, name: 'Ilyana Moonwhisper', race: 'elf', tier: 'wanderer', home: '', notes: '', joinedAt: '2026-02-01T10:00:00Z', totalSpentCp: 0 };
export const patrons = [ilyana, thrain];

export const sale: Sale = { id: 1, patronId: 1, patronName: 'Thrain Emberforge', tomeId: 7, tomeTitle: 'Dragons at Tea', quantity: 2, totalCp: 2000, soldBy: 'pip', soldAt: '2026-11-10T15:00:00Z' };

export const summary: SalesSummary = {
  allTimeCp: 123_456,
  last7DaysCp: 2000,
  salesCount: 40,
  bestSellers: [{ tomeTitle: 'Dragons at Tea', copies: 12, totalCp: 12_000 }],
};

export const openIncident: Incident = {
  id: 1,
  monster: 'bookwyrm',
  severity: 'dire',
  description: 'Chewing through the bestiaries.',
  tomeTitle: 'Dragons at Tea',
  copiesDamaged: 2,
  status: 'open',
  reportedBy: 'pip',
  reportedAt: '2026-11-11T09:00:00Z',
  resolvedBy: null,
  resolution: null,
};
export const resolvedIncident: Incident = {
  ...openIncident,
  id: 2,
  monster: 'mimic',
  severity: 'minor',
  description: 'Pretending to be a footstool.',
  tomeTitle: null,
  copiesDamaged: 0,
  status: 'resolved',
  resolvedBy: 'mirabel',
  resolution: 'Sat on it firmly.',
};

export const wards: Ward[] = [
  { id: 1, name: 'The Threshold Rune', location: 'Front door', description: 'Wipe your feet.', status: 'holding' },
  { id: 2, name: 'The Cellar Seal', location: 'Cellar hatch', description: 'Best left shut.', status: 'flickering' },
];

export const calm: ShopStatus = { mood: 'calm', openIncidents: 0, wards: wards.map(({ name, location, status }) => ({ name, location, status })) };
export const besieged: ShopStatus = { ...calm, mood: 'besieged', openIncidents: 1 };

export const stats: PatronStats = { totalPatrons: 2, byRace: [{ race: 'dwarf', count: 1 }, { race: 'elf', count: 1 }] };

/** An answer for everything the staff screens read, so any page can be opened. */
export function shopAnswers(): Record<string, unknown> {
  return {
    'GET /public/tomes': [dragons],
    'GET /public/patron-stats': stats,
    'GET /public/shop-status': calm,
    'GET /tomes': tomes,
    'GET /patrons': patrons,
    'GET /patrons/1': { ...thrain, sales: [sale] },
    'GET /sales': [sale],
    'GET /sales/summary': summary,
    'GET /incidents': [openIncident, resolvedIncident],
    'GET /incidents?status=open': [openIncident],
    'GET /wards': wards,
  };
}
