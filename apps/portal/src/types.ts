// The shapes the gateway API returns. Kept in step with the services by hand;
// see docs/api.md for the full list of endpoints.

export type Role = 'owner' | 'clerk';

export interface Staff {
  id: number;
  username: string;
  displayName: string;
  role: Role;
}

export interface Tome {
  id: number;
  title: string;
  author: string;
  genre: string;
  description: string;
  priceCp: number;
  stock: number;
  condition: string;
  restricted: boolean;
  featured: boolean;
}

export interface Patron {
  id: number;
  name: string;
  race: string;
  tier: string;
  home: string;
  notes: string;
  joinedAt: string;
  totalSpentCp?: number;
  sales?: Sale[];
}

export interface Sale {
  id: number;
  patronId: number;
  patronName: string;
  tomeId: number;
  tomeTitle: string;
  quantity: number;
  totalCp: number;
  soldBy: string;
  soldAt: string;
}

export interface SalesSummary {
  allTimeCp: number;
  last7DaysCp: number;
  salesCount: number;
  bestSellers: { tomeTitle: string; copies: number; totalCp: number }[];
}

export interface Incident {
  id: number;
  monster: string;
  severity: 'minor' | 'troublesome' | 'dire';
  description: string;
  tomeTitle: string | null;
  copiesDamaged: number;
  status: 'open' | 'resolved';
  reportedBy: string;
  reportedAt: string;
  resolvedBy: string | null;
  resolution: string | null;
}

export interface Ward {
  id?: number;
  name: string;
  location: string;
  description?: string;
  status: 'holding' | 'flickering' | 'broken';
}

export interface ShopStatus {
  mood: 'calm' | 'wary' | 'besieged';
  openIncidents: number;
  wards: Ward[];
}

export interface PatronStats {
  totalPatrons: number;
  byRace: { race: string; count: number }[];
}
