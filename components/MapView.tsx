// MapView — 16×16 grid world map. Player moves between adjacent cells,
// triggering combat when enemies spawn. Cities are safe zones.

import React, { useState, useEffect, useRef } from 'react';
import { Character, Enemy, Attribute } from '../types';
import { calculateTotalStats } from '../services/engine';
import { generateEnemy } from '../services/engine';
import {
    MAP_TERRAIN, MAP_SPAWN, TERRAIN_CONFIGS, MAP_SIZE,
    PLAYER_START, CITY_POSITIONS, BOSS_NAMES, MINIBOSS_MAP,
    TerrainType, CellSpawnType
} from '../game/mapData';
import { MapState, MapCellState, createInitialMapState } from '../game/mapState';
import { getHp } from '../constants';
import { User, Heart, Map as MapIcon, LogOut, ChevronLeft, ArrowRight, Sword as SwordIcon } from 'lucide-react';

interface Props {
    character: Character;
    combatResult?: 'win' | 'flee' | 'enemyFled' | null;
    prevPos?: { row: number; col: number } | null;
    onClearCombatResult: () => void;
    onEnterCombat: (enemy: Enemy, prevPos: { row: number; col: number }) => void;
    onEnterTown: () => void;
    onLogout: () => void;
    onUpdateCharacter: (c: Character) => void;
}

const TERRAIN_COLORS: Record<TerrainType, string> = {
    City: '#ec4899',
    Road: '#f97316',
    Grass: '#86efac',
    Forest: '#166534',
    Mountain: '#facc15',
    Sand: '#fde68a',
    Mud: '#78350f',
    Ice: '#7dd3fc',
    Castle: '#a855f7',
    Cavern: '#374151',
    Water: '#3b82f6',
    Rock: '#6b7280',
    Lava: '#ef4444',
};

const TERRAIN_LABELS: Record<TerrainType, string> = {
    City: 'City', Road: 'Road', Grass: 'Grass', Forest: 'Forest',
    Mountain: 'Mountain', Sand: 'Sand', Mud: 'Mud', Ice: 'Ice',
    Castle: 'Castle', Cavern: 'Cavern', Water: 'Water', Rock: 'Rock', Lava: 'Lava',
};

const loadMapState = (): MapState => {
    try {
        const saved = localStorage.getItem('rot_map_state');
        if (saved) return JSON.parse(saved);
    } catch (e) { /* ignore */ }
    return createInitialMapState(PLAYER_START.row, PLAYER_START.col);
};

const saveMapState = (state: MapState) => {
    try {
        localStorage.setItem('rot_map_state', JSON.stringify(state));
    } catch (e) { /* ignore */ }
};

