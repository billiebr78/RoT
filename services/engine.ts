
import { Character, Item, Attribute, ItemSlot, Enemy, ItemTier, ItemType, WeaponType, OffHandType, Buff, EnemyArchetype } from '../types';
import { getCritChance, ITEM_PREFIXES, ITEM_SUFFIXES, MYTHIC_PREFIXES, MYTHIC_SUFFIXES, ENEMIES_DB, ABILITY_DB, POTION_DB, SCROLL_DB, OFFHAND_DB, WEAPON_TEMPLATES } from '../constants';

export const calculateTotalStats = (character: Character, activeBuffs: { name: string, statBonus?: Partial<Record<Attribute, number>> }[] = []): Record<Attribute, number> => {
  const stats = { ...character.attributes };

  // 1. Equipment Stats
  if (character.equipment) {
      Object.values(character.equipment).forEach((item) => {
        if (!item) return;
        if (item.stats) {
            Object.entries(item.stats).forEach(([key, value]) => {
                const attrKey = key as Attribute;
                stats[attrKey] = (stats[attrKey] || 0) + (value || 0);
            });
        }
      });
  }

  // 2. Passive Ability Stats
  const abilityLevels = character.abilityLevels || {};
  
  Object.entries(abilityLevels).forEach(([abId, level]) => {
      const ability = ABILITY_DB.find(a => a.id === abId);
      if (ability && ability.type === 'Passive' && ability.stats) {
          // Base Stats
          Object.entries(ability.stats).forEach(([key, value]) => {
              const attrKey = key as Attribute;
              stats[attrKey] = (stats[attrKey] || 0) + (value || 0);
          });
          // Scaling Stats
          if (ability.scaling && ability.scaling.stats) {
               Object.entries(ability.scaling.stats).forEach(([key, value]) => {
                  if (typeof value !== 'number') return;
                  const attrKey = key as Attribute;
                  stats[attrKey] = (stats[attrKey] || 0) + (value * (level - 1));
               });
          }
      }
  });

  // 3. Active Buffs
  activeBuffs.forEach(buff => {
      if (buff.statBonus) {
          Object.entries(buff.statBonus).forEach(([key, value]) => {
              const attrKey = key as Attribute;
              stats[attrKey] = (stats[attrKey] || 0) + (value || 0);
          });
      }
  });

  return stats;
};

export const calculatePlayerDamage = (character: Character, isMagic: boolean = false, activeBuffs: Buff[] = []): { damage: number; isCrit: boolean } => {
  const stats = calculateTotalStats(character, activeBuffs);
  const mainHand = character.equipment[ItemSlot.MAIN_HAND];

  const baseDmg = (mainHand?.damage || 2);

  // Determine damage-scaling attribute from the equipped weapon's type, not
  // from the caller's `isMagic` argument (which historically was just
  // `classType === 'Mage'`). This means:
  //   - A Warrior wielding a Magic staff would scale with INT (previously ST).
  //   - A Mage wielding a Slash sword would scale with ST (previously INT).
  //   - The `isMagic` parameter is now an override for abilities that are
  //     inherently magical regardless of weapon (e.g. a spell cast via an
  //     off-hand item, or a class-specific skill).
  //
  // WeaponType.MAGIC -> INT scaling, everything else -> ST scaling.
  let useMagicScaling = isMagic;
  if (mainHand?.weaponType === WeaponType.MAGIC) {
    useMagicScaling = true;
  } else if (mainHand?.weaponType === WeaponType.SLASH || mainHand?.weaponType === WeaponType.BLUNT) {
    // An explicit non-magic weapon overrides the caller's isMagic flag —
    // a Mage physically swinging a sword shouldn't get INT scaling on the
    // auto-attack, only on explicitly magical abilities.
    useMagicScaling = false;
  }

  let multiplier = 1;
  if (useMagicScaling) {
    multiplier = 1 + (stats[Attribute.INT] / 20);
  } else {
    multiplier = 1 + (stats[Attribute.ST] / 20);
  }

  // Dynamic Buff Multipliers (Additive)
  activeBuffs.forEach(buff => {
      if (buff.damageBonus) {
          multiplier += buff.damageBonus;
      }
  });

  let damage = baseDmg * multiplier;

  // Crit Check
  let critChance = getCritChance(stats[Attribute.DX]);

  // Dynamic Buff Crit Chance (Additive)
  activeBuffs.forEach(buff => {
      if (buff.critBonus) {
          critChance += buff.critBonus;
      }
  });

  const isCrit = Math.random() * 100 < critChance;

  if (isCrit) {
    damage *= 1.5;
  }

  damage = damage * (0.9 + Math.random() * 0.2);

  return { damage: Math.floor(damage), isCrit };
};

