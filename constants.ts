
import { Ability, AbilityTree, AbilityType, AbilityStyle, Attribute, ClassType, Item, ItemSlot, EnemyAbility, SpriteFrame, WeaponType, OffHandType } from './types';

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
export const getExpForLevel = (level: number): number => Math.floor(20 * Math.pow(level, 2.5));
export const getCritChance = (dx: number) => Math.min(50, dx * 0.5); // Cap at 50%
export const getEvasion = (dx: number) => Math.min(40, dx * 0.4); // Cap at 40%
export const getMagicResist = (int: number) => Math.min(60, int * 0.5);
export const getCooldownReduction = (dx: number) => Math.min(0.5, dx * 0.017); // Max 50% reduction at ~30 DX

// Item Generation Data
export const ITEM_PREFIXES: Record<Attribute, string[]> = {
  [Attribute.ST]: ['Heavy', 'Brutal', 'Strong', 'Titan', 'Bear'],
  [Attribute.DX]: ['Swift', 'Agile', 'Sharp', 'Shadow', 'Wind'],
  [Attribute.INT]: ['Arcane', 'Wise', 'Mystic', 'Astral', 'Mind'],
  [Attribute.HT]: ['Sturdy', 'Vital', 'Hardy', 'Stone', 'Oak'],
  [Attribute.LUCK]: ['Lucky', 'Golden', 'Fated', 'Rich', 'Royal']
};

export const ITEM_SUFFIXES: Record<Attribute, string[]> = {
  [Attribute.ST]: ['of Power', 'of Might', 'of the Giant', 'of Crushing'],
  [Attribute.DX]: ['of Speed', 'of Precision', 'of the Hawk', 'of Striking'],
  [Attribute.INT]: ['of Magic', 'of Wisdom', 'of the Void', 'of Sorcery'],
  [Attribute.HT]: ['of Life', 'of Endurance', 'of the Golem', 'of Health'],
  [Attribute.LUCK]: ['of Fortune', 'of Wealth', 'of Destiny', 'of Greed']
};

// Special Mythic Names
export const MYTHIC_PREFIXES = ['Godly', 'Eternal', 'Divine', 'Ancient', 'Celestial'];
export const MYTHIC_SUFFIXES = ['of the Gods', 'of Infinity', 'of the Cosmos', 'of Legends'];

export const OFFHAND_DB = [
    { name: 'Spellbook', offHandType: OffHandType.SPELLBOOK, stats: {[Attribute.INT]: 2}, icon: 'Book', baseValue: 30 },
    { name: 'Buckler', offHandType: OffHandType.BUCKLER, blockChance: 15, stats: {[Attribute.DX]: 1}, icon: 'Shield', armor: 2, baseValue: 20 },
    { name: 'Swordbreaker', offHandType: OffHandType.SWORDBREAKER, blockChance: 10, damage: 3, stats: {[Attribute.ST]: 1}, icon: 'Sword', baseValue: 35 },
    { name: 'Talisman', offHandType: OffHandType.TALISMAN, stats: {[Attribute.LUCK]: 3}, icon: 'Zap', baseValue: 40 },
];

export const WEAPON_TEMPLATES = [
    { name: 'Sword', type: WeaponType.SLASH, damageMod: 1.0, icon: 'Sword' },
    { name: 'Dagger', type: WeaponType.SLASH, damageMod: 0.8, stats: {[Attribute.DX]: 1}, icon: 'Sword' }, // lucide has no Dagger; Sword is the closest available
    { name: 'Mace', type: WeaponType.BLUNT, damageMod: 1.2, icon: 'Hammer' },
    { name: 'Hammer', type: WeaponType.BLUNT, damageMod: 1.3, icon: 'Hammer' },
    { name: 'Staff', type: WeaponType.MAGIC, damageMod: 1.1, stats: {[Attribute.INT]: 2}, icon: 'Stick' },
    { name: 'Wand', type: WeaponType.MAGIC, damageMod: 0.9, stats: {[Attribute.INT]: 1}, icon: 'Wand' },
];

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

