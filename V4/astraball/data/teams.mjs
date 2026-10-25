// Astraball-only roster and symmetric role definitions. No Kalistar data imports.
export const ROLE_STATS = Object.freeze({
  sentry: Object.freeze({ VIT: 9, MOB: 4, FOR: 4, PAS: 6, TIR: 5, DEF: 5 }),
  meneur: Object.freeze({ VIT: 8, MOB: 3, FOR: 4, PAS: 9, TIR: 6, DEF: 5 }),
  scoreur: Object.freeze({ VIT: 7, MOB: 3, FOR: 5, PAS: 6, TIR: 9, DEF: 4 }),
  middle: Object.freeze({ VIT: 6, MOB: 3, FOR: 7, PAS: 7, TIR: 7, DEF: 7 }),
  pilier: Object.freeze({ VIT: 4, MOB: 2, FOR: 9, PAS: 5, TIR: 4, DEF: 9 }),
});

export const ROLES = Object.freeze(Object.keys(ROLE_STATS));

// Left-side formation; team 1 mirrors x about the pitch's center (x = 6).
export const FORMATION = Object.freeze({
  meneur: Object.freeze({ x: 3, y: 3 }),
  scoreur: Object.freeze({ x: 4, y: 1 }),
  middle: Object.freeze({ x: 4, y: 5 }),
  sentry: Object.freeze({ x: 2, y: 2 }),
  pilier: Object.freeze({ x: 1, y: 3 }),
});

export const TEAMS = [
  {
    id: 0,
    name: 'Chroma',
    color: '#42d6c2',
    players: [
      { id: 't0-momo', name: 'Momo', role: 'meneur' },
      { id: 't0-kaylis', name: 'Kaylis', role: 'scoreur' },
      { id: 't0-taulio', name: 'Taulio', role: 'middle' },
      { id: 't0-cana', name: 'Cana', role: 'sentry' },
      { id: 't0-balmhyr', name: 'Balmhyr', role: 'pilier' },
    ],
  },
  {
    id: 1,
    name: 'Obsidienne',
    color: '#ed7094',
    players: [
      { id: 't1-voloden', name: 'Voloden', role: 'meneur' },
      { id: 't1-lok', name: 'Lok', role: 'scoreur' },
      { id: 't1-darnako', name: 'Darnako', role: 'middle' },
      { id: 't1-iliane', name: 'Iliane', role: 'sentry' },
      { id: 't1-valazar', name: 'Valazar', role: 'pilier' },
    ],
  },
];