const rnd = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

export const generateLoot = (level: number, luck: number, bonusLuck: number = 0, allowedSlots?: ItemSlot[]): Item | null => {
  const dropChance = 15 + (luck * 1.5);
  // If allowedSlots is provided (Shop generation), ignore drop chance
  if (!allowedSlots && Math.random() * 100 > dropChance) return null;

  const baseRoll = Math.random() * 10000;
  const luckFactor = (luck * 10) + (bonusLuck * 100); 
  const totalRoll = baseRoll + luckFactor + (level * 5);

  let rarity: 'common' | 'uncommon' | 'rare' | 'legendary' | 'mythic' = 'common';
  if (totalRoll > 9950) rarity = 'mythic';      
  else if (totalRoll > 9700) rarity = 'legendary'; 
  else if (totalRoll > 8500) rarity = 'rare';      
  else if (totalRoll > 6000) rarity = 'uncommon';  
  else rarity = 'common';

  // Slot Selection
  let slots = allowedSlots || Object.values(ItemSlot);
  
  if (!allowedSlots) {
      slots = slots.filter(s => s !== ItemSlot.USABLE1 && s !== ItemSlot.USABLE2);
      if (Math.random() < 0.2) slots.push(ItemSlot.USABLE1); 
  }

  let slot = slots[Math.floor(Math.random() * slots.length)];

  // Consumables
  if (slot === ItemSlot.USABLE1 || slot === ItemSlot.USABLE2) {
      const isPotion = Math.random() > 0.5;
      let db = isPotion ? POTION_DB : SCROLL_DB;
      
      let template;
      if (isPotion) {
          if (level < 5) template = POTION_DB[0]; 
          else if (level < 15) template = POTION_DB[1]; 
          else template = POTION_DB[2]; 
      } else {
          template = db[Math.floor(Math.random() * db.length)];
      }
      
      let tier = ItemTier.LESSER;
      let multiplier = 1;
      if (level > 10 || rarity === 'rare') { tier = ItemTier.GREATER; multiplier = 1.5; }
      if (level > 20 || rarity === 'legendary') { tier = ItemTier.MAJOR; multiplier = 2; }
      if (!isPotion) {
          multiplier = tier === ItemTier.MAJOR ? 2 : tier === ItemTier.GREATER ? 1.5 : 1;
      }

      return {
          id: `loot_${Date.now()}_${Math.random()}`,
          name: isPotion ? template.name : `${tier} ${template.name}`,
          slot: ItemSlot.USABLE1, 
          type: ItemType.CONSUMABLE,
          tier: isPotion ? undefined : tier, 
          rarity,
          value: isPotion ? template.value : Math.floor(20 * multiplier),
          stats: {},
          effect: template.effect,
          magnitude: template.magnitude,
          duration: template.duration,
          icon: template.name.includes('Potion') ? 'FlaskConical' : 'Scroll'
      };
  }

  // Equipment Generation
  const basePower = level * 2; 
  const rarityMult = rarity === 'mythic' ? 5 : rarity === 'legendary' ? 3 : rarity === 'rare' ? 2 : rarity === 'uncommon' ? 1.5 : 1;

  const stats: Partial<Record<Attribute, number>> = {};
  const attributes = Object.values(Attribute);
  const primaryAttr = attributes[Math.floor(Math.random() * attributes.length)];
  let secondaryAttr = attributes[Math.floor(Math.random() * attributes.length)];
  while (secondaryAttr === primaryAttr) {
    secondaryAttr = attributes[Math.floor(Math.random() * attributes.length)];
  }

  switch (rarity) {
    case 'common': stats[primaryAttr] = rnd(1, 2); break;
    case 'uncommon': stats[primaryAttr] = rnd(2, 3); break;
    case 'rare': stats[primaryAttr] = rnd(2, 3); stats[secondaryAttr] = rnd(1, 2); break;
    case 'legendary': stats[primaryAttr] = rnd(4, 5); stats[secondaryAttr] = rnd(2, 3); break;
    case 'mythic':
      if (Math.random() > 0.5) { stats[primaryAttr] = rnd(7, 9); } 
      else { stats[primaryAttr] = rnd(5, 6); stats[secondaryAttr] = rnd(2, 3); }
      break;
  }

  let name = "";
  let isShield = false;
  let weaponType: WeaponType | undefined;
  let offHandType: OffHandType | undefined;
  let damage = 0;
  let armor = 0;
  let blockChance = 0;
  let icon = undefined;

  if (slot === ItemSlot.MAIN_HAND || slot === ItemSlot.OFF_HAND) {
      // OFF_HAND Logic: 30% Shield, 30% Weapon, 40% Special Offhand
      // MAIN_HAND Logic: 100% Weapon
      
      let typeRoll = Math.random();
      if (slot === ItemSlot.MAIN_HAND) typeRoll = 0.5; // Force weapon

      if (slot === ItemSlot.OFF_HAND && typeRoll < 0.3) {
          // Shield
          isShield = true;
          name = "Shield";
          blockChance = 30;
          armor = Math.floor((basePower/2) * rarityMult + 1);
          icon = 'Shield';
      } else if (slot === ItemSlot.OFF_HAND && typeRoll > 0.6) {
          // Special Offhand
          const template = OFFHAND_DB[Math.floor(Math.random() * OFFHAND_DB.length)];
          name = template.name;
          offHandType = template.offHandType;
          icon = template.icon;
          
          if (template.stats) Object.assign(stats, template.stats);
          if (template.blockChance) blockChance = template.blockChance;
          if (template.armor) armor = Math.floor(template.armor * rarityMult);
          if (template.damage) damage = Math.floor(template.damage * rarityMult + basePower);
          
          // Scale base value
          // Add random stats if missing
      } else {
          // Weapon
          const template = WEAPON_TEMPLATES[Math.floor(Math.random() * WEAPON_TEMPLATES.length)];
          name = template.name;
          weaponType = template.type;
          icon = template.icon;
          damage = Math.floor((basePower * rarityMult + 2) * template.damageMod);
          if (template.stats) Object.assign(stats, template.stats);
      }
  } else {
      // Armor
      name = slot.charAt(0).toUpperCase() + slot.slice(1).replace('_', ' ');
      armor = Math.floor((basePower/2) * rarityMult + 1);
  }

  if (rarity === 'mythic') {
      const pre = MYTHIC_PREFIXES[Math.floor(Math.random() * MYTHIC_PREFIXES.length)];
      const suf = MYTHIC_SUFFIXES[Math.floor(Math.random() * MYTHIC_SUFFIXES.length)];
      name = `${pre} ${name} ${suf}`;
  } else if (offHandType) {
      // Offhands usually have simpler names or keep them
      const suffixList = ITEM_SUFFIXES[primaryAttr] || ['of Quality'];
      const suffix = rarity !== 'common' ? suffixList[Math.floor(Math.random() * suffixList.length)] : '';
      name = `${name} ${suffix}`.trim();
  } else {
      const prefixList = ITEM_PREFIXES[primaryAttr] || ['Sturdy'];
      const suffixList = ITEM_SUFFIXES[primaryAttr] || ['of Quality'];
      const prefix = prefixList[Math.floor(Math.random() * prefixList.length)];
      const suffix = rarity !== 'common' ? suffixList[Math.floor(Math.random() * suffixList.length)] : '';
      name = `${prefix} ${name} ${suffix}`.trim();
  }

  return {
    id: `loot_${Date.now()}_${Math.random()}`,
    name,
    slot,
    type: ItemType.EQUIPMENT,
    rarity,
    value: Math.floor(basePower * rarityMult * 10),
    stats,
    damage,
    armor,
    blockChance,
    weaponType,
    offHandType,
    icon
  };
};

