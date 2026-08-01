// Data loader — imports JSON data files and converts string keys to enum values.
// This replaces the inline data in constants.ts with external JSON files
// that are easier to edit and maintain.

import { Ability, AbilityTree, AbilityType, AbilityStyle, Attribute, EnemyAbility, EnemyArchetype, WeaponType, OffHandType } from '../types';
import enemiesJson from '../data/enemies.json';
import enemyAbilitiesJson from '../data/enemy_abilities.json';
import archetypesJson from '../data/archetypes.json';
import abilitiesJson from '../data/abilities.json';
import itemNamesJson from '../data/item_names.json';
import itemsJson from '../data/items.json';

// === Attribute string → enum mapping ===
const ATTR_MAP: Record<string, Attribute> = {
  'ST': Attribute.ST,
  'DX': Attribute.DX,
  'INT': Attribute.INT,
  'HT': Attribute.HT,
  'LUCK': Attribute.LUCK,
};

const WEAPON_TYPE_MAP: Record<string, WeaponType> = {
  'SLASH': WeaponType.SLASH,
  'BLUNT': WeaponType.BLUNT,
  'MAGIC': WeaponType.MAGIC,
};

const OFFHAND_TYPE_MAP: Record<string, OffHandType> = {
  'SPELLBOOK': OffHandType.SPELLBOOK,
  'BUCKLER': OffHandType.BUCKLER,
  'SWORDBREAKER': OffHandType.SWORDBREAKER,
  'TALISMAN': OffHandType.TALISMAN,
};

const ABILITY_TYPE_MAP: Record<string, AbilityType> = {
  'Active': AbilityType.ACTIVE,
  'Passive': AbilityType.PASSIVE,
};

const ABILITY_STYLE_MAP: Record<string, AbilityStyle> = {
  'Offensive': AbilityStyle.OFFENSIVE,
  'Defensive': AbilityStyle.DEFENSIVE,
  'Passive': AbilityStyle.PASSIVE,
};

const ABILITY_TREE_MAP: Record<string, AbilityTree> = {
  'MIGHT': AbilityTree.MIGHT,
  'TACTICS': AbilityTree.TACTICS,
  'MYSTICS': AbilityTree.MYSTICS,
};

// Helper: convert string-keyed stats to Attribute-keyed stats
const convertStats = (stats: Record<string, number> | undefined): Partial<Record<Attribute, number>> => {
  if (!stats) return {};
  const result: Partial<Record<Attribute, number>> = {};
  for (const [key, value] of Object.entries(stats)) {
    const attrKey = ATTR_MAP[key];
    if (attrKey) result[attrKey] = value;
  }
  return result;
};

// Helper: convert string-keyed scaling stats
const convertScalingStats = (stats: Record<string, number> | undefined): Partial<Record<Attribute, number>> => {
  return convertStats(stats);
};

// === Exported data ===

// Enemy abilities
export const ENEMY_ABILITIES_DB: Record<string, EnemyAbility> = enemyAbilitiesJson as Record<string, EnemyAbility>;

// Archetypes
export interface ArchetypeBehavior {
  pursueChance: number;
  blockBonus: number;
  firstAidThresholds: number[];
  fleeThreshold: number | null;
  isRanged: boolean;
}

export const ARCHETYPE_BEHAVIORS: Record<EnemyArchetype, ArchetypeBehavior> = archetypesJson as Record<EnemyArchetype, ArchetypeBehavior>;

export const BOSS_FLEE_THRESHOLD = 0.05;

// Enemies DB — convert string archetype names to enum values
export interface EnemyTemplate {
  name: string;
  sprite: string;
  baseExp: number;
  weights: Record<Attribute, number>;
  abilities: EnemyAbility[];
  archetypes: EnemyArchetype[];
  isBoss?: boolean;
}

export const ENEMIES_DB: EnemyTemplate[] = (enemiesJson as any[]).map(e => ({
  name: e.name,
  sprite: e.sprite,
  baseExp: e.baseExp,
  weights: Object.fromEntries(
    Object.entries(e.weights).map(([k, v]) => [ATTR_MAP[k], v])
  ) as Record<Attribute, number>,
  abilities: (e.abilities || []).map((abKey: string) => ENEMY_ABILITIES_DB[abKey]).filter((ab: EnemyAbility) => ab),
  archetypes: (e.archetypes || []) as EnemyArchetype[],
  isBoss: e.isBoss === true,
}));

// Player abilities DB — convert string enums to real enums
export const ABILITY_DB: Ability[] = (abilitiesJson as any[]).map(a => ({
  id: a.id,
  name: a.name,
  description: a.description,
  type: ABILITY_TYPE_MAP[a.type] || AbilityType.ACTIVE,
  style: ABILITY_STYLE_MAP[a.style] || AbilityStyle.OFFENSIVE,
  tree: ABILITY_TREE_MAP[a.tree] || AbilityTree.MIGHT,
  cooldown: a.cooldown,
  castTime: a.castTime,
  damageMultiplier: a.damageMultiplier,
  scaling: a.scaling ? {
    damage: a.scaling.damage,
    effect: a.scaling.effect,
    duration: a.scaling.duration,
    stats: a.scaling.stats ? convertScalingStats(a.scaling.stats) : undefined,
  } : undefined,
  cost: a.cost,
  effect: a.effect,
  stats: a.stats ? convertStats(a.stats) : undefined,
  icon: a.icon,
  requiredLevel: a.requiredLevel,
  maxLevel: a.maxLevel,
  range: a.range,
}));

// Item name data
export const ITEM_PREFIXES: Record<Attribute, string[]> = Object.fromEntries(
  Object.entries((itemNamesJson as any).prefixes).map(([k, v]) => [ATTR_MAP[k], v])
) as Record<Attribute, string[]>;

export const ITEM_SUFFIXES: Record<Attribute, string[]> = Object.fromEntries(
  Object.entries((itemNamesJson as any).suffixes).map(([k, v]) => [ATTR_MAP[k], v])
) as Record<Attribute, string[]>;

export const MYTHIC_PREFIXES: string[] = (itemNamesJson as any).mythicPrefixes;
export const MYTHIC_SUFFIXES: string[] = (itemNamesJson as any).mythicSuffixes;

// Items
export const OFFHAND_DB = (itemsJson as any).offhand.map((o: any) => ({
  ...o,
  offHandType: OFFHAND_TYPE_MAP[o.offHandType],
  stats: o.stats ? convertStats(o.stats) : undefined,
}));

export const WEAPON_TEMPLATES = (itemsJson as any).weapons.map((w: any) => ({
  ...w,
  type: WEAPON_TYPE_MAP[w.type],
  stats: w.stats ? convertStats(w.stats) : undefined,
}));

export const POTION_DB = (itemsJson as any).potions;
export const SCROLL_DB = (itemsJson as any).scrolls;
