// Display details for the shop's vocabulary. The lists of valid values live in
// packages/shared/src/domain.ts; this file only says how to show them.

export const RACES: Record<string, { label: string; icon: string; blurb: string }> = {
  human: { label: 'Humans', icon: '🧑‍🌾', blurb: 'In a hurry, mostly. We keep the short books by the door.' },
  elf: { label: 'Elves', icon: '🧝', blurb: 'Browse for decades. Chairs provided.' },
  dwarf: { label: 'Dwarves', icon: '⛏️', blurb: 'Prefer hardbacks. Very hard backs.' },
  halfling: { label: 'Halflings', icon: '🥧', blurb: 'The cookery shelf is at a sensible height.' },
  gnome: { label: 'Gnomes', icon: '⚙️', blurb: 'Corrections in the margins are welcome.' },
  orc: { label: 'Orcs', icon: '🪓', blurb: 'Book club meets on Thursdays. Axes at the door.' },
  goblin: { label: 'Goblins', icon: '🕯️', blurb: 'Mysteries, mostly. Always guess the ending.' },
  dragonborn: { label: 'Dragonborn', icon: '🐉', blurb: 'Fireproof reading nook by the hearth.' },
  fae: { label: 'Fae', icon: '🦋', blurb: 'We accept coin. Not names, not firstborns.' },
};

export const MONSTERS: Record<string, { icon: string; habit: string }> = {
  bookwyrm: { icon: '🐛', habit: 'Eats its way through a shelf, cover to cover.' },
  mimic: { icon: '🗝️', habit: 'Poses as a rare first edition. Bites.' },
  poltergeist: { icon: '👻', habit: 'Reshelves everything by colour overnight.' },
  'ink imp': { icon: '🖋️', habit: 'Adds rude footnotes. Cannot spell.' },
  'dust wraith': { icon: '🌫️', habit: 'Haunts the top shelves. Causes sneezing.' },
  'paper golem': { icon: '📜', habit: 'Assembles itself from unpaid invoices.' },
  'margin gremlin': { icon: '✏️', habit: 'Doodles moustaches on every portrait.' },
};

export const GENRES = ['adventure', 'arcana', 'bestiary', 'cookery', 'history', 'poetry', 'romance', 'mystery', 'herbalism'];
export const CONDITIONS = ['pristine', 'well-loved', 'singed', 'nibbled'];
export const SEVERITIES = ['minor', 'troublesome', 'dire'];
export const TIERS: Record<string, string> = {
  wanderer: 'Wanderer',
  regular: 'Regular',
  fellow: 'Fellow of the Griffin',
};

/** Cover colours by genre, for the little painted book covers. */
export const GENRE_COLOURS: Record<string, string> = {
  adventure: '#2f5d50',
  arcana: '#4b2e6b',
  bestiary: '#8a3b22',
  cookery: '#b0702a',
  history: '#5a4632',
  poetry: '#2e4a6b',
  romance: '#8f3554',
  mystery: '#2e3440',
  herbalism: '#55702f',
};

export const MOODS = {
  calm: { label: 'All is calm', line: 'The wards are humming and the kettle is on.' },
  wary: { label: 'A little wary', line: 'Something is rustling in the stacks. It is being dealt with.' },
  besieged: { label: 'Beset by monsters', line: 'Mind your fingers. Adventurers have been sent for.' },
};
