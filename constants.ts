
import { Attribute, ClassType, Item, ItemSlot, SpriteFrame, WeaponType, OffHandType } from './types';

// === DATA-DRIVEN IMPORTS ===
// Game data (enemies, abilities, items, archetypes) is now loaded from
// JSON files via dataLoader.ts. Only formulas, sprites, and starting
// items remain in this file.
export {
  ENEMIES_DB, ENEMY_ABILITIES_DB, ARCHETYPE_BEHAVIORS, BOSS_FLEE_THRESHOLD,
  ABILITY_DB, ITEM_PREFIXES, ITEM_SUFFIXES, MYTHIC_PREFIXES, MYTHIC_SUFFIXES,
  OFFHAND_DB, WEAPON_TEMPLATES, POTION_DB, SCROLL_DB,
  ArchetypeBehavior,
} from './services/dataLoader';
import { ENEMY_ABILITIES_DB } from './services/dataLoader';

export const BASE_ATTRIBUTE_VALUE = 3;
export const BONUS_ATTRIBUTE_VALUE = 2;
export const POTION_COOLDOWN = 10000; // 10 Seconds Global Cooldown

export const CLASS_BONUS: Record<ClassType, Attribute> = {
  [ClassType.WARRIOR]: Attribute.ST,
  [ClassType.MAGE]: Attribute.INT,
  [ClassType.ROGUE]: Attribute.DX,
};

// Calculate derived stats
export const getHp = (ht: number) => ht * 15;

/**
 * XP required to advance FROM the given level TO the next level.
 * Single source of truth — used by both Hub (progress bar display) and
 * GameLoop (actual level-up logic). Previously these two had drifted
 * (Hub used 25 * lvl^2.1, GameLoop used 20 * lvl^2.5) which caused the
 * progress bar to desync from actual level-ups.
 */
export const getExpForLevel = (level: number): number => Math.floor(30 * Math.pow(level, 2.2));
export const getCritChance = (dx: number) => Math.min(50, dx * 0.5); // Cap at 50%
export const getEvasion = (dx: number) => Math.min(40, dx * 0.4); // Cap at 40%
/**
 * Cooldown reduction from Dexterity, applied to ability cooldowns.
 * Cap at 50% (reached at ~30 DX). Cast time uses a SEPARATE, smaller
 * reduction (DX * 0.01, capped at 50%) because cast times are short
 * and we don't want high-DX builds to bypass cast-time counterplay
 * entirely — see handleAbilityUse in GameLoop.tsx.
 */
export const getCooldownReduction = (dx: number) => Math.min(0.5, dx * 0.017);

// Item Generation Data — now loaded from data/items.json via dataLoader
// (ITEM_PREFIXES, ITEM_SUFFIXES, MYTHIC_PREFIXES, MYTHIC_SUFFIXES,
//  OFFHAND_DB, WEAPON_TEMPLATES, POTION_DB, SCROLL_DB re-exported above)

// Mock Data
export const STARTING_ITEMS: Record<ClassType, Item[]> = {
  [ClassType.WARRIOR]: [
    { id: 'w_start_sword', name: 'Rusty Sword', slot: ItemSlot.MAIN_HAND, rarity: 'common', damage: 5, value: 10, stats: {}, weaponType: WeaponType.SLASH },
    { id: 'w_start_chest', name: 'Worn Tunic', slot: ItemSlot.CHEST, rarity: 'common', armor: 2, value: 5, stats: {} }
  ],
  [ClassType.MAGE]: [
    { id: 'm_start_wand', name: 'Old Stick', slot: ItemSlot.MAIN_HAND, rarity: 'common', damage: 3, stats: { [Attribute.INT]: 1 }, value: 10, weaponType: WeaponType.MAGIC },
    { id: 'm_start_robe', name: 'Tattered Robe', slot: ItemSlot.CHEST, rarity: 'common', armor: 1, value: 5, stats: {} }
  ],
  [ClassType.ROGUE]: [
    { id: 'r_start_dagger', name: 'Chipped Dagger', slot: ItemSlot.MAIN_HAND, rarity: 'common', damage: 4, value: 10, stats: { [Attribute.DX]: 1 }, weaponType: WeaponType.SLASH },
    { id: 'r_start_boots', name: 'Leather Boots', slot: ItemSlot.LEGS, rarity: 'common', armor: 1, value: 5, stats: {} }
  ]
};

// Consumable Database — now loaded from data/items.json via dataLoader

// Ability DB, Enemy Abilities DB, Archetype Behaviors, Enemies DB
// are all loaded from JSON via dataLoader.ts and re-exported above.


