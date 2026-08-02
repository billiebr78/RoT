
import { Attribute, ClassType } from './types';
import { AbilityTree } from './types';

// === DATA-DRIVEN IMPORTS ===
// All game data (enemies, abilities, items, archetypes, sprites, palettes,
// starting items) is now loaded from JSON files via dataLoader.ts. Only
// formulas, numeric constants, and the class bonus table remain in this file.
export {
  ENEMIES_DB, ENEMY_ABILITIES_DB, ARCHETYPE_BEHAVIORS, BOSS_FLEE_THRESHOLD,
  ABILITY_DB, ITEM_PREFIXES, ITEM_SUFFIXES, MYTHIC_PREFIXES, MYTHIC_SUFFIXES,
  OFFHAND_DB, WEAPON_TEMPLATES, POTION_DB, SCROLL_DB,
  STARTING_ITEMS, PALETTES, PALETTE_VARIANTS, SPRITE_LIBRARY,
} from './services/dataLoader';
export type { ArchetypeBehavior, EnemyTemplate } from './services/dataLoader';

export const BASE_ATTRIBUTE_VALUE = 3;
export const BONUS_ATTRIBUTE_VALUE = 2;
export const POTION_COOLDOWN = 10000; // 10 Seconds Global Cooldown

export const CLASS_BONUS: Record<ClassType, Attribute> = {
  [ClassType.WARRIOR]: Attribute.ST,
  [ClassType.MAGE]: Attribute.INT,
  [ClassType.ROGUE]: Attribute.DX,
};

// Maps each class to its ability tree. Players can only unlock abilities
// from their own class's tree — Warrior=MIGHT, Mage=MYSTICS, Rogue=TACTICS.
// This prevents cross-class dipping (e.g. a Mage buying Warrior passives
// for HP, or a Warrior buying Rogue crit passives).
export const CLASS_TREE: Record<ClassType, AbilityTree> = {
  [ClassType.WARRIOR]: AbilityTree.MIGHT,
  [ClassType.MAGE]: AbilityTree.MYSTICS,
  [ClassType.ROGUE]: AbilityTree.TACTICS,
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

// All data tables are loaded from JSON via dataLoader.ts:
//   enemies.json       → ENEMIES_DB
//   enemy_abilities.json → ENEMY_ABILITIES_DB
//   archetypes.json    → ARCHETYPE_BEHAVIORS
//   abilities.json     → ABILITY_DB
//   items.json         → OFFHAND_DB, WEAPON_TEMPLATES, POTION_DB, SCROLL_DB
//   item_names.json    → ITEM_PREFIXES, ITEM_SUFFIXES, MYTHIC_*, etc.
//   starting_items.json → STARTING_ITEMS
//   sprites.json       → PALETTES, PALETTE_VARIANTS, SPRITE_LIBRARY