// Consumable Database
export const POTION_DB = [
    { id: 'pot_heal_small', name: 'Small Healing Potion', effect: 'Heals 50 HP', magnitude: 50, duration: 0, buffType: 'MECHANIC', value: 25 },
    { id: 'pot_heal_greater', name: 'Greater Healing Potion', effect: 'Heals 150 HP', magnitude: 150, duration: 0, buffType: 'MECHANIC', value: 100 },
    { id: 'pot_heal_major', name: 'Major Healing Potion', effect: 'Heals 350 HP', magnitude: 350, duration: 0, buffType: 'MECHANIC', value: 350 },
];

export const SCROLL_DB = [
    { id: 'scr_power', name: 'Scroll of Power', effect: 'Damage +50%', duration: 20000, buffType: 'STAT' },
    { id: 'scr_stone', name: 'Stone Skin', effect: 'Armor +50%', duration: 30000, buffType: 'STAT' },
    { id: 'scr_feral', name: 'Feral Instinct', effect: 'Crit +20%', duration: 20000, buffType: 'STAT' },
    { id: 'scr_bear', name: 'Strength of Bear', effect: 'ST +10', duration: 45000, buffType: 'STAT' },
    { id: 'scr_shadow', name: 'Shadow Whispers', effect: 'Evasion +20%', duration: 30000, buffType: 'MECHANIC' },
    { id: 'scr_wisdom', name: 'Ancient Wisdom', effect: 'INT +10', duration: 45000, buffType: 'STAT' },
];