// --- PIXEL ART ASSETS ---
// 12x12 Grids. Chars mapped to Palette colors.
const PALETTES: Record<string, string> = {
    // Shared
    _: 'transparent',
    K: '#000000', // Black Outline
    W: '#ffffff', // White
    S: '#fca5a5', // Skin (Light Red/Pink)
    G: '#9ca3af', // Grey (Iron)
    D: '#4b5563', // Dark Grey
    B: '#60a5fa', // Blue
    R: '#ef4444', // Red
    Y: '#facc15', // Yellow
    N: '#78350f', // Brown
    V: '#16a34a', // Green
    P: '#8b5cf6', // Purple
};

// Palette variants for visual variety. Each variant overrides specific
// color keys from the base PALETTES. Pass one of these (or a custom
// partial palette) as the `paletteOverride` parameter to drawSprite()
// in render/canvas.ts to recolor any sprite without changing its
// pixel definition.
//
// Example: a "Fire Goblin" would use the goblin sprite with PALETTE_VARIANTS.fire,
// swapping green -> red-orange. A "Frost Skeleton" would use the skeleton
// sprite with PALETTE_VARIANTS.ice, swapping white -> cyan.
//
// To use: drawSprite(ctx, 'goblin', ..., { paletteOverride: PALETTE_VARIANTS.fire })
export const PALETTE_VARIANTS: Record<string, Partial<Record<string, string>>> = {
    // Fire: warm reds and oranges. Swaps green -> red, blue -> orange.
    fire: {
        V: '#dc2626', // green -> red
        B: '#f97316', // blue -> orange
        G: '#92400e', // grey -> dark bronze
    },
    // Ice: cold blues and cyans. Swaps red -> cyan, green -> teal.
    ice: {
        R: '#06b6d4', // red -> cyan
        V: '#0e7490', // green -> teal
        B: '#e0f2fe', // blue -> pale ice
        Y: '#7dd3fc', // yellow -> light cyan
    },
    // Poison: sickly greens and yellows. Swaps red -> green, blue -> yellow.
    poison: {
        R: '#65a30d', // red -> poison green
        B: '#a3e635', // blue -> sickly yellow-green
        P: '#16a34a', // purple -> green
        V: '#84cc16', // green -> lime
    },
    // Shadow: desaturated darks. Swaps most colors toward grey/black.
    // Useful for stealth enemies or corrupted variants.
    shadow: {
        V: '#374151', // green -> dark grey
        B: '#374151', // blue -> dark grey
        R: '#7f1d1d', // red -> dark red
        Y: '#a16207', // yellow -> dark amber
        P: '#581c87', // purple -> dark violet
        G: '#4b5563', // grey -> darker grey
        S: '#6b7280', // skin -> grey
    },
    // Golden: treasure/boss-gold variant. Swaps greys -> gold.
    golden: {
        G: '#facc15', // grey -> gold
        D: '#a16207', // dark grey -> dark gold
        K: '#78350f', // black -> dark brown
    },
};

// SPRITE SHEET STANDARD:
// Row 0: Idle
// Row 1: Move (Walk Cycle)
// Row 2: Attack (Windup -> Strike -> Recovery)
// Row 3: Special (Block, Cast, Dodge)

