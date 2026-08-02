import React, { useState, useEffect, useMemo } from 'react';
import { Character, ItemSlot, Item, AbilityTree, AbilityType, Attribute, ItemType } from '../types';
import { ABILITY_DB, getExpForLevel, getHp } from '../constants';
import { calculateTotalStats, generateLoot } from '../services/engine';
import HubHeader from './hub/HubHeader';
import TownSquare from './hub/TownSquare';
import Tavern from './hub/Tavern';
import ShopView from './hub/ShopView';
import ItemTooltip from './hub/ItemTooltip';
import ItemInteractionMenu, { InteractionContext } from './hub/ItemInteractionMenu';

interface Props {
    character: Character;
    onUpdateCharacter: (c: Character) => void;
    onStartJourney: () => void;
    onLogout: () => void;
}

type TownLocation = 'SQUARE' | 'TAVERN' | 'BLACKSMITH' | 'APOTHECARY' | 'IVORY_TOWER';

const Hub: React.FC<Props> = ({ character, onUpdateCharacter, onStartJourney, onLogout }) => {
    const [location, setLocation] = useState<TownLocation>('SQUARE');
    const [activeTab, setActiveTab] = useState<'equipment' | 'abilities'>('equipment');
    const [abilityTreeTab, setAbilityTreeTab] = useState<AbilityTree>(AbilityTree.MIGHT);

    const [blacksmithItems, setBlacksmithItems] = useState<Item[]>([]);
    const [magicItems, setMagicItems] = useState<Item[]>([]);
    const [apothecaryItems, setApothecaryItems] = useState<Item[]>([]);

    const [interactionMenu, setInteractionMenu] = useState<{item: Item, x: number, y: number, context: InteractionContext} | null>(null);
    const [hoveredItem, setHoveredItem] = useState<{item: Item, x: number, y: number} | null>(null);

    // Optimization: Memoize stats calculation to prevent re-calculation on every render
    const totalStats = useMemo(() => calculateTotalStats(character), [character.attributes, character.equipment, character.abilityLevels]);
    const maxHp = getHp(totalStats.HT);

    // Local HP state for visual regeneration to prevent spamming App level save/render
    const [localHp, setLocalHp] = useState(character.currentHp !== undefined ? character.currentHp : maxHp);

    // Sync local HP to character when navigating away or performing actions
    const syncHp = () => {
        if (localHp !== character.currentHp) {
            const newChar = { ...character, currentHp: localHp };
            onUpdateCharacter(newChar);
        }
    };

    useEffect(() => {
        const now = Date.now();
        const oneHour = 60 * 60 * 1000;

        if (!character.lastShopRefresh || !character.shopData || (now - character.lastShopRefresh > oneHour)) {
            const genShop = (allowedSlots: ItemSlot[], bonusLuck: number, count: number) => {
                const items = [];
                for(let i=0; i<count; i++) {
                    const item = generateLoot(character.level, totalStats.LUCK + bonusLuck, 0, allowedSlots);
                    if (item) items.push(item);
                }
                return items;
            };

            const newShopData = {
                blacksmith: genShop([ItemSlot.MAIN_HAND, ItemSlot.OFF_HAND, ItemSlot.HEAD, ItemSlot.CHEST, ItemSlot.LEGS, ItemSlot.HANDS], 0, 8),
                magic: genShop([ItemSlot.NECK, ItemSlot.RING1, ItemSlot.RING2, ItemSlot.USABLE1], 20, 6),
                apothecary: genShop([ItemSlot.USABLE1], 10, 4)
            };

            setBlacksmithItems(newShopData.blacksmith);
            setMagicItems(newShopData.magic);
            setApothecaryItems(newShopData.apothecary);

            // We must update character here, so we include current localHp
            const newChar = {
                ...character,
                currentHp: localHp,
                lastShopRefresh: now,
                shopData: newShopData
            };
            onUpdateCharacter(newChar);
        } else {
            setBlacksmithItems(character.shopData.blacksmith);
            setMagicItems(character.shopData.magic);
            setApothecaryItems(character.shopData.apothecary);
        }
    }, [character.lastShopRefresh]);

    useEffect(() => {
        const interval = setInterval(() => {
            if (localHp < maxHp) {
                const regenPerSecond = Math.max(0.1, totalStats.HT / 10);
                setLocalHp(prev => Math.min(maxHp, prev + regenPerSecond));
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [maxHp, totalStats.HT, localHp]);

    // Sync HP when unmounting or changing location
    useEffect(() => {
        return () => syncHp();
    }, [location]);

    // === Item manipulation handlers ===

    const unequipItem = (slot: ItemSlot) => {
        const item = character.equipment[slot];
        if (!item) return;

        const newChar = { ...character, equipment: { ...character.equipment }, stash: [...character.stash] };
        delete newChar.equipment[slot];
        newChar.stash.push(item);

        const newStats = calculateTotalStats(newChar);
        const newMaxHp = getHp(newStats.HT);
        newChar.currentHp = Math.min(localHp, newMaxHp);
        setLocalHp(newChar.currentHp);

        onUpdateCharacter(newChar);
        setInteractionMenu(null);
    };

    const equipItem = (item: Item, targetSlot?: ItemSlot) => {
        const newChar = { ...character, equipment: { ...character.equipment }, stash: [...character.stash] };
        const stashIndex = newChar.stash.findIndex(i => i.id === item.id);
        if (stashIndex === -1) return;

        let slot = targetSlot || item.slot;

        if (!targetSlot) {
             if (item.type === ItemType.CONSUMABLE) {
                if (!newChar.equipment[ItemSlot.USABLE1]) slot = ItemSlot.USABLE1;
                else if (!newChar.equipment[ItemSlot.USABLE2]) slot = ItemSlot.USABLE2;
                else slot = ItemSlot.USABLE1;
             } else if (item.blockChance && item.blockChance > 0 && !item.damage) {
                 // Pure shields always target OFF_HAND; never MAIN_HAND.
                 slot = ItemSlot.OFF_HAND;
             }
        }

        newChar.stash.splice(stashIndex, 1);
        if (newChar.equipment[slot]) {
            newChar.stash.push(newChar.equipment[slot]!);
        }
        newChar.equipment[slot] = item;

        const newStats = calculateTotalStats(newChar);
        const newMaxHp = getHp(newStats.HT);
        newChar.currentHp = Math.min(localHp, newMaxHp);
        setLocalHp(newChar.currentHp);

        onUpdateCharacter(newChar);
        setInteractionMenu(null);
    };

    const buyItem = (item: Item) => {
        const cost = item.value * 2;
        if (character.gold >= cost) {
            const newChar = { ...character, stash: [...character.stash], currentHp: localHp };
            newChar.gold -= cost;
            newChar.stash.push({ ...item, id: `bought_${Date.now()}_${Math.random()}` });
            onUpdateCharacter(newChar);
            setInteractionMenu(null);
        } else {
            alert("Not enough gold!");
        }
    };

    const confirmSellItem = (item: Item) => {
        const newChar = { ...character, stash: [...character.stash], currentHp: localHp };
        const stashIndex = newChar.stash.findIndex(i => i.id === item.id);

        if (stashIndex !== -1) {
            newChar.stash.splice(stashIndex, 1);
            newChar.gold += Math.floor(item.value * 0.5);
            onUpdateCharacter(newChar);
        }
        setInteractionMenu(null);
    };

    const handleItemClick = (item: Item, e: React.MouseEvent, context: InteractionContext) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        let x = rect.left + rect.width / 2;
        let y = rect.bottom;

        if (x > window.innerWidth - 150) x = window.innerWidth - 160;
        if (y > window.innerHeight - 200) y = rect.top - 200;

        setInteractionMenu({ item, x, y, context });
    };

    const handleMouseEnterItem = (item: Item, e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setHoveredItem({ item, x: rect.right + 10, y: rect.top });
    };

    const handleMouseLeaveItem = () => setHoveredItem(null);

    // === Attribute / ability handlers ===

    const toggleAbility = (id: string) => {
        const newChar = { ...character, currentHp: localHp };
        const ability = ABILITY_DB.find(a => a.id === id);
        if (!ability) return;

        const isEquipped = newChar.equippedAbilities.includes(id);
        const active = newChar.equippedAbilities.filter(aid => ABILITY_DB.find(a => a.id === aid)?.type === AbilityType.ACTIVE).length;

        if (isEquipped) {
            newChar.equippedAbilities = newChar.equippedAbilities.filter(aid => aid !== id);
        } else {
            if (ability.type === AbilityType.ACTIVE) {
                if (active < 3) {
                    newChar.equippedAbilities = [...newChar.equippedAbilities, id];
                } else {
                    const firstActiveIndex = newChar.equippedAbilities.findIndex(aid => ABILITY_DB.find(a => a.id === aid)?.type === AbilityType.ACTIVE);
                    if (firstActiveIndex >= 0) {
                         const updated = [...newChar.equippedAbilities];
                         updated.splice(firstActiveIndex, 1);
                         updated.push(id);
                         newChar.equippedAbilities = updated;
                    }
                }
            }
        }
        onUpdateCharacter(newChar);
    };

    const unlockAbility = (id: string) => {
        if ((character.skillPoints || 0) <= 0) return;

        const newChar = { ...character, currentHp: localHp };
        newChar.skillPoints = (newChar.skillPoints || 0) - 1;

        // CRITICAL: create a new abilityLevels object so React's useMemo
        // detects the change. The old code did `if (!newChar.abilityLevels)
        // newChar.abilityLevels = {}` which kept the same reference when
        // abilityLevels already existed, so mutating it in-place didn't
        // trigger a re-calculation of totalStats in the useMemo.
        newChar.abilityLevels = { ...(newChar.abilityLevels || {}) };

        if (newChar.unlockedAbilities.includes(id)) {
            const currentLvl = newChar.abilityLevels[id] || 1;
            const ability = ABILITY_DB.find(a => a.id === id);
            if (ability && ability.maxLevel && currentLvl < ability.maxLevel) {
                newChar.abilityLevels[id] = currentLvl + 1;
            }
        } else {
            newChar.unlockedAbilities = [...newChar.unlockedAbilities, id];
            newChar.abilityLevels[id] = 1;

            const ability = ABILITY_DB.find(a => a.id === id);
            if (ability && ability.type === AbilityType.ACTIVE) {
                 const active = newChar.equippedAbilities.filter(aid => ABILITY_DB.find(a => a.id === aid)?.type === AbilityType.ACTIVE).length;
                 if (active < 3) {
                    newChar.equippedAbilities = [...newChar.equippedAbilities, id];
                 }
            }
        }
        onUpdateCharacter(newChar);
    };

    const increaseAttribute = (attr: Attribute) => {
        if ((character.attributePoints || 0) <= 0) return;
        const newChar = { ...character, currentHp: localHp };
        newChar.attributePoints = (newChar.attributePoints || 0) - 1;
        newChar.attributes = { ...newChar.attributes, [attr]: (newChar.attributes[attr] || 0) + 1 };
        onUpdateCharacter(newChar);
    };

    const healFull = () => {
        const missing = maxHp - localHp;
        if (missing <= 0) return;
        const cost = Math.ceil(missing);
        if (character.gold >= cost) {
            const newChar = { ...character, currentHp: maxHp };
            newChar.gold -= cost;
            setLocalHp(maxHp);
            onUpdateCharacter(newChar);
        } else {
            alert("Not enough gold!");
        }
    };

    // === Render ===

    const handleInteractionItem = (item: Item, action: 'equip' | 'unequip' | 'buy' | 'sell_initiate' | 'sell_confirm') => {
        switch (action) {
            case 'equip': equipItem(item); break;
            case 'unequip': unequipItem(item.slot); break;
            case 'buy': buyItem(item); break;
            case 'sell_initiate':
                if (interactionMenu) setInteractionMenu({ ...interactionMenu, context: 'sell_confirm' });
                break;
            case 'sell_confirm': confirmSellItem(item); break;
        }
    };

    return (
        <div className="fixed inset-0 bg-medieval-900 text-medieval-100 flex flex-col relative overflow-y-auto" onClick={() => setInteractionMenu(null)}>
            <HubHeader
                character={character}
                localHp={localHp}
                maxHp={maxHp}
                showHealButton={location === 'TAVERN'}
                onHeal={healFull}
                onLogout={() => { syncHp(); onLogout(); }}
            />

            {location === 'SQUARE' && (
                <TownSquare
                    onGoTavern={() => setLocation('TAVERN')}
                    onGoBlacksmith={() => setLocation('BLACKSMITH')}
                    onGoIvoryTower={() => setLocation('IVORY_TOWER')}
                    onGoApothecary={() => setLocation('APOTHECARY')}
                    onJourney={() => { syncHp(); onStartJourney(); }}
                />
            )}

            {location === 'TAVERN' && (
                <Tavern
                    character={character}
                    activeTab={activeTab}
                    abilityTreeTab={abilityTreeTab}
                    totalStats={totalStats}
                    onSetActiveTab={setActiveTab}
                    onSetAbilityTreeTab={setAbilityTreeTab}
                    onItemClick={handleItemClick}
                    onItemHover={handleMouseEnterItem}
                    onItemLeave={handleMouseLeaveItem}
                    onIncreaseAttribute={increaseAttribute}
                    onUnlockAbility={unlockAbility}
                    onToggleAbility={toggleAbility}
                    onBack={() => setLocation('SQUARE')}
                />
            )}

            {location === 'BLACKSMITH' && (
                <ShopView
                    title="Iron & Steel"
                    gold={character.gold}
                    items={blacksmithItems}
                    stash={character.stash}
                    onItemClick={handleItemClick}
                    onItemHover={handleMouseEnterItem}
                    onItemLeave={handleMouseLeaveItem}
                    onBack={() => setLocation('SQUARE')}
                />
            )}

            {location === 'IVORY_TOWER' && (
                <ShopView
                    title="Arcane Secrets"
                    gold={character.gold}
                    items={magicItems}
                    stash={character.stash}
                    onItemClick={handleItemClick}
                    onItemHover={handleMouseEnterItem}
                    onItemLeave={handleMouseLeaveItem}
                    onBack={() => setLocation('SQUARE')}
                />
            )}

            {location === 'APOTHECARY' && (
                <ShopView
                    title="The Apothecary"
                    gold={character.gold}
                    items={apothecaryItems}
                    stash={character.stash}
                    onItemClick={handleItemClick}
                    onItemHover={handleMouseEnterItem}
                    onItemLeave={handleMouseLeaveItem}
                    onBack={() => setLocation('SQUARE')}
                />
            )}

            {/* Hover Tooltip */}
            {hoveredItem && !interactionMenu && (
                <ItemTooltip item={hoveredItem.item} x={hoveredItem.x} y={hoveredItem.y} />
            )}

            {/* Interaction menu */}
            {interactionMenu && (
                <ItemInteractionMenu
                    item={interactionMenu.item}
                    x={interactionMenu.x}
                    y={interactionMenu.y}
                    context={interactionMenu.context}
                    onClose={() => setInteractionMenu(null)}
                    onEquip={(item) => handleInteractionItem(item, 'equip')}
                    onEquipToSlot={(item, slot) => equipItem(item, slot)}
                    onUnequip={(slot) => unequipItem(slot)}
                    onBuy={(item) => handleInteractionItem(item, 'buy')}
                    onSellInitiate={() => handleInteractionItem(interactionMenu.item, 'sell_initiate')}
                    onSellConfirm={(item) => handleInteractionItem(item, 'sell_confirm')}
                />
            )}
        </div>
    );
};

export default Hub;
