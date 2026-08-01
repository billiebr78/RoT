// Map data for Realm of the Trinity — 16x16 grid world map.
// Terrain types, level distribution, and cell configuration.

export type TerrainType =
  | 'City' | 'Road' | 'Grass' | 'Forest' | 'Mountain'
  | 'Sand' | 'Mud' | 'Ice' | 'Castle' | 'Cavern'
  | 'Water' | 'Rock' | 'Lava';

export interface TerrainConfig {
  spawnChance: number;      // 0-1, chance to spawn an enemy when visited
  cooldownTurns: number;    // turns the cell stays "cleared" after winning
  accessible: boolean;      // false = impassable (water, rock, lava)
  spawnPool: string[];      // enemy names that can spawn here (ordered by difficulty)
}

export const TERRAIN_CONFIGS: Record<TerrainType, TerrainConfig> = {
  City:     { spawnChance: 0,    cooldownTurns: Infinity, accessible: true,  spawnPool: [] },
  Road:     { spawnChance: 0.40, cooldownTurns: 10,       accessible: true,  spawnPool: ['Orc', 'Skeleton', 'Orc Shaman'] },
  Grass:    { spawnChance: 0.60, cooldownTurns: 10,       accessible: true,  spawnPool: ['Rat', 'Goblin', 'Orc'] },
  Forest:   { spawnChance: 0.70, cooldownTurns: 8,        accessible: true,  spawnPool: ['Orc', 'Orc Shaman', 'Wolf'] },
  Mountain: { spawnChance: 0.60, cooldownTurns: 10,       accessible: true,  spawnPool: ['Giant Bat', 'Wolf', 'Spider', 'Golem'] },
  Sand:     { spawnChance: 0.40, cooldownTurns: 20,       accessible: true,  spawnPool: ['Orc', 'Orc Shaman', 'Wolf'] },
  Mud:      { spawnChance: 0.50, cooldownTurns: 6,        accessible: true,  spawnPool: ['Orc', 'Orc Shaman', 'Wolf'] },
  Ice:      { spawnChance: 0.10, cooldownTurns: 60,       accessible: true,  spawnPool: ['Orc', 'Orc Shaman', 'Wolf'] },
  Castle:   { spawnChance: 0.80, cooldownTurns: 20,       accessible: true,  spawnPool: ['Skeleton', 'Orc', 'Vampire'] },
  Cavern:   { spawnChance: 0.70, cooldownTurns: 6,        accessible: true,  spawnPool: ['Skeleton', 'Dark Knight', 'Sorcerer'] },
  Water:    { spawnChance: 0,    cooldownTurns: 0,        accessible: false, spawnPool: [] },
  Rock:     { spawnChance: 0,    cooldownTurns: 0,        accessible: false, spawnPool: [] },
  Lava:     { spawnChance: 0,    cooldownTurns: 0,        accessible: false, spawnPool: [] },
};

// Boss/miniboss cooldown: 30 base + 10 extra = 40 turns
export const BOSS_COOLDOWN_TURNS = 40;