export const SPRITE_LIBRARY: Record<string, SpriteFrame> = {
    // --- HEROES ---
    [ClassType.WARRIOR]: {
        palette: PALETTES,
        rows: [
            // Row 0: Idle
            '____KKKK____' + '____KKKK____' + '____KKKK____',
            '___KGGGGK___' + '___KGGGGK___' + '___KGGGGK___',
            '__KGKGGKGK__' + '__KGKGGKGK__' + '__KGKGGKGK__',
            '__KGGGGGGK__' + '__KGGGGGGK__' + '__KGGGGGGK__',
            '__KSSSSSSK__' + '__KSSSSSSK__' + '__KSSSSSSK__',
            '__KSSSSSSK__' + '__KSSSSSSK__' + '__KSSSSSSK__',
            '___KGGGGK___' + '___KGGGGK___' + '___KGGGGK___',
            '__KGKRRKGK__' + '__KGKRRKGK__' + '__KGKRRKGK__',
            '_KGKRRRRKGK_' + '_KGKRRRRKGK_' + '_KGKRRRRKGK_',
            '_KGKRRRRKGK_' + '_KGKRRRRKGK_' + '_KGKRRRRKGK_',
            '_KKKRRRRKKK_' + '_KKKRRRRKKK_' + '_KKKRRRRKKK_',
            '__KNRRRNK___' + '__KNRRRNK___' + '__KNRRRNK___',
            '__KGGGGGK___' + '__KGGGGGK___' + '__KGGGGGK___',
            '__KGGKGGK___' + '__KGGKGGK___' + '__KGGKGGK___',
            '__KGGKGGK___' + '__KGGKGGK___' + '__KGGKGGK___',
            '__KKK_KKK___' + '__KKK_KKK___' + '__KKK_KKK___',
            
            // Row 1: Walk
            '____KKKK____' + '____KKKK____' + '____KKKK____',
            '___KGGGGK___' + '___KGGGGK___' + '___KGGGGK___',
            '__KGKGGKGK__' + '__KGKGGKGK__' + '__KGKGGKGK__',
            '__KGGGGGGK__' + '__KGGGGGGK__' + '__KGGGGGGK__',
            '__KSSSSSSK__' + '__KSSSSSSK__' + '__KSSSSSSK__',
            '__KSSSSSSK__' + '__KSSSSSSK__' + '__KSSSSSSK__',
            '___KGGGGK___' + '___KGGGGK___' + '___KGGGGK___',
            '__KGKRRKGK__' + '__KGKRRKGK__' + '__KGKRRKGK__',
            '_KGKRRRRKGK_' + '_KGKRRRRKGK_' + '_KGKRRRRKGK_',
            '_KGKRRRRKGK_' + '_KGKRRRRKGK_' + '_KGKRRRRKGK_',
            '_KKKRRRRKKK_' + '_KKKRRRRKKK_' + '_KKKRRRRKKK_',
            '__KNRRRNK___' + '__KNRRRNK___' + '__KNRRRNK___',
            '__KGGGGGK___' + '__KGGGGGK___' + '__KGGGGGK___',
            '__KGG__KK___' + '____KGGK____' + '___KK_KGG___',
            '__KGG__KK___' + '____KGGK____' + '___KK_KGG___',
            '__KKK__KK___' + '____KKK_____' + '___KK_KKK___',

            // Row 2: Attack (Windup, Strike, Recover) - With Sword
            '____KKKK____' + '____KKKK____' + '____KKKK____',
            '___KGGGGK_G_' + '___KGGGGK___' + '___KGGGGK___',
            '__KGKGGKGKG_' + '__KGKGGKGK__' + '__KGKGGKGK__',
            '__KGGGGGGKG_' + '__KGGGGGGK__' + '__KGGGGGGK__',
            '__KSSSSSSK__' + '__KSSSSSSK__' + '__KSSSSSSK__',
            '__KSSSSSSK__' + '__KSSSSSSK__' + '__KSSSSSSK__',
            '___KGGGGK___' + '___KGGGGK___' + '___KGGGGK___',
            '___GKRRKGK__' + '__KGKRRKGK__' + '__KGKRRKGK__',
            '__G_KRRRRKGK' + '_KGKRRRRKGK_' + '_KGKRRRRKGK_',
            '__G_KRRRRKGK' + '_KGKRRRRKGK_' + '_KGKRRRRKGK_',
            '_G__RRRRKKK_' + '_KKKRRRRKKK_' + '_KKKRRRRKKK_',
            'G_KNRRRNK___' + '__KNRRRNK___' + '__KNRRRNK___',
            '__KGGGGGK__G' + '__KGGGGGK___' + '__KGGGGGK___',
            '__KGGKGGK_G_' + '___KGGGGGG__' + '__KGGKGGK___', // Extended Sword
            '__KGGKGGK___' + '___KGGGGGG__' + '__KGGKGGK___',
            '__KKK_KKK___' + '___KKK______' + '__KKK_KKK___',

            // Row 3: Block
            '____KKKK____' + '____KKKK____' + '____KKKK____',
            '___KGGGGK___' + '___KGGGGK___' + '___KGGGGK___',
            '__KGKGGKGK__' + '__KGKGGKGK__' + '__KGKGGKGK__',
            '__KGGGGGGK__' + '__KGGGGGGK__' + '__KGGGGGGK__',
            '__KSSSSSSK__' + '__KSSSSSSK__' + '__KSSSSSSK__',
            '__KSSSSSSK__' + '__KSSSSSSK__' + '__KSSSSSSK__',
            '___KGGGGK___' + '___KGGGGK___' + '___KGGGGK___',
            '__KGKRRKGK__' + '__KGKRRKGK__' + '__KGKRRKGK__',
            '_KGKRRRRKGK_' + '_KGKRRRRKGK_' + '_KGKRRRRKGK_',
            '_KGGGGGGGKK_' + '_KGGGGGGGKK_' + '_KGGGGGGGKK_', // Shield Up
            '_KGGGGGGGKK_' + '_KGGGGGGGKK_' + '_KGGGGGGGKK_',
            '_KGGGGGGGK__' + '_KGGGGGGGK__' + '_KGGGGGGGK__',
            '__KGGGGGK___' + '__KGGGGGK___' + '__KGGGGGK___',
            '__KGGKGGK___' + '__KGGKGGK___' + '__KGGKGGK___',
            '__KGGKGGK___' + '__KGGKGGK___' + '__KGGKGGK___',
            '__KKK_KKK___' + '__KKK_KKK___' + '__KKK_KKK___',
        ]
    },
    [ClassType.MAGE]: {
        palette: PALETTES,
        rows: [
            // Row 0: Idle
            '____KKKK____' + '____KKKK____' + '____KKKK____',
            '___KBBBBK___' + '___KBBBBK___' + '___KBBBBK___',
            '__KBBBBBBK__' + '__KBBBBBBK__' + '__KBBBBBBK__',
            '__KBSBBBSK__' + '__KBSBBBSK__' + '__KBSBBBSK__', 
            '__KSSSSSSK__' + '__KSSSSSSK__' + '__KSSSSSSK__',
            '__KSSSSSSK__' + '__KSSSSSSK__' + '__KSSSSSSK__',
            '___KSSSSK___' + '___KSSSSK___' + '___KSSSSK___',
            '__KBBBBBBK__' + '__KBBBBBBK__' + '__KBBBBBBK__',
            '_KBBBBBBBBK_' + '_KBBBBBBBBK_' + '_KBBBBBBBBK_',
            '_KBBBBBBBBK_' + '_KBBBBBBBBK_' + '_KBBBBBBBBK_',
            '_KBBBYYBBBK_' + '_KBBBYYBBBK_' + '_KBBBYYBBBK_',
            '_KBBBYYBBBK_' + '_KBBBYYBBBK_' + '_KBBBYYBBBK_',
            '_KBBBBBBBBK_' + '_KBBBBBBBBK_' + '_KBBBBBBBBK_',
            '_KBBBKBBBK__' + '_KBBBKBBBK__' + '_KBBBKBBBK__',
            '_KBBBKBBBK__' + '_KBBBKBBBK__' + '_KBBBKBBBK__',
            '_KKKK_KKKK__' + '_KKKK_KKKK__' + '_KKKK_KKKK__',
            
             // Row 1: Walk
            '____KKKK____' + '____KKKK____' + '____KKKK____',
            '___KBBBBK___' + '___KBBBBK___' + '___KBBBBK___',
            '__KBBBBBBK__' + '__KBBBBBBK__' + '__KBBBBBBK__',
            '__KBSBBBSK__' + '__KBSBBBSK__' + '__KBSBBBSK__', 
            '__KSSSSSSK__' + '__KSSSSSSK__' + '__KSSSSSSK__',
            '__KSSSSSSK__' + '__KSSSSSSK__' + '__KSSSSSSK__',
            '___KSSSSK___' + '___KSSSSK___' + '___KSSSSK___',
            '__KBBBBBBK__' + '__KBBBBBBK__' + '__KBBBBBBK__',
            '_KBBBBBBBBK_' + '_KBBBBBBBBK_' + '_KBBBBBBBBK_',
            '_KBBBBBBBBK_' + '_KBBBBBBBBK_' + '_KBBBBBBBBK_',
            '_KBBBYYBBBK_' + '_KBBBYYBBBK_' + '_KBBBYYBBBK_',
            '_KBBBYYBBBK_' + '_KBBBYYBBBK_' + '_KBBBYYBBBK_',
            '_KBBBBBBBBK_' + '_KBBBBBBBBK_' + '_KBBBBBBBBK_',
            '_KBBB__KK___' + '____KBBB____' + '___KK_KBBB__',
            '_KBBB__KK___' + '____KBBB____' + '___KK_KBBB__',
            '_KKKK__KK___' + '____KKKK____' + '___KK_KKKK__',

            // Row 2: Attack (Staff Bash) - With Brown Staff
            '____KKKK____' + '____KKKK____' + '____KKKK____',
            '___KBBBBK___' + '___KBBBBK___' + '___KBBBBK___',
            '__KBBBBBBK__' + '__KBBBBBBK__' + '__KBBBBBBK__',
            '__KBSBBBSK__' + '__KBSBBBSK__' + '__KBSBBBSK__', 
            '__KSSSSSSK__' + '__KSSSSSSK__' + '__KSSSSSSK__',
            '__KSSSSSSK__' + '__KSSSSSSK__' + '__KSSSSSSK__',
            '___KSSSSK_N_' + '___KSSSSK_N_' + '___KSSSSK___',
            '__KBBBBBBKN_' + '__KBBBBBBKN_' + '__KBBBBBBK__' ,
            '_KBBBBBBBBKN' + '_KBBBBBBBBKN' + '_KBBBBBBBBK_',
            '_KBBBBBBBBKN' + '_KBBBBBBBBKN' + '_KBBBBBBBBK_',
            '_KBBBYYBBBK_' + '_KBBBYYBBBK_' + '_KBBBYYBBBK_',
            '_KBBBYYBBBK_' + '_KBBBYYBBBK_' + '_KBBBYYBBBK_',
            '_KBBBBBBBBK_' + '_KBBBBBBBBK_' + '_KBBBBBBBBK_',
            '_KBBBKBBBK__' + '__KBB_______' + '_KBBBKBBBK__',
            '_KBBBKBBBK__' + '__KBB_______' + '_KBBBKBBBK__',
            '_KKKK_KKKK__' + '__KKK_______' + '_KKKK_KKKK__',

             // Row 3: Cast - Staff Raised
            '____KKKK__YY' + '____KKKK____' + '____KKKK____',
            '___KBBBBK_NN' + '___KBBBBK___' + '___KBBBBK___',
            '__KBBBBBBKNN' + '__KBBBBBBK__' + '__KBBBBBBK__',
            '__KBSBBBSKN_' + '__KBSBBBSK__' + '__KBSBBBSK__', 
            '__KSSSSSSKN_' + '__KSSSSSSK__' + '__KSSSSSSK__',
            '__KSSSSSSK__' + '__KSSSSSSK__' + '__KSSSSSSK__',
            '___KSSSSK___' + '___KSSSSK___' + '___KSSSSK___',
            '__KBBBBBBK__' + '__KBBBBBBK__' + '__KBBBBBBK__',
            '_KBBBBBBBBK_' + '_KBBBBBBBBK_' + '_KBBBBBBBBK_',
            '_KBPPPPPPBK_' + '_KBBBBBBBBK_' + '_KBBBBBBBBK_', // Glowing Hands
            '_KBPYYYYPBK_' + '_KBBBYYBBBK_' + '_KBBBYYBBBK_',
            '_KBBYYYYBBK_' + '_KBBBYYBBBK_' + '_KBBBYYBBBK_',
            '_KBBBBBBBBK_' + '_KBBBBBBBBK_' + '_KBBBBBBBBK_',
            '_KBBBKBBBK__' + '_KBBBKBBBK__' + '_KBBBKBBBK__',
            '_KBBBKBBBK__' + '_KBBBKBBBK__' + '_KBBBKBBBK__',
            '_KKKK_KKKK__' + '_KKKK_KKKK__' + '_KKKK_KKKK__',
        ]
    },
    [ClassType.ROGUE]: {
        palette: PALETTES,
        rows: [
             // Row 0: Idle
            '____KKKK____' + '____KKKK____' + '____KKKK____',
            '___KNNNNK___' + '___KNNNNK___' + '___KNNNNK___', 
            '__KNNNNNNK__' + '__KNNNNNNK__' + '__KNNNNNNK__',
            '__KNSSSSNK__' + '__KNSSSSNK__' + '__KNSSSSNK__', 
            '__KNSSSSNK__' + '__KNSSSSNK__' + '__KNSSSSNK__',
            '__KNNNNNNK__' + '__KNNNNNNK__' + '__KNNNNNNK__',
            '___KNNNNK___' + '___KNNNNK___' + '___KNNNNK___',
            '__KDDDDDDK__' + '__KDDDDDDK__' + '__KDDDDDDK__', 
            '_KDKDDDDKDK_' + '_KDKDDDDKDK_' + '_KDKDDDDKDK_',
            '_KDKDDDDKDK_' + '_KDKDDDDKDK_' + '_KDKDDDDKDK_',
            '_KKKDDDDKKK_' + '_KKKDDDDKKK_' + '_KKKDDDDKKK_',
            '__KNDDDNK___' + '__KNDDDNK___' + '__KNDDDNK___',
            '__KDDKDDK___' + '__KDDKDDK___' + '__KDDKDDK___',
            '__KDDKDDK___' + '__KDDKDDK___' + '__KDDKDDK___',
            '__KDDKDDK___' + '__KDDKDDK___' + '__KDDKDDK___',
            '__KKK_KKK___' + '__KKK_KKK___' + '__KKK_KKK___',
            
             // Row 1: Walk
            '____KKKK____' + '____KKKK____' + '____KKKK____',
            '___KNNNNK___' + '___KNNNNK___' + '___KNNNNK___', 
            '__KNNNNNNK__' + '__KNNNNNNK__' + '__KNNNNNNK__',
            '__KNSSSSNK__' + '__KNSSSSNK__' + '__KNSSSSNK__', 
            '__KNSSSSNK__' + '__KNSSSSNK__' + '__KNSSSSNK__',
            '__KNNNNNNK__' + '__KNNNNNNK__' + '__KNNNNNNK__',
            '___KNNNNK___' + '___KNNNNK___' + '___KNNNNK___',
            '__KDDDDDDK__' + '__KDDDDDDK__' + '__KDDDDDDK__', 
            '_KDKDDDDKDK_' + '_KDKDDDDKDK_' + '_KDKDDDDKDK_',
            '_KDKDDDDKDK_' + '_KDKDDDDKDK_' + '_KDKDDDDKDK_',
            '_KKKDDDDKKK_' + '_KKKDDDDKKK_' + '_KKKDDDDKKK_',
            '__KNDDDNK___' + '__KNDDDNK___' + '__KNDDDNK___',
            '__KDDKDDK___' + '__KDDKDDK___' + '__KDDKDDK___',
            '__KDD__KK___' + '____KDDK____' + '___KK_KDD___',
            '__KDD__KK___' + '____KDDK____' + '___KK_KDD___',
            '__KKK__KK___' + '____KKK_____' + '___KK_KKK___',

             // Row 2: Attack (Dagger Thrust) - With Grey Dagger
            '____KKKK____' + '____KKKK____' + '____KKKK____',
            '___KNNNNK___' + '___KNNNNK___' + '___KNNNNK___', 
            '__KNNNNNNK__' + '__KNNNNNNK__' + '__KNNNNNNK__',
            '__KNSSSSNK__' + '__KNSSSSNK__' + '__KNSSSSNK__', 
            '__KNSSSSNK__' + '__KNSSSSNK__' + '__KNSSSSNK__',
            '__KNNNNNNK__' + '__KNNNNNNK__' + '__KNNNNNNK__',
            '___KNNNNK___' + '___KNNNNK___' + '___KNNNNK___',
            '__KDDDDDDK_G' + '__KDDDDDDK__' + '__KDDDDDDK__', 
            '_KDKDDDDKDKG' + '_KDKDDDDKDK_' + '_KDKDDDDKDK_',
            '_KDKDDDDKDKG' + '_KDKDDDDKDK_' + '_KDKDDDDKDK_',
            '_KKKDDDDKKK_' + '_KKKDDDDKKK_' + '_KKKDDDDKKK_',
            '__KNDDDNK___' + '__KNDDDNK___' + '__KNDDDNK___',
            '__KDDKDDK___' + '__KDDKDDK___' + '__KDDKDDK___',
            '__KDDKDDK___' + '____KDD_____' + '__KDDKDDK___',
            '__KDDKDDK___' + '____KDD_____' + '__KDDKDDK___',
            '__KKK_KKK___' + '____KKK_____' + '__KKK_KKK___',
            
             // Row 3: Dodge/Low
            '____________' + '____________' + '____________',
            '____________' + '____________' + '____________', 
            '____________' + '____________' + '____________',
            '____KKKK____' + '____KKKK____' + '____KKKK____', 
            '___KNNNNK___' + '___KNNNNK___' + '___KNNNNK___', 
            '__KNNNNNNK__' + '__KNNNNNNK__' + '__KNNNNNNK__',
            '__KNSSSSNK__' + '__KNSSSSNK__' + '__KNSSSSNK__',
            '__KNSSSSNK__' + '__KNSSSSNK__' + '__KNSSSSNK__', 
            '__KNNNNNNK__' + '__KNNNNNNK__' + '__KNNNNNNK__',
            '___KNNNNK___' + '___KNNNNK___' + '___KNNNNK___',
            '__KDDDDDDK__' + '__KDDDDDDK__' + '__KDDDDDDK__',
            '_KDKDDDDKDK_' + '_KDKDDDDKDK_' + '_KDKDDDDKDK_',
            '_KDKDDDDKDK_' + '_KDKDDDDKDK_' + '_KDKDDDDKDK_',
            '_KKKDDDDKKK_' + '_KKKDDDDKKK_' + '_KKKDDDDKKK_',
            '__KNDDDNK___' + '__KNDDDNK___' + '__KNDDDNK___',
            '__KKK_KKK___' + '__KKK_KKK___' + '__KKK_KKK___',
        ]
    },

    // --- ENEMIES (Single Row for now, to be expanded if needed) ---
    'goblin': {
        palette: PALETTES,
        rows: [
            '____KKKK____' + '____KKKK____' + '____KKKK____',
            '___KVVVVK___' + '___KVVVVK___' + '___KVVVVK___',
            '__KVKVVVKV__' + '__KVKVVVKV__' + '__KVKVVVKV__', // Ears
            '__KVVVVVVK__' + '__KVVVVVVK__' + '__KVVVVVVK__',
            '__KVYVVVYK__' + '__KVYVVVYK__' + '__KVYVVVYK__', // Eyes
            '__KVVVVVVK__' + '__KVVVVVVK__' + '__KVVVVVVK__',
            '___KVVVVK___' + '___KVVVVK___' + '___KVVVVK___',
            '__KNKVVKNK__' + '__KNKVVKNK__' + '__KNKVVKNK__',
            '_KNKNVVNKNK_' + '_KNKNVVNKNK_' + '_KNKNVVNKNK_',
            '_KNKNVVNKNK_' + '_KNKNVVNKNK_' + '_KNKNVVNKNK_',
            '__KNVVVVNK__' + '__KNVVVVNK__' + '__KNVVVVNK__',
            '___KNNNNK___' + '___KNNNNK___' + '___KNNNNK___', // Loincloth
            '___KVVKVVK__' + '___KVVKVVK__' + '___KVVKVVK__',
            '___KVVKVVK__' + '___KVVKVVK__' + '___KVVKVVK__',
            '___KKK_KKK__' + '___KKK_KKK__' + '___KKK_KKK__'
        ]
    },
    'skeleton': {
        palette: PALETTES,
        rows: [
            '____KKKK____',
            '___KWWWWK___',
            '__KWWWWWWK__',
            '__KWKWWKWK__', // Eyes
            '__KWWWWWWK__',
            '__KWWKKWWK__', // Teeth
            '___KKWWKK___',
            '__KKWWWWKK__', // Ribs
            '_K_KWWWWK_K_',
            '___KWWWWK___',
            '___KKWWKK___',
            '___KWWWWK___', // Pelvis
            '___KWKKWK___',
            '___KWKKWK___',
            '___KWKKWK___',
            '___KKK_KKK__'
        ]
    },
    'orc': {
        palette: PALETTES,
        rows: [
            '___KKKKKK___',
            '__KVVVVVVK__',
            '_KVVVVVVVVK_',
            '_KVVKVVKVVK_',
            '_KVVVVVVVVK_',
            '_KVVKKKKVVK_', // Tusk mouth
            '__KVVVVVVK__',
            '__KGGGGGGK__', // Armor
            '_KGGGGGGGGK_',
            '_KGGGGGGGGK_',
            '_KGGNKKNGGK_',
            '_KKKNKKNKKK_',
            '__KGGKKGGK__',
            '__KGGKKGGK__',
            '__KGGKKGGK__',
            '__KGGKKGGK__',
            '__KKK__KKK__'
        ]
    },
    'vampire': {
        palette: PALETTES,
        rows: [
            '____KKKK____',
            '___KKKKKK___', // Hair
            '__KSSSSSSK__',
            '__KSKSSKSK__', // Red Eyes?
            '__KSSSSSSK__',
            '__KSSKKSSK__', // Fangs
            '___KSSSSK___',
            '__KPKKKKPK__', // Cape
            '_KPKWKKKWKPK_',
            '_KPKWKKKWKPK_',
            '_KPKWWWWWKPK_',
            '_KPKKKKKKKPK_',
            '__KPPPPPPK__',
            '__KKK__KKK__',
            '__KKK__KKK__',
            '__KKK__KKK__'
        ]
    },
    'golem': {
        palette: PALETTES,
        rows: [
            '____KKKK____',
            '___KGGGGK___',
            '__KGGGGGGK__',
            '__KGYGGGYK__', // Glowing Eyes
            '__KGGGGGGK__',
            '___KGGGGK___',
            '__KKGGGGKK__', // Huge shoulders
            '_KGKGGGGKGK_',
            '_KGGGGGGGGK_',
            '_KGGGGGGGGK_',
            '_KKKGGGGKKK_',
            '__KGGKKGGK__',
            '__KGGKKGGK__',
            '__KGGKKGGK__',
            '__KGGKKGGK__',
            '__KKK__KKK__'
        ]
    },
    'sorcerer': {
        palette: PALETTES,
        rows: [
            '____KKKK____',
            '___KPPPPK___', // Hood
            '__KPPPPPPK__',
            '__KKYPPPYK__', // Glowing eyes under hood
            '__KKKKKKKK__', // Shadowed face
            '___KKKKKK___',
            '___KPPPPK___',
            '__KPPPPPPK__',
            '_KPPPPPPPPK_',
            '_KPPPPPPPPK_',
            '_KPPGPPGPPK_',
            '_KPPPPPPPPK_',
            '_KPPPPPPPPK_',
            '_KPPPKPPPK__',
            '_KPPPKPPPK__',
            '_KKKK_KKKK__'
        ]
    },
    'knight': { // Dark Knight - corrupted armored warrior
        palette: PALETTES,
        rows: [
            '___K____K___', // Horn tips
            '__KK____KK__', // Horn bases
            '_KDDDDDDDDK_', // Helmet top
            'KDDDDDDDDDDK', // Helmet upper
            'KDDKKRRKKDDK', // Visor slit with glowing red eyes
            'KDDDDDDDDDDK', // Helmet lower
            '_KKKKKKKKKK_', // Chin guard / neck
            'KRRDDDDDDRRK', // Shoulders + red cape edges
            'KRRDDDDDDRRK', // Cape flowing behind
            'KRDDDDDDDDRK', // Chest plate
            'KRDDDDDDDDRK', // Chest
            '_KRDDDDDDRK_', // Belt transition
            '__KDDDDDDK__', // Waist
            '__KDKKDKKD__', // Legs split, sword on right
            '__KDKKDKKW__', // Sword blade
            '__KKK_KKKW__'  // Feet + sword tip
        ]
    },
    'dragon': { // Wyvern
        palette: PALETTES,
        rows: [
            '_______KKK__',
            '______KVRK__',
            '_____KVRRK__',
            '____KVRRRK__',
            '___KVRRRRK__',
            '__KVRRRRRK__', // Head
            '_KVRRRYRRK__', // Eye
            '_KVRRRRRRK__',
            '_KVRRRRRK___',
            '__KKRRRRK___', // Neck
            '___KRRRRK___',
            '__KRRRRRRK__', // Body
            '_KRRRRRRRRK_',
            'KRRKRRRRKRRK', // Wings
            'KRRKRRRRKRRK',
            'KKK_KKKK_KKK'
        ]
    },
    // === NEW ENEMY SPRITES ===
    'rat': {
        palette: PALETTES,
        rows: [
            '____KKKK____',
            '___KSSSSK___',
            '__KSKSSKSK__', // Ears
            '__KSSSSSSK__',
            '__KSVVVVSK__', // Red eyes
            '__KSSSSSSK__',
            '___KSSSSK___',
            '__KSSSSSSK__',
            '_KSSSSSSSSK_',
            '_KSSSSSSSSK_', // Body
            '__KSSKSSK___', // Legs
            '__KKK_KKK___'
        ]
    },
    'orc_shaman': {
        palette: PALETTES,
        rows: [
            '___KPPPPK___', // Hood
            '__KPPPPPPK__',
            '__KVYPPYVK__', // Glowing eyes
            '__KPPPPPPK__',
            '___KPPPPK___',
            '__KPPPPPPK__',
            '_KPPBPPBPPK_', // Bone decorations
            '_KPPPPPPPPK_',
            '_KPPPBBPPPK_',
            '_KPPPPPPPPK_',
            '__KPPKPPK___',
            '__KKK_KKK___'
        ]
    },
    'wolf': {
        palette: PALETTES,
        rows: [
            '__KK____KK__', // Pointed ears
            '__KDK__KDK__',
            '_KDDDDDDDDK_',
            'KDDKDDDDKDDK', // Snout
            'KDDKYDDYKDDK', // Yellow eyes
            'KDDKKKKKDDK_',
            '_KDDDDDDDDK_',
            '__KDDDDDDK__',
            '__KDDDDDDK__',
            '__KDKDDKDK__', // Legs
            '__KDKDDKDK__',
            '__KKK_KKK___'
        ]
    },
    'bat': {
        palette: PALETTES,
        rows: [
            'K__________K',
            'KK________KK',
            'KDK______KDK', // Wings spread
            'KDDK____KDDK',
            '_KDDKKKKDDK_',
            '_KDDSSSSDDK_', // Body
            '_KDDSKSKDDK_', // Eyes
            '_KDDSSSSDDK_',
            '__KDDDDDDK__',
            '__KDDDDDDK__',
            '___KDDDDK___',
            '___KKKKKK___'
        ]
    },
    'spider': {
        palette: PALETTES,
        rows: [
            'K__________K',
            'KK________KK',
            'KDK______KDK', // Legs spread
            '_KDK____KDK_',
            '__KDKKKKDK__',
            '__KDDDDDDK__', // Body
            '__KDYDDYDK__', // Eyes
            '__KDDKKDDK__',
            '__KDDDDDDK__',
            '__KDDDDDDK__',
            '___KDDDDK___',
            '___KKKKKK___'
        ]
    },
    'bear': {
        palette: PALETTES,
        rows: [
            '_KK____KK___', // Round ears
            '_KDK__KDK___',
            'KDDDKKKDDK__', // Large head
            'KDDDDDDDDDK_',
            'KDKYDDYKDDK_', // Eyes
            'KDKKKKKKDDK_',
            '_KDDDDDDDK__',
            'KDDDDDDDDK__', // Massive body
            'KDDDDDDDDK__',
            '_KDDDDDDK___',
            '_KDDKKDDK___', // Legs
            '_KKK__KKK___'
        ]
    },
    'brigandine': {
        palette: PALETTES,
        rows: [
            '___KKKKKK___',
            '__KDDDDDDK__', // Hood up
            '__KDKRRRKDK__', // Mask with red eyes
            '__KDDDDDDK__',
            '___KKKKKK___',
            '__KDDDDDDK__', // Cloak
            '_KDKDDDDKDK_',
            '_KDKDDDDKDK_',
            '_KKKDDDDKKK_',
            '__KDDDDDDK__',
            '__KDK__KDK__', // Legs + dagger
            '__KKK__KKK__'
        ]
    },
    'warlock': {
        palette: PALETTES,
        rows: [
            '___KPPPPK___', // Tall hood
            '__KPPPPPPK__',
            '_KPPPPPPPPK_',
            '_KPKYPPYKPK_', // Glowing eyes deep in hood
            '_KPKKKKKKPK_',
            '__KPPPPPPK__',
            '_KPPPPPPPPK_',
            '_KPPBPPBPPK_', // Magical runes
            '_KPPPPPPPPK_',
            '_KPPPPPPPPK_',
            '__KPPKPPK___',
            '__KKK_KKK___'
        ]
    },
};