const MapView: React.FC<Props> = ({
    character, combatResult, prevPos, onClearCombatResult,
    onEnterCombat, onEnterTown, onLogout, onUpdateCharacter,
}) => {
    const [mapState, setMapState] = useState<MapState>(loadMapState);
    const [playerPos, setPlayerPos] = useState({
        row: character.mapRow ?? PLAYER_START.row,
        col: character.mapCol ?? PLAYER_START.col,
    });
    const [message, setMessage] = useState<string>('');
    const [showRetreatOption, setShowRetreatOption] = useState(false);
    const processedResult = useRef(false);

    // Save map state on change
    useEffect(() => {
        saveMapState(mapState);
    }, [mapState]);

    // Handle combat result on mount or when combatResult changes
    useEffect(() => {
        if (!combatResult || processedResult.current) return;
        processedResult.current = true;

        if (combatResult === 'flee' && prevPos) {
            // Player fled — revert to previous position
            setPlayerPos(prevPos);
            onUpdateCharacter({ ...character, mapRow: prevPos.row, mapCol: prevPos.col });
            setMessage('You retreated to the previous area.');
        } else if (combatResult === 'win' || combatResult === 'enemyFled') {
            // Player won or enemy escaped — clear the cell
            const terrain = MAP_TERRAIN[playerPos.row][playerPos.col];
            const cooldown = TERRAIN_CONFIGS[terrain].cooldownTurns;
            const newMapState = { ...mapState };
            newMapState.cells[playerPos.row][playerPos.col].clearedTurnsRemaining = cooldown;
            // Also mark boss as defeated if it was a boss/miniboss cell
            const spawn = MAP_SPAWN[playerPos.row][playerPos.col];
            if (spawn.type === 'boss' || spawn.type === 'miniboss') {
                newMapState.cells[playerPos.row][playerPos.col].bossDefeated = true;
                newMapState.cells[playerPos.row][playerPos.col].clearedTurnsRemaining = 30; // 30 turn cooldown for bosses
            }
            setMapState(newMapState);
            setMessage(combatResult === 'win' ? 'Victory! Area cleared.' : 'The enemy escaped. Area cleared.');
        }

        // Recover 1 Bravery on victory
        if (combatResult === 'win' || combatResult === 'enemyFled') {
            const maxBravery = 1 + Math.floor(character.level / 10);
            const newChar = { ...character };
            newChar.bravery = Math.min(maxBravery, (character.bravery || 1) + 1);
            onUpdateCharacter(newChar);
        }

        onClearCombatResult();
    }, [combatResult]);

    const canMoveTo = (row: number, col: number): boolean => {
        if (row < 0 || row >= MAP_SIZE || col < 0 || col >= MAP_SIZE) return false;
        const dr = Math.abs(row - playerPos.row);
        const dc = Math.abs(col - playerPos.col);
        if (dr + dc !== 1) return false;
        const terrain = MAP_TERRAIN[row]?.[col];
        if (!terrain) return false;
        return TERRAIN_CONFIGS[terrain].accessible;
    };

    const handleMove = (row: number, col: number) => {
        if (!canMoveTo(row, col)) return;
        setMessage('');

        // Save previous position (for flee handling)
        const prev = { row: playerPos.row, col: playerPos.col };

        // Mark cell as visited and decrement all cooldowns
        const newMapState: MapState = {
            ...mapState,
            cells: mapState.cells.map(r => r.map(c => ({ ...c }))),
        };
        newMapState.cells[row][col].visited = true;
        for (let r = 0; r < MAP_SIZE; r++) {
            for (let c = 0; c < MAP_SIZE; c++) {
                if (newMapState.cells[r][c].clearedTurnsRemaining > 0) {
                    newMapState.cells[r][c].clearedTurnsRemaining--;
                }
            }
        }

        // Move player
        setPlayerPos({ row, col });
        onUpdateCharacter({ ...character, mapRow: row, mapCol: col });
        setMapState(newMapState);

        // Check spawn
        const spawnType = MAP_SPAWN[row][col];
        const terrain = MAP_TERRAIN[row][col];
        const terrainConfig = TERRAIN_CONFIGS[terrain];
        const cellState = newMapState.cells[row][col];

        let shouldSpawn = false;
        let enemyName: string | undefined;
        let enemyLevel = 1;

        if (cellState.clearedTurnsRemaining > 0) {
            shouldSpawn = false;
        } else if (spawnType.type === 'none') {
            shouldSpawn = false;
        } else if (spawnType.type === 'boss') {
            if (!cellState.bossDefeated) {
                shouldSpawn = true;
                enemyName = BOSS_NAMES[Math.floor(Math.random() * BOSS_NAMES.length)];
                // Boss level: use the level range from adjacent cells or default to 30
                enemyLevel = 30;
            }
        } else if (spawnType.type === 'miniboss') {
            if (!cellState.bossDefeated) {
                shouldSpawn = Math.random() < 0.8;
                enemyName = MINIBOSS_MAP[terrain] || 'Orc';
                enemyLevel = spawnType.level;
            }
        } else if (spawnType.type === 'normal') {
            shouldSpawn = Math.random() < terrainConfig.spawnChance;
            if (shouldSpawn) {
                const pool = terrainConfig.spawnPool;
                const [minLvl, maxLvl] = spawnType.levelRange;
                // Select enemy from pool based on level (higher level = harder enemy)
                const levelFraction = (maxLvl - 1) / 35;
                const poolIndex = Math.min(pool.length - 1, Math.floor(levelFraction * pool.length));
                enemyName = pool[poolIndex];
                enemyLevel = minLvl + Math.floor(Math.random() * (maxLvl - minLvl + 1));
            }
        }

        if (shouldSpawn && enemyName) {
            const stats = calculateTotalStats(character);
            const enemy = generateEnemy(enemyLevel, character.level, stats[Attribute.LUCK], enemyName);
            // If player has Bravery, offer retreat option instead of forcing combat
            if (bravery > 0) {
                setMessage(`A ${enemy.name} appeared! Use Bravery to retreat?`);
                // Store enemy and prev pos for the retreat/engage decision
                (window as any).__pendingEnemy = enemy;
                (window as any).__pendingPrev = prev;
                setShowRetreatOption(true);
            } else {
                onEnterCombat(enemy, prev);
            }
        } else {
            const label = TERRAIN_LABELS[terrain];
            setMessage(`You entered ${label}. No enemies in sight.`);
        }
    };

    // Keyboard movement
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.code === 'ArrowUp' || e.code === 'KeyW') handleMove(playerPos.row - 1, playerPos.col);
            else if (e.code === 'ArrowDown' || e.code === 'KeyS') handleMove(playerPos.row + 1, playerPos.col);
            else if (e.code === 'ArrowLeft' || e.code === 'KeyA') handleMove(playerPos.row, playerPos.col - 1);
            else if (e.code === 'ArrowRight' || e.code === 'KeyD') handleMove(playerPos.row, playerPos.col + 1);
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [playerPos, mapState, character]);

    const currentTerrain = MAP_TERRAIN[playerPos.row]?.[playerPos.col];
    const isInCity = currentTerrain === 'City';
    const cityName = CITY_POSITIONS.find(c => c.row === playerPos.row && c.col === playerPos.col)?.name || 'City';

    const maxBravery = 1 + Math.floor(character.level / 10);
    const bravery = character.bravery ?? 1;

    // Find adjacent accessible cells for display
    const adjacentCells = [
        { row: playerPos.row - 1, col: playerPos.col, dir: 'N' },
        { row: playerPos.row + 1, col: playerPos.col, dir: 'S' },
        { row: playerPos.row, col: playerPos.col - 1, dir: 'W' },
        { row: playerPos.row, col: playerPos.col + 1, dir: 'E' },
    ].filter(c => canMoveTo(c.row, c.col));

    return (
        <div className="fixed inset-0 bg-medieval-900 text-medieval-100 flex flex-col overflow-hidden">
            {/* Header */}
            <header className="bg-medieval-800 border-b-2 border-medieval-600 p-2 sm:p-3 flex justify-between items-center shrink-0 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-medieval-600 rounded-full flex items-center justify-center border-2 border-medieval-400 shrink-0">
                        <User size={16} className="sm:hidden" />
                        <User size={20} className="hidden sm:block" />
                    </div>
                    <div className="min-w-0">
                        <span className="font-bold text-sm sm:text-base truncate block">{character.name}</span>
                        <span className="text-xs text-medieval-400">Lvl {character.level} {character.classType}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                    <div className="text-right">
                        <div className="text-[10px] sm:text-xs text-medieval-400 flex items-center gap-1 justify-end">
                            <Heart size={10} className="text-red-500" fill="currentColor"/>
                            HP
                        </div>
                        <div className="font-bold text-xs sm:text-sm">{Math.floor(character.currentHp || 0)}/{getHp(calculateTotalStats(character)[Attribute.HT])}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] sm:text-xs text-medieval-400">Gold</div>
                        <div className="font-bold text-xs sm:text-sm text-yellow-500">{character.gold}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] sm:text-xs text-medieval-400">Bravery</div>
                        <div className="font-bold text-xs sm:text-sm text-cyan-400">{bravery}/{maxBravery}</div>
                    </div>
                </div>
            </header>

            {/* Map grid */}
            <div className="flex-1 overflow-auto flex items-start justify-center p-2">
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${MAP_SIZE}, clamp(18px, 4.5vmin, 36px))`,
                        gap: '1px',
                    }}
                >
                    {Array.from({ length: MAP_SIZE }).map((_, r) =>
                        Array.from({ length: MAP_SIZE }).map((_, c) => {
                            const terrain = MAP_TERRAIN[r][c];
                            const spawn = MAP_SPAWN[r][c];
                            const cellState = mapState.cells[r][c];
                            const isPlayer = playerPos.row === r && playerPos.col === c;
                            const isAdjacent = canMoveTo(r, c);
                            const isAccessible = TERRAIN_CONFIGS[terrain].accessible;
                            const isCleared = cellState.clearedTurnsRemaining > 0;
                            const isCity = terrain === 'City';

                            let bgColor = '#000';
                            if (cellState.visited) {
                                bgColor = isCleared && !isCity ? '#1a1008' : TERRAIN_COLORS[terrain];
                                if (!isAccessible) bgColor = TERRAIN_COLORS[terrain];
                            }

                            let content = '';
                            if (isPlayer) content = '●';
                            else if (cellState.visited && isCity) content = '🏰';
                            else if (cellState.visited && spawn.type === 'boss' && !cellState.bossDefeated) content = '💀';
                            else if (cellState.visited && spawn.type === 'miniboss' && !cellState.bossDefeated) content = '⚠';

                            return (
                                <div
                                    key={`${r}-${c}`}
                                    onClick={() => isAdjacent && handleMove(r, c)}
                                    style={{
                                        backgroundColor: bgColor,
                                        width: 'clamp(18px, 4.5vmin, 36px)',
                                        height: 'clamp(18px, 4.5vmin, 36px)',
                                        border: isPlayer
                                            ? '2px solid #ffffff'
                                            : isAdjacent
                                                ? '1px solid #facc15'
                                                : '1px solid #1a1008',
                                        cursor: isAdjacent ? 'pointer' : 'default',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 'clamp(8px, 1.8vmin, 12px)',
                                        opacity: isAdjacent ? 1 : (cellState.visited ? 0.9 : 0.5),
                                        transition: 'border-color 0.15s',
                                    }}
                                    title={cellState.visited ? TERRAIN_LABELS[terrain] : 'Unknown'}
                                >
                                    {content}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Bottom panel */}
            <div className="bg-medieval-800 border-t-2 border-medieval-600 p-2 sm:p-3 shrink-0">
                {message && (
                    <div className="text-center text-sm text-medieval-300 mb-2 italic">{message}</div>
                )}
                {showRetreatOption ? (
                    <div className="flex justify-center gap-3 py-2">
                        <button
                            onClick={() => {
                                // Engage combat
                                const enemy = (window as any).__pendingEnemy;
                                const prev = (window as any).__pendingPrev;
                                (window as any).__pendingEnemy = null;
                                (window as any).__pendingPrev = null;
                                setShowRetreatOption(false);
                                onEnterCombat(enemy, prev);
                            }}
                            className="px-4 py-2 bg-red-800 hover:bg-red-700 border border-red-500 text-white font-bold rounded flex items-center gap-1.5 text-sm"
                        >
                            <SwordIcon size={16} /> Fight
                        </button>
                        <button
                            onClick={() => {
                                // Retreat: spend 1 Bravery, revert to previous position
                                const prev = (window as any).__pendingPrev;
                                (window as any).__pendingEnemy = null;
                                (window as any).__pendingPrev = null;
                                const newChar = { ...character, bravery: bravery - 1 };
                                onUpdateCharacter(newChar);
                                setPlayerPos(prev);
                                setShowRetreatOption(false);
                                setMessage('You used 1 Bravery to retreat safely.');
                            }}
                            className="px-4 py-2 bg-cyan-800 hover:bg-cyan-700 border border-cyan-500 text-white font-bold rounded flex items-center gap-1.5 text-sm"
                        >
                            <ChevronLeft size={16} /> Retreat (-1 Bravery)
                        </button>
                    </div>
                ) : (
                    <div className="flex justify-between items-center gap-2">
                        <div className="text-xs sm:text-sm text-medieval-400">
                            <span className="text-medieval-200 font-bold">
                                {isInCity ? cityName : TERRAIN_LABELS[currentTerrain]}
                            </span>
                            {!isInCity && adjacentCells.length > 0 && (
                                <span className="ml-2 text-medieval-500">
                                    Tap highlighted cells to move
                                </span>
                            )}
                        </div>
                        <div className="flex gap-2">
                            {isInCity && (
                                <button
                                    onClick={onEnterTown}
                                    className="px-3 py-2 bg-emerald-800 hover:bg-emerald-700 border border-emerald-500 text-white font-bold rounded flex items-center gap-1.5 text-sm"
                                >
                                    <MapIcon size={16} /> Enter Town
                                </button>
                            )}
                            <button
                                onClick={onLogout}
                                className="px-3 py-2 bg-red-900/50 hover:bg-red-900 rounded border border-red-800 text-sm"
                            >
                                <LogOut size={16} className="sm:hidden" />
                                <span className="hidden sm:inline">Log Out</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MapView;
