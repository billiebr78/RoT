
export enum Attribute {
  ST = 'ST', // Strength
  DX = 'DX', // Dexterity
  INT = 'INT', // Intelligence
  HT = 'HT', // Health
  LUCK = 'LUCK' // Luck
}

export enum ClassType {
  WARRIOR = 'Warrior',
  MAGE = 'Mage',
  ROGUE = 'Rogue'
}

export enum ItemSlot {
  HEAD = 'head',
  CHEST = 'chest',
  HANDS = 'hands',
  LEGS = 'legs',
  NECK = 'neck',
  RING1 = 'ring1',
  RING2 = 'ring2',
  MAIN_HAND = 'main_hand',
  OFF_HAND = 'off_hand',
  USABLE1 = 'usable1',
  USABLE2 = 'usable2',
}

export enum ItemType {
  EQUIPMENT = 'Equipment',
  CONSUMABLE = 'Consumable'
}

export enum ItemTier {
  LESSER = 'Lesser',
  GREATER = 'Greater',
  MAJOR = 'Major'
}

export enum WeaponType {
  SLASH = 'Slash', // Swords, Daggers
  BLUNT = 'Blunt', // Maces, Hammers
  MAGIC = 'Magic'  // Wands, Staffs
}

export enum OffHandType {
  SHIELD = 'Shield',
  SPELLBOOK = 'Spellbook',
  BUCKLER = 'Buckler',
  SWORDBREAKER = 'Swordbreaker',
  TALISMAN = 'Talisman'
}

export enum BuffType {
  STAT = 'Stat',
  MECHANIC = 'Mechanic' // e.g., Evasion, Stun Immunity
}

export interface Buff {
  id: string;
  name: string;
  type: BuffType;
  duration: number; // ms
  statBonus?: Partial<Record<Attribute, number>>;
  damageBonus?: number; // Multiplier additive (e.g. 0.5 for +50%)
  critBonus?: number; // Flat additive (e.g. 20 for +20%)
  icon: string;
  charges?: number; // For mechanics like "Next 3 attacks"
  barrierHp?: number; // For Aura Shield mechanics
}

export enum AbilityType {
  PASSIVE = 'Passive',
  ACTIVE = 'Active'
}

export enum AbilityStyle {
  OFFENSIVE = 'Offensive',
  DEFENSIVE = 'Defensive',
  PASSIVE = 'Passive'
}

export enum AbilityTree {
  MIGHT = 'Might',
  TACTICS = 'Tactics',
  MYSTICS = 'Mystics'
}

export interface Item {
  id: string;
  name: string;
  slot: ItemSlot; // For Equipment, this is the target slot. For Consumables, this acts as "preferred" or is ignored during equip.
  type?: ItemType;
  tier?: ItemTier;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary' | 'mythic';
  stats: Partial<Record<Attribute, number>>;
  damage?: number;
  armor?: number;
  blockChance?: number; // Percent 0-100
  
  weaponType?: WeaponType;
  offHandType?: OffHandType;

  icon?: string;
  value: number;
  effect?: string; // For consumables text description
  magnitude?: number; // For consumables numeric value (Heal amount)
  duration?: number; // For consumables
}

export interface AbilityScaling {
  damage?: number;
  effect?: number; // Scaling for buffs/heals/barriers
  duration?: number; // Scaling for duration in ms
  stats?: Partial<Record<Attribute, number>>;
}

export interface Ability {
  id: string;
  name: string;
  description: string;
  type: AbilityType;
  style: AbilityStyle;
  tree: AbilityTree;
  cooldown: number; // Base cooldown in ms
  castTime?: number; // Time to prepare the skill in ms
  damageMultiplier?: number;
  cost?: number;
  effect?: 'heal' | 'stun' | 'barrier' | 'damage' | 'buff' | 'parry';
  stats?: Partial<Record<Attribute, number>>; // For passive stat bonuses
  icon: string;
  requiredLevel: number;
  maxLevel?: number;
  range?: number; // Range in pixels
  scaling?: AbilityScaling;
}

export interface EnemyAbility {
  id: string;
  name: string;
  damageMult: number;
  effect?: 'stun' | 'lifesteal' | 'ranged';
  cooldown: number;
  range: number;
  castTime: number;
}

export interface Character {
  id: string;
  name: string;
  classType: ClassType;
  level: number;
  exp: number;
  attributes: Record<Attribute, number>;
  attributePoints: number; // Points to spend on stats
  skillPoints: number;     // Points to spend on abilities
  equipment: Partial<Record<ItemSlot, Item>>;
  stash: Item[];
  gold: number;
  currentHp?: number; // Persistent Health
  potions?: number;    // Health Potions (Legacy)
  scrolls?: number;   // Scrolls (Legacy)
  equippedAbilities: string[]; // IDs of equipped abilities (max 3 active)
  unlockedAbilities: string[];
  abilityLevels?: Record<string, number>;
  maxStage: number;

  // Bravery: spent to retreat without XP penalty. +1 per 10 levels,
  // recover 1 per victory, full recovery on level up or death.
  bravery?: number;
  maxBravery?: number;

  // Map position (0-indexed row/col on the 16x16 grid)
  mapRow?: number;
  mapCol?: number;

  // Shop Persistence
  lastShopRefresh?: number;
  shopData?: {
      blacksmith: Item[];
      magic: Item[];
      apothecary: Item[];
  };
}

export type EnemyArchetype = 'Berzerker' | 'Aggressor' | 'Skirmisher' | 'Defender' | 'Coward';

export interface Enemy {
  id: string;
  name: string;
  attributes: Record<Attribute, number>;
  hp: number;
  maxHp: number;
  damage: number;
  speed: number;
  range: number;
  sprite: string;
  expReward: number;
  goldReward: number;
  dropChance: number;
  isBoss?: boolean;
  luckBonus?: number;
  fearResist: number; // Percentage reduction (0-100)
  abilities: EnemyAbility[];
  hueShift?: number; // Random hue rotation in degrees (±90 = ±25% of 360°)
  archetype?: EnemyArchetype; // Rolled at spawn from the enemy's possible archetypes
  firstAidTriggered?: Record<number, boolean>; // Which HP thresholds have already cast first aid
}

export interface CombatLog {
  id: string;
  message: string;
  type: 'info' | 'damage' | 'heal' | 'loot';
}

// Pixel Art Types
export type Palette = Record<string, string>;
export interface SpriteFrame {
  rows: string[];
  palette: Palette;
}
