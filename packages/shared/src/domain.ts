/**
 * The shared vocabulary of the shop. Services validate against these lists,
 * so adding a new race or monster starts here.
 */
export const ROLES = ['owner', 'clerk'] as const;
export type Role = (typeof ROLES)[number];

export const RACES = ['human', 'elf', 'dwarf', 'halfling', 'gnome', 'orc', 'goblin', 'dragonborn', 'fae'] as const;
export type Race = (typeof RACES)[number];

export const TIERS = ['wanderer', 'regular', 'fellow'] as const;
export type Tier = (typeof TIERS)[number];

export const GENRES = [
  'adventure',
  'arcana',
  'bestiary',
  'cookery',
  'history',
  'poetry',
  'romance',
  'mystery',
  'herbalism',
] as const;
export type Genre = (typeof GENRES)[number];

export const CONDITIONS = ['pristine', 'well-loved', 'singed', 'nibbled'] as const;
export type Condition = (typeof CONDITIONS)[number];

export const MONSTERS = [
  'bookwyrm',
  'mimic',
  'poltergeist',
  'ink imp',
  'dust wraith',
  'paper golem',
  'margin gremlin',
] as const;
export type Monster = (typeof MONSTERS)[number];

export const SEVERITIES = ['minor', 'troublesome', 'dire'] as const;
export type Severity = (typeof SEVERITIES)[number];

export const WARD_STATUSES = ['holding', 'flickering', 'broken'] as const;
export type WardStatus = (typeof WARD_STATUSES)[number];
