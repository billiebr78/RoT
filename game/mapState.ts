// Map state types — tracks which cells are cleared, visited, and their cooldowns.

export interface MapCellState {
  visited: boolean;           // Has the player ever entered this cell?
  clearedTurnsRemaining: number; // Turns until enemies can spawn again (0 = can spawn)
  bossDefeated: boolean;      // For boss/miniboss cells: is the boss dead (on cooldown)?
}

export interface MapState {
  cells: MapCellState[][];    // 16x16 grid of cell states
  playerRow: number;          // Current player position (0-indexed)
  playerCol: number;
  currentCityRow: number;     // Last city visited (where player returns on death/flee)
  currentCityCol: number;
}

// Create a fresh map state with all cells unvisited
export const createInitialMapState = (startRow: number, startCol: number): MapState => {
  const cells: MapCellState[][] = [];
  for (let r = 0; r < 16; r++) {
    const row: MapCellState[] = [];
    for (let c = 0; c < 16; c++) {
      row.push({
        visited: false,
        clearedTurnsRemaining: 0,
        bossDefeated: false,
      });
    }
    cells.push(row);
  }
  // Mark starting city as visited
  cells[startRow][startCol].visited = true;
  return {
    cells,
    playerRow: startRow,
    playerCol: startCol,
    currentCityRow: startRow,
    currentCityCol: startCol,
  };
};