// 16x16 terrain grid (row-major, 0-indexed)
// Row 0 = top, Row 15 = bottom. Col 0 = left, Col 15 = right.
export const MAP_TERRAIN: TerrainType[][] = [
  // Row 0
  ['Rock','Rock','Lava','Lava','Mountain','Mountain','Rock','Road','Rock','Sand','Sand','Rock','Water','Water','Water','Rock'],
  // Row 1
  ['Rock','Cavern','Lava','Grass','Forest','Forest','Forest','Grass','Road','Grass','Sand','Water','Rock','Water','Water','Water'],
  // Row 2
  ['Forest','Rock','Forest','Lava','Forest','Grass','Forest','Grass','Road','Sand','Sand','Sand','Water','Castle','Water','Water'],
  // Row 3
  ['Forest','Forest','Forest','Forest','Grass','Forest','Grass','Road','Grass','Grass','Sand','Water','Rock','Water','Water','Water'],
  // Row 4
  ['Water','Grass','Grass','Grass','Grass','Forest','Forest','Grass','Road','Sand','Grass','Sand','Water','Mud','Water','Water'],
  // Row 5
  ['Water','Mud','Forest','Mud','Grass','Sand','Sand','Forest','Grass','Road','Grass','Sand','Mud','Mud','Rock','Mud'],
  // Row 6
  ['Water','Water','Mud','Grass','Grass','Forest','Forest','Grass','Grass','Road','Forest','Mud','Grass','Mud','Grass','Sand'],
  // Row 7
  ['Sand','Water','Grass','Sand','Forest','Forest','Grass','Forest','Grass','Road','Forest','Mud','Mud','Grass','Forest','Grass'],
  // Row 8
  ['Sand','Water','Sand','Forest','Road','Road','Forest','City','Road','Forest','Sand','Forest','Grass','Grass','Forest','Mud'],
  // Row 9
  ['Forest','Road','Road','Road','Grass','Road','Forest','Road','Grass','Forest','Sand','Forest','Grass','Forest','Sand','Mud'],
  // Row 10
  ['City','Road','Mountain','Mountain','Mountain','Grass','Road','Road','Grass','Grass','Forest','Rock','Grass','Forest','Forest','Sand'],
  // Row 11
  ['Grass','Forest','Rock','Rock','Rock','Sand','Forest','Sand','Road','Forest','Road','Grass','Rock','Grass','Mud','Mud'],
  // Row 12
  ['Forest','Grass','Rock','Castle','Rock','Grass','Sand','Mud','Forest','Road','Mountain','Road','Castle','Rock','Ice','Ice'],
  // Row 13
  ['Forest','Rock','Forest','Grass','Forest','Sand','Sand','Grass','Forest','Grass','Mountain','Road','Rock','Grass','Sand','Ice'],
  // Row 14
  ['Rock','Cavern','Grass','Forest','Sand','Water','Sand','Mud','Mud','Forest','Forest','Mountain','City','Sand','Ice','Ice'],
  // Row 15
  ['Rock','Rock','Forest','Grass','Sand','Water','Water','Sand','Mud','Mud','Forest','Mountain','Sand','Ice','Ice','Ice'],
];

// Cell type for the heatmap — what spawns in each cell
export type CellSpawnType =
  | { type: 'none' }                                    // No spawn (0%)
  | { type: 'normal'; levelRange: [number, number] }    // Normal enemies, level range
  | { type: 'miniboss'; level: number }                 // 80% miniboss spawn
  | { type: 'boss' };                                   // 100% boss spawn