export const ABILITY_DB: Ability[] = [
  // --- MIGHT (Warrior) ---
  // Offensive
  { id: 'might_strike', name: 'Power Strike', description: 'A heavy forceful blow.', type: AbilityType.ACTIVE, style: AbilityStyle.OFFENSIVE, tree: AbilityTree.MIGHT, cooldown: 14577, castTime: 300, damageMultiplier: 2.0, scaling: { damage: 0.5 }, effect: 'damage', icon: 'Sword', requiredLevel: 1, maxLevel: 3, range: 110 },
  { id: 'might_shieldbash', name: 'Shield Bash', description: 'Bash enemy with shield. DMG based on Armor.', type: AbilityType.ACTIVE, style: AbilityStyle.OFFENSIVE, tree: AbilityTree.MIGHT, cooldown: 29157, castTime: 400, damageMultiplier: 2, scaling: { damage: 1 }, effect: 'damage', icon: 'Shield', requiredLevel: 5, maxLevel: 3, range: 130 },
  { id: 'might_earthquake', name: 'Earthquake', description: 'Shatter the earth dealing massive damage.', type: AbilityType.ACTIVE, style: AbilityStyle.OFFENSIVE, tree: AbilityTree.MIGHT, cooldown: 72897, castTime: 800, damageMultiplier: 4.0, scaling: { damage: 0.8 }, effect: 'damage', icon: 'Zap', requiredLevel: 10, maxLevel: 3, range: 120 },
  { id: 'might_titanic', name: 'Titanic Smash', description: 'The ultimate display of strength.', type: AbilityType.ACTIVE, style: AbilityStyle.OFFENSIVE, tree: AbilityTree.MIGHT, cooldown: 124416, castTime: 1200, damageMultiplier: 6.0, scaling: { damage: 1.0 }, effect: 'damage', icon: 'Skull', requiredLevel: 15, maxLevel: 3, range: 120 },
  
  // Defensive
  { id: 'might_roar', name: 'Battle Roar', description: '+15% Dmg/Lvl and Heals.', type: AbilityType.ACTIVE, style: AbilityStyle.DEFENSIVE, tree: AbilityTree.MIGHT, cooldown: 67068, castTime: 0, effect: 'buff', scaling: { effect: 0.15, duration: 2000 }, icon: 'Heart', requiredLevel: 2, maxLevel: 3 },
  { id: 'might_majesty', name: 'Majesty', description: 'Exponential Armor Buff (Base 15).', type: AbilityType.ACTIVE, style: AbilityStyle.DEFENSIVE, tree: AbilityTree.MIGHT, cooldown: 97200, castTime: 200, effect: 'buff', scaling: { duration: 2000 }, icon: 'Shield', requiredLevel: 8, maxLevel: 3 },

  // Passive
  { id: 'might_mastery', name: 'Weapon Mastery', description: 'Increases Strength.', type: AbilityType.PASSIVE, style: AbilityStyle.PASSIVE, tree: AbilityTree.MIGHT, cooldown: 0, stats: { [Attribute.ST]: 3 }, scaling: { stats: { [Attribute.ST]: 2 } }, icon: 'Sword', requiredLevel: 3, maxLevel: 3 },
  { id: 'might_armor', name: 'Heavy Armor', description: 'Increases Health drastically.', type: AbilityType.PASSIVE, style: AbilityStyle.PASSIVE, tree: AbilityTree.MIGHT, cooldown: 0, stats: { [Attribute.HT]: 3 }, scaling: { stats: { [Attribute.HT]: 3 } }, icon: 'Shield', requiredLevel: 6, maxLevel: 3 },

  // --- TACTICS (Rogue) ---
  // Offensive
  { id: 'tactics_mortal', name: 'Focused Attack', description: 'Precise strike to vital areas.', type: AbilityType.ACTIVE, style: AbilityStyle.OFFENSIVE, tree: AbilityTree.TACTICS, cooldown: 19440, castTime: 200, damageMultiplier: 2.5, scaling: { damage: 0.5 }, effect: 'damage', icon: 'Crosshair', requiredLevel: 1, maxLevel: 3, range: 110 },
  { id: 'tactics_backstab', name: 'Cheap Shot', description: 'Stun the enemy, leaving them helpless.', type: AbilityType.ACTIVE, style: AbilityStyle.OFFENSIVE, tree: AbilityTree.TACTICS, cooldown: 38880, castTime: 200, damageMultiplier: 1.5, scaling: { damage: 0.3 }, effect: 'stun', icon: 'Skull', requiredLevel: 5, maxLevel: 3, range: 110 },
  { id: 'tactics_eviscerate', name: 'Eviscerate', description: 'Brutal attack causing deep wounds.', type: AbilityType.ACTIVE, style: AbilityStyle.OFFENSIVE, tree: AbilityTree.TACTICS, cooldown: 65000, castTime: 500, damageMultiplier: 5.0, scaling: { damage: 1.0 }, effect: 'damage', icon: 'Droplets', requiredLevel: 10, maxLevel: 3, range: 110 },
  { id: 'tactics_assassinate', name: 'Assassinate', description: 'Attempt to end the target instantly.', type: AbilityType.ACTIVE, style: AbilityStyle.OFFENSIVE, tree: AbilityTree.TACTICS, cooldown: 134784, castTime: 1500, damageMultiplier: 7.0, scaling: { damage: 1.2 }, effect: 'damage', icon: 'Ghost', requiredLevel: 15, maxLevel: 3, range: 110 },
  
  // Defensive
  { id: 'tactics_dash', name: 'Dash', description: 'Next 3/4/5 hits have 80% Evasion.', type: AbilityType.ACTIVE, style: AbilityStyle.DEFENSIVE, tree: AbilityTree.TACTICS, cooldown: 24296, castTime: 0, effect: 'buff', scaling: { duration: 1000 }, icon: 'Footprints', requiredLevel: 2, maxLevel: 3 },
  { id: 'tactics_ue', name: 'Parry', description: 'Block next hit and counter with Crit.', type: AbilityType.ACTIVE, style: AbilityStyle.DEFENSIVE, tree: AbilityTree.TACTICS, cooldown: 72897, castTime: 0, effect: 'parry', scaling: { duration: 1000 }, icon: 'Ghost', requiredLevel: 8, maxLevel: 3 },

  // Passive
  { id: 'tactics_mastery', name: 'Backstab', description: '+30% Dmg vs Stunned/Feared.', type: AbilityType.PASSIVE, style: AbilityStyle.PASSIVE, tree: AbilityTree.TACTICS, cooldown: 0, stats: {}, icon: 'Sword', requiredLevel: 3, maxLevel: 3 },
  { id: 'tactics_crit', name: 'Dagger Mastery', description: 'Increases DX and Luck.', type: AbilityType.PASSIVE, style: AbilityStyle.PASSIVE, tree: AbilityTree.TACTICS, cooldown: 0, stats: { [Attribute.DX]: 4, [Attribute.LUCK]: 2 }, scaling: { stats: { [Attribute.DX]: 2, [Attribute.LUCK]: 1 } }, icon: 'Zap', requiredLevel: 6, maxLevel: 3 },

  // --- MYSTICS (Mage) ---
  // Offensive
  { id: 'mystic_wind', name: 'Wind Strike', description: 'Fast casting air attack.', type: AbilityType.ACTIVE, style: AbilityStyle.OFFENSIVE, tree: AbilityTree.MYSTICS, cooldown: 9716, castTime: 500, damageMultiplier: 1.2, scaling: { damage: 0.3 }, effect: 'damage', icon: 'Wind', requiredLevel: 1, maxLevel: 3, range: 400 },
  { id: 'mystic_hydro', name: 'Hydro Blast', description: 'High pressure water attack.', type: AbilityType.ACTIVE, style: AbilityStyle.OFFENSIVE, tree: AbilityTree.MYSTICS, cooldown: 24296, castTime: 800, damageMultiplier: 2.0, scaling: { damage: 0.5 }, effect: 'damage', icon: 'Droplets', requiredLevel: 5, maxLevel: 3, range: 400 },
  { id: 'mystic_meteor', name: 'Meteor', description: 'Summon a meteor from the sky.', type: AbilityType.ACTIVE, style: AbilityStyle.OFFENSIVE, tree: AbilityTree.MYSTICS, cooldown: 97200, castTime: 1500, damageMultiplier: 4.5, scaling: { damage: 1.0 }, effect: 'damage', icon: 'Flame', requiredLevel: 10, maxLevel: 3, range: 500 },
  { id: 'mystic_armageddon', name: 'Armageddon', description: 'Unleash the full power of the elements.', type: AbilityType.ACTIVE, style: AbilityStyle.OFFENSIVE, tree: AbilityTree.MYSTICS, cooldown: 165888, castTime: 2000, damageMultiplier: 8.0, scaling: { damage: 1.5 }, effect: 'damage', icon: 'Zap', requiredLevel: 15, maxLevel: 3, range: 600 },

  // Defensive
  { id: 'mystic_aura', name: 'Aura Shield', description: 'Creates a protective barrier.', type: AbilityType.ACTIVE, style: AbilityStyle.DEFENSIVE, tree: AbilityTree.MYSTICS, cooldown: 48596, castTime: 200, effect: 'barrier', scaling: { effect: 20, duration: 5000 }, icon: 'Shield', requiredLevel: 2, maxLevel: 3 },
  { id: 'mystic_body', name: 'Body to Mind', description: 'Convert Health to Power (Heal).', type: AbilityType.ACTIVE, style: AbilityStyle.DEFENSIVE, tree: AbilityTree.MYSTICS, cooldown: 44712, castTime: 1000, effect: 'heal', scaling: { effect: 3 }, icon: 'Heart', requiredLevel: 8, maxLevel: 3 },

  // Passive
  { id: 'mystic_mastery', name: 'Robe Mastery', description: 'Increases Intelligence.', type: AbilityType.PASSIVE, style: AbilityStyle.PASSIVE, tree: AbilityTree.MYSTICS, cooldown: 0, stats: { [Attribute.INT]: 3 }, scaling: { stats: { [Attribute.INT]: 2 } }, icon: 'Book', requiredLevel: 3, maxLevel: 3 },
  { id: 'mystic_anti', name: 'Anti-Magic', description: 'Increases Health and Resist.', type: AbilityType.PASSIVE, style: AbilityStyle.PASSIVE, tree: AbilityTree.MYSTICS, cooldown: 0, stats: { [Attribute.HT]: 2, [Attribute.INT]: 1 }, scaling: { stats: { [Attribute.HT]: 2, [Attribute.INT]: 1 } }, icon: 'Shield', requiredLevel: 6, maxLevel: 3 },
];