export const generateEnemy = (stage: number, playerLevel: number, luck: number): Enemy => {
    const maxIndex = Math.min(ENEMIES_DB.length - 1, Math.floor(stage / 5)); 
    const minIndex = Math.max(0, maxIndex - 2); 
    const range = maxIndex - minIndex + 1;
    const templateIndex = minIndex + Math.floor(Math.random() * range);
    const template = ENEMIES_DB[templateIndex] || ENEMIES_DB[0];

    const isMiniBossCheck = stage % 5 === 0 && stage > 0;
    let isBoss = false;
    if (isMiniBossCheck) isBoss = true;

    const totalPoints = playerLevel * 2.2 + 8; 
    
    const st = Math.floor(3 + (totalPoints * (template.weights[Attribute.ST] || 0)));
    const ht = Math.floor(3 + (totalPoints * (template.weights[Attribute.HT] || 0)));
    const dx = Math.floor(3 + (totalPoints * (template.weights[Attribute.DX] || 0)));
    const int = Math.floor(3 + (totalPoints * (template.weights[Attribute.INT] || 0)));
    
    let hp = ht * 18; 
    const weaponDmg = playerLevel * 1.0;
    const statDmg = st / 2; 
    let damage = Math.max(1, Math.floor(weaponDmg + statDmg));

    let expReward = Math.floor((template.baseExp * (1 + playerLevel * 0.5)));
    let goldReward = Math.floor(((10 + stage * 2) * (0.8 + Math.random() * 0.4)) * 0.7);
    
    let dropChance = 15;
    let luckBonus = 0;
    let fearResist = 0; 

    if (isBoss) {
        hp *= 3.0; 
        damage *= 1.65; 
        expReward *= 2.5; 
        goldReward *= 3;
        dropChance = 100; 
        luckBonus = 20; 
        fearResist = 10; 
    }

    // Roll archetype: 50/50 between the enemy's two possible archetypes.
    // Bosses use the same archetype but with reduced flee threshold (5%).
    const archetypes = template.archetypes || ['Aggressor', 'Berzerker'];
    const archetype: EnemyArchetype = archetypes[Math.floor(Math.random() * archetypes.length)];

    return {
        id: `enemy_${Date.now()}`,
        name: isBoss ? `BOSS: ${archetype} ${template.name}` : `${archetype} ${template.name}`,
        sprite: template.sprite,
        attributes: {
            [Attribute.ST]: st,
            [Attribute.DX]: dx,
            [Attribute.INT]: int,
            [Attribute.HT]: ht,
            [Attribute.LUCK]: 0
        },
        maxHp: hp,
        hp: hp,
        damage: damage,
        speed: (0.6 + (Math.random() * 0.4) + (stage * 0.02)) * (isBoss ? 1.5 : 1.0) * 1.25,
        range: 100, // Matched enemy reach
        expReward,
        goldReward,
        dropChance,
        isBoss,
        luckBonus,
        fearResist,
        abilities: template.abilities || [],
        // Random hue rotation in degrees, capped at ±25% of the full 360°
        // hue wheel (so ±90°). Gives each spawned enemy a unique color tint
        // without changing its sprite definition. Grey/black colors (s=0)
        // are left unchanged by shiftHue, so outlines and shadows stay neutral.
        hueShift: (Math.random() * 2 - 1) * 90,
        archetype,
        firstAidTriggered: {},
    };
};