// 16x16 spawn/level grid parsed from heatmap CSV
// Level ranges: [min, max] for normal cells
export const MAP_SPAWN: CellSpawnType[][] = [
  // Row 0
  [{type:'none'},{type:'none'},{type:'none'},{type:'none'},{type:'miniboss',level:35},{type:'normal',levelRange:[31,35]},{type:'none'},{type:'normal',levelRange:[31,35]},{type:'none'},{type:'normal',levelRange:[31,35]},{type:'normal',levelRange:[31,35]},{type:'none'},{type:'none'},{type:'none'},{type:'none'},{type:'none'}],
  // Row 1
  [{type:'none'},{type:'boss'},{type:'none'},{type:'normal',levelRange:[26,30]},{type:'normal',levelRange:[26,30]},{type:'normal',levelRange:[26,30]},{type:'normal',levelRange:[26,30]},{type:'normal',levelRange:[26,30]},{type:'normal',levelRange:[26,30]},{type:'normal',levelRange:[26,30]},{type:'normal',levelRange:[31,35]},{type:'none'},{type:'none'},{type:'none'},{type:'none'},{type:'none'}],
  // Row 2
  [{type:'normal',levelRange:[31,35]},{type:'none'},{type:'normal',levelRange:[26,30]},{type:'none'},{type:'normal',levelRange:[26,30]},{type:'normal',levelRange:[21,25]},{type:'normal',levelRange:[26,30]},{type:'normal',levelRange:[21,25]},{type:'normal',levelRange:[16,20]},{type:'normal',levelRange:[26,30]},{type:'normal',levelRange:[26,30]},{type:'normal',levelRange:[26,30]},{type:'none'},{type:'boss'},{type:'none'},{type:'none'}],
  // Row 3
  [{type:'normal',levelRange:[26,30]},{type:'normal',levelRange:[26,30]},{type:'normal',levelRange:[26,30]},{type:'normal',levelRange:[21,25]},{type:'normal',levelRange:[21,25]},{type:'normal',levelRange:[21,25]},{type:'normal',levelRange:[21,25]},{type:'normal',levelRange:[21,25]},{type:'normal',levelRange:[26,30]},{type:'normal',levelRange:[16,20]},{type:'normal',levelRange:[26,30]},{type:'none'},{type:'none'},{type:'none'},{type:'none'},{type:'none'}],
  // Row 4
  [{type:'none'},{type:'normal',levelRange:[26,30]},{type:'normal',levelRange:[16,20]},{type:'normal',levelRange:[21,25]},{type:'normal',levelRange:[21,25]},{type:'normal',levelRange:[26,30]},{type:'miniboss',level:15},{type:'normal',levelRange:[16,20]},{type:'normal',levelRange:[16,20]},{type:'normal',levelRange:[21,25]},{type:'normal',levelRange:[21,25]},{type:'normal',levelRange:[26,30]},{type:'none'},{type:'normal',levelRange:[31,35]},{type:'none'},{type:'none'}],
  // Row 5
  [{type:'none'},{type:'normal',levelRange:[31,35]},{type:'normal',levelRange:[21,25]},{type:'normal',levelRange:[21,25]},{type:'normal',levelRange:[26,30]},{type:'normal',levelRange:[11,15]},{type:'normal',levelRange:[11,15]},{type:'normal',levelRange:[6,10]},{type:'normal',levelRange:[11,15]},{type:'normal',levelRange:[16,20]},{type:'normal',levelRange:[21,25]},{type:'miniboss',level:25},{type:'normal',levelRange:[26,30]},{type:'normal',levelRange:[26,30]},{type:'none'},{type:'miniboss',level:35}],
  // Row 6
  [{type:'none'},{type:'none'},{type:'normal',levelRange:[26,30]},{type:'normal',levelRange:[21,25]},{type:'normal',levelRange:[16,20]},{type:'normal',levelRange:[11,15]},{type:'normal',levelRange:[6,10]},{type:'normal',levelRange:[1,5]},{type:'normal',levelRange:[6,10]},{type:'normal',levelRange:[11,15]},{type:'normal',levelRange:[16,20]},{type:'normal',levelRange:[21,25]},{type:'normal',levelRange:[21,25]},{type:'normal',levelRange:[26,30]},{type:'normal',levelRange:[26,30]},{type:'normal',levelRange:[31,35]}],
  // Row 7
  [{type:'normal',levelRange:[21,25]},{type:'none'},{type:'normal',levelRange:[21,25]},{type:'normal',levelRange:[11,15]},{type:'normal',levelRange:[11,15]},{type:'normal',levelRange:[6,10]},{type:'normal',levelRange:[1,5]},{type:'normal',levelRange:[1,5]},{type:'normal',levelRange:[1,5]},{type:'normal',levelRange:[6,10]},{type:'normal',levelRange:[11,15]},{type:'normal',levelRange:[16,20]},{type:'normal',levelRange:[21,25]},{type:'normal',levelRange:[21,25]},{type:'normal',levelRange:[26,30]},{type:'normal',levelRange:[26,30]}],
  // Row 8
  [{type:'normal',levelRange:[21,25]},{type:'none'},{type:'normal',levelRange:[21,25]},{type:'normal',levelRange:[11,15]},{type:'normal',levelRange:[1,5]},{type:'normal',levelRange:[1,5]},{type:'normal',levelRange:[1,5]},{type:'none'},{type:'normal',levelRange:[1,5]},{type:'normal',levelRange:[1,5]},{type:'normal',levelRange:[11,15]},{type:'normal',levelRange:[16,20]},{type:'normal',levelRange:[16,20]},{type:'normal',levelRange:[21,25]},{type:'normal',levelRange:[26,30]},{type:'normal',levelRange:[26,30]}],
  // Row 9
  [{type:'normal',levelRange:[6,10]},{type:'normal',levelRange:[21,25]},{type:'normal',levelRange:[1,5]},{type:'normal',levelRange:[1,5]},{type:'normal',levelRange:[6,10]},{type:'miniboss',level:5},{type:'normal',levelRange:[1,5]},{type:'normal',levelRange:[1,5]},{type:'normal',levelRange:[1,5]},{type:'normal',levelRange:[6,10]},{type:'normal',levelRange:[11,15]},{type:'normal',levelRange:[16,20]},{type:'normal',levelRange:[21,25]},{type:'normal',levelRange:[26,30]},{type:'normal',levelRange:[21,25]},{type:'normal',levelRange:[21,25]}],
  // Row 10
  [{type:'none'},{type:'normal',levelRange:[11,15]},{type:'normal',levelRange:[21,25]},{type:'normal',levelRange:[11,15]},{type:'normal',levelRange:[11,15]},{type:'normal',levelRange:[6,10]},{type:'normal',levelRange:[6,10]},{type:'normal',levelRange:[1,5]},{type:'normal',levelRange:[6,10]},{type:'normal',levelRange:[6,10]},{type:'normal',levelRange:[11,15]},{type:'none'},{type:'normal',levelRange:[26,30]},{type:'normal',levelRange:[21,25]},{type:'normal',levelRange:[21,25]},{type:'miniboss',level:25}],
  // Row 11
  [{type:'normal',levelRange:[11,15]},{type:'miniboss',level:15},{type:'none'},{type:'none'},{type:'none'},{type:'normal',levelRange:[11,15]},{type:'none'},{type:'normal',levelRange:[6,10]},{type:'normal',levelRange:[1,5]},{type:'normal',levelRange:[11,15]},{type:'normal',levelRange:[16,20]},{type:'normal',levelRange:[26,30]},{type:'none'},{type:'normal',levelRange:[26,30]},{type:'normal',levelRange:[21,25]},{type:'normal',levelRange:[21,25]}],
  // Row 12
  [{type:'normal',levelRange:[11,15]},{type:'normal',levelRange:[21,25]},{type:'none'},{type:'boss'},{type:'none'},{type:'normal',levelRange:[6,10]},{type:'normal',levelRange:[11,15]},{type:'normal',levelRange:[11,15]},{type:'normal',levelRange:[11,15]},{type:'normal',levelRange:[16,20]},{type:'normal',levelRange:[21,25]},{type:'normal',levelRange:[26,30]},{type:'boss'},{type:'none'},{type:'normal',levelRange:[26,30]},{type:'normal',levelRange:[26,30]}],
  // Row 13
  [{type:'normal',levelRange:[21,25]},{type:'none'},{type:'normal',levelRange:[31,35]},{type:'normal',levelRange:[31,35]},{type:'normal',levelRange:[21,25]},{type:'normal',levelRange:[21,25]},{type:'normal',levelRange:[21,25]},{type:'normal',levelRange:[16,20]},{type:'normal',levelRange:[16,20]},{type:'normal',levelRange:[16,20]},{type:'normal',levelRange:[21,25]},{type:'normal',levelRange:[21,25]},{type:'none'},{type:'normal',levelRange:[26,30]},{type:'normal',levelRange:[31,35]},{type:'normal',levelRange:[26,30]}],
  // Row 14
  [{type:'none'},{type:'boss'},{type:'normal',levelRange:[31,35]},{type:'normal',levelRange:[26,30]},{type:'normal',levelRange:[26,30]},{type:'none'},{type:'normal',levelRange:[26,30]},{type:'normal',levelRange:[26,30]},{type:'normal',levelRange:[6,10]},{type:'normal',levelRange:[26,30]},{type:'normal',levelRange:[21,25]},{type:'normal',levelRange:[26,30]},{type:'none'},{type:'normal',levelRange:[26,30]},{type:'miniboss',level:35},{type:'normal',levelRange:[26,30]}],
  // Row 15
  [{type:'none'},{type:'none'},{type:'normal',levelRange:[26,30]},{type:'normal',levelRange:[26,30]},{type:'normal',levelRange:[31,35]},{type:'none'},{type:'none'},{type:'normal',levelRange:[31,35]},{type:'normal',levelRange:[6,10]},{type:'normal',levelRange:[6,10]},{type:'normal',levelRange:[26,30]},{type:'normal',levelRange:[26,30]},{type:'normal',levelRange:[26,30]},{type:'normal',levelRange:[26,30]},{type:'normal',levelRange:[26,30]},{type:'normal',levelRange:[26,30]}],
];

// Starting position: central city at R8C7 (0-indexed) = R9C8 (1-indexed)
export const PLAYER_START: { row: number; col: number } = { row: 8, col: 7 };

// City positions (0-indexed)
export const CITY_POSITIONS: { row: number; col: number; name: string }[] = [
  { row: 8, col: 7, name: 'Central City' },
  { row: 10, col: 0, name: 'West City' },
  { row: 14, col: 12, name: 'South City' },
];

export const MAP_SIZE = 16;

// Boss names by region (for random assignment)
export const BOSS_NAMES = ['Brigandine', 'Orc Warchief', 'Bear', 'Wyvern', 'Warlock'];

// Miniboss = strongest enemy of the terrain's spawn pool
export const MINIBOSS_MAP: Record<string, string> = {
  'Grass': 'Orc',
  'Road': 'Orc Shaman',
  'Forest': 'Wolf',
  'Mountain': 'Golem',
  'Sand': 'Wolf',
  'Mud': 'Wolf',
  'Ice': 'Wolf',
  'Castle': 'Vampire',
  'Cavern': 'Sorcerer',
};