export const ENEMY_ABILITIES_DB: Record<string, EnemyAbility> = {
  SMASH: { id: 'e_smash', name: 'Heavy Smash', damageMult: 1.8, effect: 'stun', cooldown: 8000, range: 60, castTime: 1500 },
  DRAIN: { id: 'e_drain', name: 'Life Drain', damageMult: 1.2, effect: 'lifesteal', cooldown: 10000, range: 60, castTime: 1200 },
  FIREBALL: { id: 'e_fire', name: 'Shadow Bolt', damageMult: 1.4, effect: 'ranged', cooldown: 6000, range: 400, castTime: 1000 },
};

export const ENEMIES_DB = [
  { 
    name: 'Goblin Grunt', 
    sprite: 'goblin',
    baseExp: 10,
    weights: { [Attribute.ST]: 0.3, [Attribute.DX]: 0.4, [Attribute.HT]: 0.2, [Attribute.INT]: 0.1 },
    abilities: []
  },
  { 
    name: 'Skeleton Warrior', 
    sprite: 'skeleton',
    baseExp: 20,
    weights: { [Attribute.ST]: 0.4, [Attribute.DX]: 0.3, [Attribute.HT]: 0.3, [Attribute.INT]: 0.0 },
    abilities: []
  },
  { 
    name: 'Orc Berserker', 
    sprite: 'orc',
    baseExp: 50,
    weights: { [Attribute.ST]: 0.6, [Attribute.DX]: 0.1, [Attribute.HT]: 0.3, [Attribute.INT]: 0.0 },
    abilities: [ENEMY_ABILITIES_DB.SMASH]
  },
  { 
    name: 'Dark Knight', 
    sprite: 'knight',
    baseExp: 150,
    weights: { [Attribute.ST]: 0.5, [Attribute.DX]: 0.2, [Attribute.HT]: 0.3, [Attribute.INT]: 0.0 },
    abilities: [ENEMY_ABILITIES_DB.SMASH]
  },
  { 
    name: 'Vampire', 
    sprite: 'vampire',
    baseExp: 200,
    weights: { [Attribute.ST]: 0.3, [Attribute.DX]: 0.4, [Attribute.HT]: 0.2, [Attribute.INT]: 0.1 },
    abilities: [ENEMY_ABILITIES_DB.DRAIN]
  },
  { 
    name: 'Stone Golem', 
    sprite: 'golem',
    baseExp: 250,
    weights: { [Attribute.ST]: 0.7, [Attribute.DX]: 0.0, [Attribute.HT]: 0.3, [Attribute.INT]: 0.0 },
    abilities: [ENEMY_ABILITIES_DB.SMASH]
  },
  { 
    name: 'Corrupted Sorcerer', 
    sprite: 'sorcerer',
    baseExp: 200,
    weights: { [Attribute.ST]: 0.1, [Attribute.DX]: 0.2, [Attribute.HT]: 0.1, [Attribute.INT]: 0.6 },
    abilities: [ENEMY_ABILITIES_DB.FIREBALL]
  },
  { 
    name: 'Wyvern', 
    sprite: 'dragon',
    baseExp: 500,
    weights: { [Attribute.ST]: 0.4, [Attribute.DX]: 0.2, [Attribute.HT]: 0.2, [Attribute.INT]: 0.2 },
    abilities: [ENEMY_ABILITIES_DB.SMASH, ENEMY_ABILITIES_DB.FIREBALL]
  },
];


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
};
