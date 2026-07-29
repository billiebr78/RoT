
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Character, ItemSlot, Item, AbilityTree, AbilityType, AbilityStyle, Attribute, ItemType } from '../types';
import { ABILITY_DB, getExpForLevel, getHp } from '../constants';
import { calculateTotalStats, generateLoot } from '../services/engine';
import { Shirt, Sword, Shield, Gem, Backpack, User, Activity, ArrowRight, PlusCircle, Lock, Check, Book, Zap, Ghost, Footprints, Heart, Wind, Flame, Droplets, Crosshair, Skull, Tornado, Plus, Map, Beer, Hammer, Store, FlaskConical, Scroll, MoreVertical, X, Wand } from 'lucide-react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

interface Props {
    character: Character;
    onUpdateCharacter: (c: Character) => void;
    onStartJourney: () => void;
    onLogout: () => void;
}

type TownLocation = 'SQUARE' | 'TAVERN' | 'BLACKSMITH' | 'APOTHECARY' | 'IVORY_TOWER';

const Hub: React.FC<Props> = ({ character, onUpdateCharacter, onStartJourney, onLogout }) => {
    const [location, setLocation] = useState<TownLocation>('SQUARE');
    const [activeTab, setActiveTab] = useState<'equipment' | 'abilities' | 'stash'>('equipment');
    const [abilityTreeTab, setAbilityTreeTab] = useState<AbilityTree>(AbilityTree.MIGHT);
    
    const [blacksmithItems, setBlacksmithItems] = useState<Item[]>([]);
    const [magicItems, setMagicItems] = useState<Item[]>([]);
    const [apothecaryItems, setApothecaryItems] = useState<Item[]>([]);

    const [interactionMenu, setInteractionMenu] = useState<{item: Item, x: number, y: number, context: string} | null>(null);
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

    const chartData = [
        { subject: 'ST', A: totalStats.ST, fullMark: 20 },
        { subject: 'DX', A: totalStats.DX, fullMark: 20 },
        { subject: 'INT', A: totalStats.INT, fullMark: 20 },
        { subject: 'HT', A: totalStats.HT, fullMark: 20 },
        { subject: 'LCK', A: totalStats.LUCK, fullMark: 20 },
    ];

    const unequipItem = (slot: ItemSlot) => {
        const item = character.equipment[slot];
        if (!item) return;

        const newChar = { ...character, equipment: { ...character.equipment }, stash: [...character.stash] };
        delete newChar.equipment[slot];
        newChar.stash.push(item);
        
        // Recalc stats with new equipment to clamp HP correctly
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
                 // Pure shields (blockChance > 0, no damage) must NOT go to
                 // MAIN_HAND. Previously the fallback "if OFF_HAND occupied
                 // and MAIN_HAND empty, equip shield to MAIN_HAND" let the
                 // player end up attacking with a shield (damage = 0, falls
                 // back to the hardcoded 2 from `mainHand?.damage || 2`).
                 // Pure shields always target OFF_HAND; if OFF_HAND is full,
                 // the swap logic below handles the exchange with the existing
                 // occupant.
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

    const buyItem = (item: Item, costMult: number = 2) => {
        const cost = item.value * costMult;
        if (character.gold >= cost) {
            const newChar = { ...character, stash: [...character.stash], currentHp: localHp };
            newChar.gold -= cost;
            newChar.stash.push({ ...item, id: `bought_${Date.now()}_${Math.random()}` });
            onUpdateCharacter(newChar);
            setInteractionMenu(null);
            return true;
        } else {
            alert("Not enough gold!");
            return false;
        }
    };

    const initiateSell = () => {
        if (interactionMenu) {
            setInteractionMenu({ ...interactionMenu, context: 'sell_confirm' });
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

    const handleItemClick = (item: Item, e: React.MouseEvent, context: string) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        let x = rect.left + rect.width / 2;
        let y = rect.bottom;
        
        if (x > window.innerWidth - 150) x = window.innerWidth - 160;
        if (y > window.innerHeight - 200) y = rect.top - 200;

        setInteractionMenu({
            item,
            x,
            y,
            context
        });
    };

    const handleMouseEnterItem = (item: Item, e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setHoveredItem({
            item,
            x: rect.right + 10,
            y: rect.top
        });
    };

    const handleMouseLeaveItem = () => {
        setHoveredItem(null);
    };

    const toggleAbility = (id: string) => {
        const newChar = { ...character, currentHp: localHp };
        const ability = ABILITY_DB.find(a => a.id === id);
        if (!ability) return;

        const isEquipped = newChar.equippedAbilities.includes(id);
        const { active } = getEquippedCounts(newChar.equippedAbilities);

        if (isEquipped) {
            newChar.equippedAbilities = newChar.equippedAbilities.filter(aid => aid !== id);
        } else {
            // Cap active abilities at 3 to match the J/K/L hotkeys and the
            // 3-slot HUD in GameLoop. Previously this was 4, which let the
            // player equip a 4th active that was completely inaccessible
            // (no hotkey, no button, no slice).
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
        
        if (newChar.unlockedAbilities.includes(id)) {
            if (!newChar.abilityLevels) newChar.abilityLevels = {};
            const currentLvl = newChar.abilityLevels[id] || 1;
            const ability = ABILITY_DB.find(a => a.id === id);
            if (ability && ability.maxLevel && currentLvl < ability.maxLevel) {
                newChar.abilityLevels[id] = currentLvl + 1;
            }
        } else {
            newChar.unlockedAbilities = [...newChar.unlockedAbilities, id];
            if (!newChar.abilityLevels) newChar.abilityLevels = {};
            newChar.abilityLevels[id] = 1;

            const ability = ABILITY_DB.find(a => a.id === id);
            if (ability && ability.type === AbilityType.ACTIVE) {
                 const { active } = getEquippedCounts(newChar.equippedAbilities);
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

    // Use the shared XP formula from constants so the progress bar matches
    // the actual level-up logic in GameLoop.
    const getExpNextLevel = (level: number) => getExpForLevel(level);

    const getEquippedCounts = (equippedIds: string[]) => {
        const active = equippedIds.filter(id => ABILITY_DB.find(a => a.id === id)?.type === AbilityType.ACTIVE).length;
        const passive = equippedIds.filter(id => ABILITY_DB.find(a => a.id === id)?.type === AbilityType.PASSIVE).length;
        return { active, passive };
    };

    const renderAbilityIcon = (iconName: string, size: number = 24, className: string = '') => {
        switch (iconName) {
            case 'Sword': return <Sword size={size} className={className} />;
            case 'Shield': return <Shield size={size} className={className} />;
            case 'Zap': return <Zap size={size} className={className} />;
            case 'Heart': return <Heart size={size} className={className} />;
            case 'Skull': return <Skull size={size} className={className} />;
            case 'Ghost': return <Ghost size={size} className={className} />;
            case 'Footprints': return <Footprints size={size} className={className} />;
            case 'Crosshair': return <Crosshair size={size} className={className} />;
            case 'Hurricane': return <Tornado size={size} className={className} />;
            case 'Tornado': return <Tornado size={size} className={className} />;
            case 'Wind': return <Wind size={size} className={className} />;
            case 'Flame': return <Flame size={size} className={className} />;
            case 'Droplets': return <Droplets size={size} className={className} />;
            case 'Book': return <Book size={size} className={className} />;
            case 'Hammer': return <Hammer size={size} className={className} />;
            case 'Wand': return <Wand size={size} className={className} />;
            default: return <Zap size={size} className={className} />;
        }
    };

    const renderHeader = () => (
        <header className="bg-medieval-800 border-b-2 border-medieval-600 p-4 flex justify-between items-center shadow-lg shrink-0">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-medieval-600 rounded-full flex items-center justify-center border-2 border-medieval-400">
                    <User />
                </div>
                <div>
                    <h1 className="font-serif text-2xl text-medieval-200">{character.name}</h1>
                    <span className="text-sm text-medieval-400">{character.classType} Lvl {character.level}</span>
                    <div className="w-32 h-2 bg-black rounded mt-1 relative overflow-hidden border border-medieval-700">
                        <div 
                            className="h-full bg-blue-600" 
                            style={{ width: `${Math.min(100, (character.exp / getExpNextLevel(character.level)) * 100)}%` }}
                        ></div>
                    </div>
                </div>
            </div>
            
            <div className="flex items-center gap-4">
                <div className="text-right">
                        <div className="text-xs text-medieval-400">Health</div>
                        <div className="font-bold text-lg flex items-center justify-end gap-2">
                            <Heart size={16} className="text-red-500" fill="currentColor"/>
                            {Math.floor(localHp)} / {maxHp}
                        </div>
                </div>
                {location === 'TAVERN' && localHp < maxHp && (
                    <button 
                        onClick={healFull}
                        className="px-2 py-1 bg-green-900 border border-green-600 rounded hover:bg-green-800 flex flex-col items-center text-xs"
                    >
                            <span className="font-bold text-white">Heal</span>
                            <span className="text-yellow-400">{Math.ceil(maxHp - localHp)}g</span>
                    </button>
                )}
            </div>

            <div className="flex gap-4">
                <div className="text-right">
                    <div className="text-yellow-500 font-bold">{character.gold} Gold</div>
                    <div className="text-xs text-medieval-400">Stage {character.maxStage}</div>
                </div>
                <button onClick={() => { syncHp(); onLogout(); }} className="px-3 py-1 bg-red-900/50 hover:bg-red-900 rounded border border-red-800">Log Out</button>
            </div>
        </header>
    );

    const renderTownSquare = () => (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-b from-gray-900 to-black relative">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-medieval-500 via-transparent to-transparent"></div>
            <h2 className="text-4xl font-serif text-medieval-300 mb-12 relative z-10">Town Square</h2>
            <div className="grid grid-cols-2 gap-8 relative z-10 w-full max-w-4xl">
                <button onClick={() => setLocation('TAVERN')} className="h-40 bg-medieval-800/80 hover:bg-medieval-700 border-2 border-medieval-500 rounded-lg flex flex-col items-center justify-center gap-4 transition-all hover:scale-105 group">
                    <Beer size={48} className="text-yellow-600 group-hover:text-yellow-400" />
                    <span className="text-2xl font-bold text-medieval-200">The Tavern</span>
                    <span className="text-sm text-medieval-400">Manage Character</span>
                </button>
                <button onClick={() => setLocation('BLACKSMITH')} className="h-40 bg-medieval-800/80 hover:bg-medieval-700 border-2 border-medieval-500 rounded-lg flex flex-col items-center justify-center gap-4 transition-all hover:scale-105 group">
                    <Hammer size={48} className="text-gray-400 group-hover:text-gray-200" />
                    <span className="text-2xl font-bold text-medieval-200">Blacksmith</span>
                    <span className="text-sm text-medieval-400">Weapons & Armor</span>
                </button>
                <button onClick={() => setLocation('IVORY_TOWER')} className="h-40 bg-medieval-800/80 hover:bg-medieval-700 border-2 border-medieval-500 rounded-lg flex flex-col items-center justify-center gap-4 transition-all hover:scale-105 group">
                    <Scroll size={48} className="text-blue-400 group-hover:text-blue-200" />
                    <span className="text-2xl font-bold text-medieval-200">Ivory Tower</span>
                    <span className="text-sm text-medieval-400">Magic Goods</span>
                </button>
                <button onClick={() => setLocation('APOTHECARY')} className="h-40 bg-medieval-800/80 hover:bg-medieval-700 border-2 border-medieval-500 rounded-lg flex flex-col items-center justify-center gap-4 transition-all hover:scale-105 group">
                    <FlaskConical size={48} className="text-red-400 group-hover:text-red-200" />
                    <span className="text-2xl font-bold text-medieval-200">Apothecary</span>
                    <span className="text-sm text-medieval-400">Potions</span>
                </button>
            </div>
            <button 
                onClick={() => { syncHp(); onStartJourney(); }}
                className="mt-12 px-12 py-6 bg-emerald-900 hover:bg-emerald-800 border-2 border-emerald-500 text-white font-bold text-2xl rounded-lg shadow-2xl flex items-center gap-4 animate-pulse relative z-10"
            >
                Journey Onward <ArrowRight />
            </button>
        </div>
    );

    const renderTavern = () => (
        <div className="flex-1 p-6 flex gap-6 overflow-hidden">
            <div className="w-1/4 flex flex-col gap-6">
                <div className="bg-medieval-800 p-4 rounded border border-medieval-600 shadow-inner">
                        <h3 className="font-serif text-center text-medieval-300 mb-2">Attributes</h3>
                        <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                            <PolarGrid stroke="#4a2c17" />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#b39263', fontSize: 12 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                            <Radar name={character.name} dataKey="A" stroke="#d4b985" fill="#8f6e45" fillOpacity={0.6} />
                            </RadarChart>
                        </ResponsiveContainer>
                        </div>
                        
                        <div className="mt-4 space-y-2 bg-medieval-900/50 p-2 rounded">
                            {character.attributePoints > 0 && (
                                <div className="text-center text-yellow-400 font-bold text-xs mb-2 animate-pulse">
                                    {character.attributePoints} Points Available!
                                </div>
                            )}
                            {Object.values(Attribute).map(attr => (
                                <div key={attr} className="flex justify-between items-center text-sm">
                                    <span className="font-bold text-medieval-400">{attr}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-white">{character.attributes[attr]}</span>
                                        <button 
                                        onClick={() => increaseAttribute(attr)}
                                        disabled={!character.attributePoints || character.attributePoints <= 0}
                                        className="w-5 h-5 rounded bg-emerald-800 hover:bg-emerald-700 disabled:opacity-0 disabled:cursor-default flex items-center justify-center text-xs font-bold text-white"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                </div>

                <nav className="flex flex-col gap-2">
                    <button onClick={() => setActiveTab('equipment')} className={`p-3 text-left rounded border transition-all flex items-center gap-3 ${activeTab === 'equipment' ? 'bg-medieval-700 border-medieval-400 text-white' : 'bg-medieval-900 border-medieval-700 hover:bg-medieval-800'}`}>
                        <Backpack size={20} /> Equipment
                    </button>
                    <button onClick={() => setActiveTab('abilities')} className={`p-3 text-left rounded border transition-all flex items-center gap-3 ${activeTab === 'abilities' ? 'bg-medieval-700 border-medieval-400 text-white' : 'bg-medieval-900 border-medieval-700 hover:bg-medieval-800'}`}>
                        <Activity size={20} /> Abilities
                        {character.skillPoints > 0 && <span className="bg-yellow-500 text-black text-[10px] px-1.5 rounded-full font-bold animate-bounce">{character.skillPoints}</span>}
                    </button>
                </nav>
                <button onClick={() => setLocation('SQUARE')} className="mt-auto py-3 bg-medieval-800 hover:bg-medieval-700 border border-medieval-500 text-medieval-200 font-bold rounded flex items-center justify-center gap-2">
                    <Map size={18} /> Back to Town
                </button>
            </div>

            <div className="flex-1 bg-medieval-800 rounded border-2 border-medieval-600 p-6 overflow-y-auto relative">
                {activeTab === 'equipment' && (
                    <div className="flex gap-8 h-full">
                        <div className="w-1/3 flex flex-col items-center gap-4">
                            <h3 className="font-serif text-xl text-medieval-300 border-b border-medieval-600 w-full text-center pb-2">Equipped</h3>
                            <div className="relative w-64 h-96 bg-medieval-900 rounded-full border border-medieval-700 flex items-center justify-center">
                                <div className="absolute top-4 left-1/2 -translate-x-1/2">
                                    <SlotIcon slot={ItemSlot.HEAD} item={character.equipment[ItemSlot.HEAD]} 
                                        onMouseEnter={(item, e) => handleMouseEnterItem(item, e)} 
                                        onMouseLeave={handleMouseLeaveItem}
                                        onClick={(item, e) => handleItemClick(item, e, 'equipped')} />
                                </div>
                                <div className="absolute top-20 left-1/2 -translate-x-1/2">
                                    <SlotIcon slot={ItemSlot.NECK} item={character.equipment[ItemSlot.NECK]} 
                                        onMouseEnter={(item, e) => handleMouseEnterItem(item, e)} 
                                        onMouseLeave={handleMouseLeaveItem}
                                        onClick={(item, e) => handleItemClick(item, e, 'equipped')} />
                                </div>
                                
                                <div className="absolute top-40 left-4">
                                    <SlotIcon slot={ItemSlot.MAIN_HAND} item={character.equipment[ItemSlot.MAIN_HAND]} label="Main" 
                                        onMouseEnter={(item, e) => handleMouseEnterItem(item, e)} 
                                        onMouseLeave={handleMouseLeaveItem}
                                        onClick={(item, e) => handleItemClick(item, e, 'equipped')} />
                                </div>
                                <div className="absolute top-40 left-1/2 -translate-x-1/2">
                                    <SlotIcon slot={ItemSlot.CHEST} item={character.equipment[ItemSlot.CHEST]} 
                                        onMouseEnter={(item, e) => handleMouseEnterItem(item, e)} 
                                        onMouseLeave={handleMouseLeaveItem}
                                        onClick={(item, e) => handleItemClick(item, e, 'equipped')} />
                                </div>
                                <div className="absolute top-40 right-4">
                                    <SlotIcon slot={ItemSlot.OFF_HAND} item={character.equipment[ItemSlot.OFF_HAND]} label="Off" 
                                        onMouseEnter={(item, e) => handleMouseEnterItem(item, e)} 
                                        onMouseLeave={handleMouseLeaveItem}
                                        onClick={(item, e) => handleItemClick(item, e, 'equipped')} />
                                </div>
                                
                                <div className="absolute bottom-24 left-12">
                                    <SlotIcon slot={ItemSlot.HANDS} item={character.equipment[ItemSlot.HANDS]} 
                                        onMouseEnter={(item, e) => handleMouseEnterItem(item, e)} 
                                        onMouseLeave={handleMouseLeaveItem}
                                        onClick={(item, e) => handleItemClick(item, e, 'equipped')} />
                                </div>
                                <div className="absolute bottom-24 left-1/2 -translate-x-1/2">
                                    <SlotIcon slot={ItemSlot.LEGS} item={character.equipment[ItemSlot.LEGS]} 
                                        onMouseEnter={(item, e) => handleMouseEnterItem(item, e)} 
                                        onMouseLeave={handleMouseLeaveItem}
                                        onClick={(item, e) => handleItemClick(item, e, 'equipped')} />
                                </div>
                                <div className="absolute bottom-24 right-12">
                                    <SlotIcon slot={ItemSlot.RING1} item={character.equipment[ItemSlot.RING1]} 
                                        onMouseEnter={(item, e) => handleMouseEnterItem(item, e)} 
                                        onMouseLeave={handleMouseLeaveItem}
                                        onClick={(item, e) => handleItemClick(item, e, 'equipped')} />
                                </div>
                                <div className="absolute bottom-12 left-1/2 -translate-x-1/2">
                                    <SlotIcon slot={ItemSlot.RING2} item={character.equipment[ItemSlot.RING2]} 
                                        onMouseEnter={(item, e) => handleMouseEnterItem(item, e)} 
                                        onMouseLeave={handleMouseLeaveItem}
                                        onClick={(item, e) => handleItemClick(item, e, 'equipped')} />
                                </div>
                                
                                <div className="absolute bottom-2 left-16">
                                    <SlotIcon slot={ItemSlot.USABLE1} item={character.equipment[ItemSlot.USABLE1]} label="Quick 1" 
                                        onMouseEnter={(item, e) => handleMouseEnterItem(item, e)} 
                                        onMouseLeave={handleMouseLeaveItem}
                                        onClick={(item, e) => handleItemClick(item, e, 'equipped')} />
                                </div>
                                <div className="absolute bottom-2 right-16">
                                    <SlotIcon slot={ItemSlot.USABLE2} item={character.equipment[ItemSlot.USABLE2]} label="Quick 2" 
                                        onMouseEnter={(item, e) => handleMouseEnterItem(item, e)} 
                                        onMouseLeave={handleMouseLeaveItem}
                                        onClick={(item, e) => handleItemClick(item, e, 'equipped')} />
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 bg-medieval-900 rounded p-4 border border-medieval-700">
                            <h3 className="font-serif text-xl text-medieval-300 mb-4">Stash ({character.stash.length} items)</h3>
                            <div className="grid grid-cols-4 gap-3 max-h-[400px] overflow-y-auto">
                                {character.stash.map((item, idx) => (
                                    <InventoryItem 
                                        key={idx} 
                                        item={item} 
                                        onMouseEnter={(e) => handleMouseEnterItem(item, e)} 
                                        onMouseLeave={handleMouseLeaveItem}
                                        onClick={(e) => handleItemClick(item, e, 'inventory')}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                )}
                {activeTab === 'abilities' && renderAbilitiesTab()}
            </div>
        </div>
    );

    const renderAbilitiesTab = () => {
        const { active: activeCount } = getEquippedCounts(character.equippedAbilities);
        return (
         <div className="h-full flex flex-col">
            <div className="flex justify-between items-center border-b border-medieval-600 pb-4 mb-6">
                <div>
                    <h3 className="font-serif text-2xl text-medieval-300">Ability Mastery</h3>
                    <div className="flex gap-4 text-xs text-medieval-400 mt-1">
                        <span className={activeCount >= 3 ? 'text-red-400 font-bold' : 'text-emerald-400'}>Active: {activeCount}/3</span>
                        <span className="text-medieval-600">|</span>
                        <span className="text-blue-400">Passives: Innate</span>
                    </div>
                </div>
                <div className="flex flex-col items-end">
                        {character.skillPoints > 0 && (
                            <div className="text-xs text-yellow-400 font-bold mt-1 animate-pulse">Points Available: {character.skillPoints}</div>
                        )}
                </div>
            </div>

            <div className="flex gap-4 mb-6">
                {[AbilityTree.MIGHT, AbilityTree.TACTICS, AbilityTree.MYSTICS].map(tree => (
                    <button
                        key={tree}
                        onClick={() => setAbilityTreeTab(tree)}
                        className={`flex-1 py-2 px-4 rounded border-2 font-serif uppercase tracking-widest transition-all ${
                            abilityTreeTab === tree 
                            ? 'bg-medieval-700 border-medieval-300 text-white shadow-lg' 
                            : 'bg-medieval-900 border-medieval-700 text-medieval-500 hover:bg-medieval-800'
                        }`}
                    >
                        {tree}
                    </button>
                ))}
            </div>
            
            <div className="flex-1 grid grid-cols-3 gap-6 overflow-y-auto">
                {[AbilityStyle.OFFENSIVE, AbilityStyle.DEFENSIVE, AbilityStyle.PASSIVE].map(style => {
                    const styleAbilities = ABILITY_DB.filter(a => a.tree === abilityTreeTab && a.style === style);
                    return (
                        <div key={style} className="bg-medieval-900/50 rounded border border-medieval-700 p-4">
                            <h4 className={`text-center font-bold mb-4 uppercase text-sm border-b pb-2 ${
                                style === AbilityStyle.OFFENSIVE ? 'text-red-400 border-red-900' :
                                style === AbilityStyle.DEFENSIVE ? 'text-blue-400 border-blue-900' :
                                'text-yellow-400 border-yellow-900'
                            }`}>
                                {style}
                            </h4>
                            <div className="space-y-4">
                                {styleAbilities.map(ability => {
                                    const isUnlocked = character.unlockedAbilities.includes(ability.id);
                                    const isLevelMet = character.level >= ability.requiredLevel;
                                    const isEquipped = character.equippedAbilities.includes(ability.id);
                                    const currentLevel = character.abilityLevels ? (character.abilityLevels[ability.id] || 1) : 1;
                                    const maxLevel = ability.maxLevel || 3;
                                    
                                    let stateClass = '';
                                    if (!isLevelMet) stateClass = 'bg-black/40 border-medieval-800 opacity-60 grayscale cursor-not-allowed';
                                    else if (!isUnlocked) stateClass = 'bg-medieval-800 border-medieval-600 opacity-90 cursor-pointer hover:bg-medieval-700';
                                    else if (isEquipped) stateClass = 'bg-emerald-900/40 border-emerald-500 cursor-pointer';
                                    else stateClass = 'bg-medieval-800 border-medieval-600 hover:border-medieval-400 cursor-pointer';

                                    const handleClick = () => {
                                        if (!isLevelMet) return;
                                        if (!isUnlocked) unlockAbility(ability.id);
                                        else if (ability.type === AbilityType.ACTIVE) toggleAbility(ability.id);
                                    };
                                    
                                    return (
                                        <div key={ability.id} onClick={handleClick} className={`relative p-3 rounded border transition-all group ${stateClass}`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded flex items-center justify-center relative ${!isLevelMet ? 'bg-gray-900' : 'bg-medieval-700'}`}>
                                                    {!isLevelMet ? <Lock size={16} /> : renderAbilityIcon(ability.icon, 20, isEquipped ? 'text-emerald-300' : isUnlocked ? 'text-medieval-300' : 'text-gray-400')}
                                                    {isUnlocked && <span className="absolute -top-2 -right-2 bg-black text-[8px] border border-gray-600 rounded px-1">{currentLevel}/{maxLevel}</span>}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="text-sm font-bold text-medieval-200">{ability.name}</div>
                                                    <div className="text-[10px] text-medieval-400">Lvl {ability.requiredLevel} Req</div>
                                                </div>
                                                {isEquipped && <Check size={16} className="text-emerald-500" />}
                                                {!isUnlocked && isLevelMet && <PlusCircle size={16} className={character.skillPoints > 0 ? 'text-yellow-400 animate-pulse' : 'text-gray-500'} />}
                                                {isUnlocked && currentLevel < maxLevel && character.skillPoints > 0 && (
                                                        <button onClick={(e) => { e.stopPropagation(); unlockAbility(ability.id); }} className="text-yellow-400 hover:scale-110 transition-transform"><PlusCircle size={16} /></button>
                                                )}
                                            </div>
                                            <div className="absolute left-0 bottom-full mb-2 w-full bg-black border border-medieval-500 p-2 z-20 hidden group-hover:block pointer-events-none shadow-xl rounded text-left">
                                                <div className="text-xs text-yellow-500 font-bold">{ability.name}</div>
                                                <div className="text-[10px] text-gray-300 mb-1">{ability.description}</div>
                                                {ability.stats && <div className="border-t border-gray-800 pt-1 mt-1">{Object.entries(ability.stats).map(([k,v]) => <div key={k} className="text-[10px] text-green-400">+{v} {k}</div>)}</div>}
                                                <div className="text-[10px] text-gray-500 mt-1">CD: {ability.cooldown/1000}s | Cast: {ability.castTime ? ability.castTime/1000 + 's' : 'Instant'}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
         </div>
        );
    };

    const renderShop = (title: string, items: Item[]) => (
        <div className="flex-1 p-6 flex gap-6 overflow-hidden">
             <div className="w-1/4 flex flex-col gap-4">
                 <div className="bg-medieval-800 border-2 border-medieval-500 p-4 rounded text-center">
                     <Store size={48} className="mx-auto text-medieval-300 mb-2" />
                     <h2 className="text-2xl font-serif text-medieval-200">{title}</h2>
                     <p className="text-xs text-medieval-400">Best goods for miles.</p>
                 </div>
                 <div className="bg-medieval-900 border border-medieval-600 p-4 rounded text-center">
                     <div className="text-xs text-medieval-400">Your Gold</div>
                     <div className="text-xl font-bold text-yellow-500">{character.gold}</div>
                 </div>
                 <button onClick={() => setLocation('SQUARE')} className="mt-auto py-3 bg-medieval-800 hover:bg-medieval-700 border border-medieval-500 text-medieval-200 font-bold rounded flex items-center justify-center gap-2">
                    <Map size={18} /> Back to Town
                </button>
             </div>
             <div className="flex-1 flex gap-6">
                 <div className="flex-1 bg-medieval-800/80 border border-medieval-600 rounded p-4 flex flex-col">
                     <h3 className="text-center font-bold text-emerald-400 border-b border-medieval-600 pb-2 mb-4">Buy</h3>
                     <div className="grid grid-cols-2 gap-3 overflow-y-auto">
                        {items.map((item, i) => (
                             <InventoryItem 
                                key={i} 
                                item={item} 
                                onMouseEnter={(e) => handleMouseEnterItem(item, e)}
                                onMouseLeave={handleMouseLeaveItem}
                                onClick={(e) => handleItemClick(item, e, 'shop')} 
                                priceMult={2} 
                             />
                        ))}
                     </div>
                 </div>
                 <div className="flex-1 bg-medieval-800/80 border border-medieval-600 rounded p-4 flex flex-col">
                     <h3 className="text-center font-bold text-red-400 border-b border-medieval-600 pb-2 mb-4">Sell (Stash)</h3>
                     <div className="grid grid-cols-2 gap-3 overflow-y-auto">
                         {character.stash.map((item, i) => (
                             <InventoryItem 
                                key={i} 
                                item={item} 
                                onMouseEnter={(e) => handleMouseEnterItem(item, e)}
                                onMouseLeave={handleMouseLeaveItem}
                                onClick={(e) => handleItemClick(item, e, 'inventory')} 
                                priceMult={0.5} 
                             />
                         ))}
                         {character.stash.length === 0 && <div className="text-center text-medieval-500 text-xs col-span-2">Stash Empty</div>}
                     </div>
                 </div>
             </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-medieval-900 text-medieval-100 flex flex-col relative overflow-hidden" onClick={() => setInteractionMenu(null)}>
            {renderHeader()}
            {location === 'SQUARE' && renderTownSquare()}
            {location === 'TAVERN' && renderTavern()}
            {location === 'BLACKSMITH' && renderShop("Iron & Steel", blacksmithItems)}
            {location === 'IVORY_TOWER' && renderShop("Arcane Secrets", magicItems)}
            {location === 'APOTHECARY' && renderShop("The Apothecary", apothecaryItems)}

            {/* Hover Tooltip */}
            {hoveredItem && !interactionMenu && (
                <div 
                    className="fixed z-50 bg-black/95 border border-medieval-500 rounded p-3 shadow-2xl w-48 pointer-events-none"
                    style={{ top: hoveredItem.y, left: hoveredItem.x }}
                >
                    <div className={`text-sm font-bold ${hoveredItem.item.rarity === 'mythic' ? 'text-fuchsia-400' : hoveredItem.item.rarity === 'legendary' ? 'text-orange-400' : hoveredItem.item.rarity === 'rare' ? 'text-yellow-400' : hoveredItem.item.rarity === 'uncommon' ? 'text-blue-400' : 'text-white'}`}>
                        {hoveredItem.item.name}
                    </div>
                    <div className="text-[10px] text-gray-400 mb-2 uppercase">{hoveredItem.item.rarity} {hoveredItem.item.slot.replace('_', ' ')}</div>
                    
                    <div className="space-y-1 text-xs">
                        {hoveredItem.item.weaponType && <div>Type: <span className="text-white">{hoveredItem.item.weaponType}</span></div>}
                        {hoveredItem.item.offHandType && <div>Type: <span className="text-white">{hoveredItem.item.offHandType}</span></div>}
                        {hoveredItem.item.damage && <div>Damage: <span className="text-white">{hoveredItem.item.damage}</span></div>}
                        {hoveredItem.item.armor && <div>Armor: <span className="text-white">{hoveredItem.item.armor}</span></div>}
                        {hoveredItem.item.blockChance && <div>Block: <span className="text-white">{hoveredItem.item.blockChance}%</span></div>}
                        
                        {Object.entries(hoveredItem.item.stats).map(([k, v]) => (
                            <div key={k} className="text-green-400 flex justify-between">
                                <span>{k}</span><span>+{v}</span>
                            </div>
                        ))}
                        {hoveredItem.item.effect && <div className="text-yellow-300 italic mt-2 border-t border-gray-800 pt-1">{hoveredItem.item.effect}</div>}
                    </div>
                    <div className="mt-2 pt-1 border-t border-gray-700 text-right text-yellow-600 font-bold text-xs">
                        Val: {hoveredItem.item.value}g
                    </div>
                </div>
            )}

            {interactionMenu && (
                <div 
                    className="fixed z-50 bg-medieval-800 border-2 border-medieval-400 rounded shadow-2xl flex flex-col min-w-[200px] animate-in fade-in zoom-in duration-100"
                    style={{ top: interactionMenu.y, left: interactionMenu.x - 100 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="p-2 border-b border-medieval-600 bg-medieval-900 flex justify-between items-center">
                        <span className="font-bold text-sm text-medieval-200 truncate w-32">{interactionMenu.item.name}</span>
                        <button onClick={() => setInteractionMenu(null)}><X size={14} className="text-gray-500 hover:text-white"/></button>
                    </div>
                    
                    {interactionMenu.context === 'sell_confirm' ? (
                        <div className="p-2">
                            <div className="text-center text-sm text-medieval-300 mb-2">
                                Sell for <span className="text-yellow-400 font-bold">{Math.floor(interactionMenu.item.value * 0.5)}g</span>?
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => confirmSellItem(interactionMenu.item)} className="flex-1 py-1 bg-red-900 hover:bg-red-800 text-white rounded text-xs font-bold">Confirm</button>
                                <button onClick={() => setInteractionMenu(null)} className="flex-1 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs">Cancel</button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="p-2 text-[10px] text-medieval-400 space-y-1 border-b border-medieval-700 bg-medieval-900/50">
                                {interactionMenu.item.damage && <div>Dmg: <span className="text-white">{interactionMenu.item.damage}</span></div>}
                                {interactionMenu.item.armor && <div>Arm: <span className="text-white">{interactionMenu.item.armor}</span></div>}
                                {interactionMenu.item.blockChance && <div>Blk: <span className="text-white">{interactionMenu.item.blockChance}%</span></div>}
                                {Object.entries(interactionMenu.item.stats).map(([k, v]) => (
                                    <div key={k}>{k}: <span className="text-green-400">+{v}</span></div>
                                ))}
                            </div>

                            {interactionMenu.context === 'inventory' && (
                                <>
                                    <button onClick={() => equipItem(interactionMenu.item)} className="p-3 hover:bg-medieval-700 text-left text-sm flex gap-2"><Check size={16}/> Equip</button>
                                    {(interactionMenu.item.slot === ItemSlot.MAIN_HAND || interactionMenu.item.slot === ItemSlot.OFF_HAND || (interactionMenu.item.blockChance && interactionMenu.item.blockChance > 0)) && (
                                        <>
                                            <button onClick={() => equipItem(interactionMenu.item, ItemSlot.MAIN_HAND)} className="p-3 hover:bg-medieval-700 text-left text-sm flex gap-2 pl-6 text-xs text-medieval-300">To Main Hand</button>
                                            <button onClick={() => equipItem(interactionMenu.item, ItemSlot.OFF_HAND)} className="p-3 hover:bg-medieval-700 text-left text-sm flex gap-2 pl-6 text-xs text-medieval-300">To Off Hand</button>
                                        </>
                                    )}
                                    <button onClick={initiateSell} className="p-3 hover:bg-red-900/50 text-left text-sm text-red-300 flex gap-2"><Store size={16}/> Sell</button>
                                </>
                            )}

                            {interactionMenu.context === 'equipped' && (
                                <button onClick={() => unequipItem(interactionMenu.item.slot)} className="p-3 hover:bg-medieval-700 text-left text-sm flex gap-2"><Backpack size={16}/> Unequip</button>
                            )}

                            {interactionMenu.context === 'shop' && (
                                <button onClick={() => buyItem(interactionMenu.item)} className="p-3 hover:bg-green-900/50 text-left text-sm text-green-300 flex gap-2"><Store size={16}/> Buy</button>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

const InventoryItem: React.FC<{ item: Item, onClick: (e: React.MouseEvent) => void, onMouseEnter?: (e: React.MouseEvent) => void, onMouseLeave?: () => void, priceMult?: number }> = ({ item, onClick, onMouseEnter, onMouseLeave, priceMult }) => (
    <div 
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className={`p-2 rounded border cursor-pointer hover:scale-105 transition-transform relative group ${
            item.rarity === 'mythic' ? 'border-fuchsia-500 bg-fuchsia-900/20 shadow-[0_0_10px_rgba(217,70,239,0.3)]' :
            item.rarity === 'legendary' ? 'border-orange-500 bg-orange-900/20' : 
            item.rarity === 'rare' ? 'border-yellow-500 bg-yellow-900/20' : 
            item.rarity === 'uncommon' ? 'border-blue-500 bg-blue-900/20' : 'border-gray-600 bg-gray-800'
        }`}
    >
        <div className={`text-xs font-bold truncate ${item.rarity === 'mythic' ? 'text-fuchsia-300' : ''}`}>{item.name}</div>
        <div className="flex justify-between items-center mt-1">
            <span className="text-[10px] text-medieval-400 uppercase">{item.slot === 'main_hand' ? 'Main' : item.slot === 'off_hand' ? 'Off' : item.slot}</span>
            {priceMult && (
                <span className="text-[10px] font-bold text-yellow-500">{Math.floor(item.value * priceMult)}g</span>
            )}
        </div>
    </div>
);

const SlotIcon: React.FC<{ slot: ItemSlot, item?: Item, onClick: (item: Item, e: React.MouseEvent) => void, onMouseEnter?: (item: Item, e: React.MouseEvent) => void, onMouseLeave?: () => void, label?: string }> = ({ slot, item, onClick, onMouseEnter, onMouseLeave, label }) => {
    let Icon = Backpack;
    if (slot === ItemSlot.HEAD) Icon = User; 
    if (slot === ItemSlot.CHEST) Icon = Shirt;
    if (slot === ItemSlot.MAIN_HAND || slot === ItemSlot.OFF_HAND) Icon = Sword;
    if (slot === ItemSlot.RING1 || slot === ItemSlot.RING2 || slot === ItemSlot.NECK) Icon = Gem;
    if (slot === ItemSlot.LEGS) Icon = Activity;
    if (slot === ItemSlot.HANDS) Icon = Shield; 
    
    if (slot === ItemSlot.USABLE1 || slot === ItemSlot.USABLE2) Icon = FlaskConical;

    return (
        <div 
            onClick={(e) => item && onClick(item, e)}
            onMouseEnter={(e) => item && onMouseEnter && onMouseEnter(item, e)}
            onMouseLeave={onMouseLeave}
            className={`w-12 h-12 rounded border-2 flex items-center justify-center cursor-pointer relative group ${
                item 
                ? (item.rarity === 'mythic' ? 'bg-fuchsia-900 border-fuchsia-400 shadow-[0_0_10px_rgba(217,70,239,0.5)]' : 'bg-medieval-700 border-medieval-300') 
                : 'bg-medieval-900 border-medieval-700 border-dashed'
            }`}
        >
            {item ? (
                item.icon === 'Scroll' ? <Scroll size={20} className="text-white" /> :
                item.icon === 'FlaskConical' ? <FlaskConical size={20} className="text-white" /> :
                item.icon === 'Shield' ? <Shield size={20} className="text-white" /> :
                item.icon === 'Book' ? <Book size={20} className="text-white" /> :
                item.icon === 'Hammer' ? <Hammer size={20} className="text-white" /> :
                item.icon === 'Wand' ? <Wand size={20} className="text-white" /> :
                item.icon === 'Zap' ? <Zap size={20} className="text-white" /> :
                <span className={`text-[10px] text-center font-bold leading-tight ${item.rarity === 'mythic' ? 'text-fuchsia-200' : 'text-white'}`}>
                    {item.name.split(' ')[1] || item.name}
                </span>
            ) : (
                <Icon className="text-medieval-600" size={20} />
            )}
            <span className="absolute -bottom-4 text-[8px] text-medieval-500 uppercase w-max">{label || (slot === 'main_hand' ? 'Main' : slot === 'off_hand' ? 'Off' : slot)}</span>
        </div>
    );
};

export default Hub;
