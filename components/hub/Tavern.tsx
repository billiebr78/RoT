// Tavern — character management. Combines: attributes radar chart,
// equipment paper doll, stash grid, and ability tree.

import React from 'react';
import { Character, Item, ItemSlot, Attribute, AbilityTree, AbilityType, AbilityStyle } from '../../types';
import { ABILITY_DB } from '../../constants';
import {
    Backpack, Activity, PlusCircle, Lock, Check, Plus, Map,
} from 'lucide-react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { SlotIcon, InventoryItem } from './itemComponents';
import { renderIcon } from '../../render/icons';

interface Props {
    character: Character;
    activeTab: 'equipment' | 'abilities';
    abilityTreeTab: AbilityTree;
    totalStats: Record<Attribute, number>;
    onSetActiveTab: (tab: 'equipment' | 'abilities') => void;
    onSetAbilityTreeTab: (tree: AbilityTree) => void;
    onItemClick: (item: Item, e: React.MouseEvent, context: 'equipped' | 'inventory') => void;
    onItemHover: (item: Item, e: React.MouseEvent) => void;
    onItemLeave: () => void;
    onIncreaseAttribute: (attr: Attribute) => void;
    onUnlockAbility: (id: string) => void;
    onToggleAbility: (id: string) => void;
    onBack: () => void;
}

const Tavern: React.FC<Props> = ({
    character, activeTab, abilityTreeTab, totalStats,
    onSetActiveTab, onSetAbilityTreeTab,
    onItemClick, onItemHover, onItemLeave,
    onIncreaseAttribute, onUnlockAbility, onToggleAbility,
    onBack,
}) => {
    const chartData = [
        { subject: 'ST', A: totalStats.ST, fullMark: 20 },
        { subject: 'DX', A: totalStats.DX, fullMark: 20 },
        { subject: 'INT', A: totalStats.INT, fullMark: 20 },
        { subject: 'HT', A: totalStats.HT, fullMark: 20 },
        { subject: 'LCK', A: totalStats.LUCK, fullMark: 20 },
    ];

    const renderAttributes = () => (
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
                                onClick={() => onIncreaseAttribute(attr)}
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
    );

    const renderEquipmentPaperDoll = () => (
        <div className="flex-1 flex flex-col items-center gap-4">
            <h3 className="font-serif text-lg sm:text-xl text-medieval-300 border-b border-medieval-600 w-full text-center pb-2">Equipped</h3>
            <div className="relative w-48 sm:w-64 h-72 sm:h-96 bg-medieval-900 rounded-full border border-medieval-700 flex items-center justify-center shrink-0">
                <div className="absolute top-4 left-1/2 -translate-x-1/2">
                    <SlotIcon slot={ItemSlot.HEAD} item={character.equipment[ItemSlot.HEAD]}
                        onMouseEnter={onItemHover} onMouseLeave={onItemLeave}
                        onClick={(item, e) => onItemClick(item, e, 'equipped')} />
                </div>
                <div className="absolute top-20 left-1/2 -translate-x-1/2">
                    <SlotIcon slot={ItemSlot.NECK} item={character.equipment[ItemSlot.NECK]}
                        onMouseEnter={onItemHover} onMouseLeave={onItemLeave}
                        onClick={(item, e) => onItemClick(item, e, 'equipped')} />
                </div>
                <div className="absolute top-40 left-4">
                    <SlotIcon slot={ItemSlot.MAIN_HAND} item={character.equipment[ItemSlot.MAIN_HAND]} label="Main"
                        onMouseEnter={onItemHover} onMouseLeave={onItemLeave}
                        onClick={(item, e) => onItemClick(item, e, 'equipped')} />
                </div>
                <div className="absolute top-40 left-1/2 -translate-x-1/2">
                    <SlotIcon slot={ItemSlot.CHEST} item={character.equipment[ItemSlot.CHEST]}
                        onMouseEnter={onItemHover} onMouseLeave={onItemLeave}
                        onClick={(item, e) => onItemClick(item, e, 'equipped')} />
                </div>
                <div className="absolute top-40 right-4">
                    <SlotIcon slot={ItemSlot.OFF_HAND} item={character.equipment[ItemSlot.OFF_HAND]} label="Off"
                        onMouseEnter={onItemHover} onMouseLeave={onItemLeave}
                        onClick={(item, e) => onItemClick(item, e, 'equipped')} />
                </div>
                <div className="absolute bottom-24 left-12">
                    <SlotIcon slot={ItemSlot.HANDS} item={character.equipment[ItemSlot.HANDS]}
                        onMouseEnter={onItemHover} onMouseLeave={onItemLeave}
                        onClick={(item, e) => onItemClick(item, e, 'equipped')} />
                </div>
                <div className="absolute bottom-24 left-1/2 -translate-x-1/2">
                    <SlotIcon slot={ItemSlot.LEGS} item={character.equipment[ItemSlot.LEGS]}
                        onMouseEnter={onItemHover} onMouseLeave={onItemLeave}
                        onClick={(item, e) => onItemClick(item, e, 'equipped')} />
                </div>
                <div className="absolute bottom-24 right-12">
                    <SlotIcon slot={ItemSlot.RING1} item={character.equipment[ItemSlot.RING1]}
                        onMouseEnter={onItemHover} onMouseLeave={onItemLeave}
                        onClick={(item, e) => onItemClick(item, e, 'equipped')} />
                </div>
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2">
                    <SlotIcon slot={ItemSlot.RING2} item={character.equipment[ItemSlot.RING2]}
                        onMouseEnter={onItemHover} onMouseLeave={onItemLeave}
                        onClick={(item, e) => onItemClick(item, e, 'equipped')} />
                </div>
                <div className="absolute bottom-2 left-16">
                    <SlotIcon slot={ItemSlot.USABLE1} item={character.equipment[ItemSlot.USABLE1]} label="Quick 1"
                        onMouseEnter={onItemHover} onMouseLeave={onItemLeave}
                        onClick={(item, e) => onItemClick(item, e, 'equipped')} />
                </div>
                <div className="absolute bottom-2 right-16">
                    <SlotIcon slot={ItemSlot.USABLE2} item={character.equipment[ItemSlot.USABLE2]} label="Quick 2"
                        onMouseEnter={onItemHover} onMouseLeave={onItemLeave}
                        onClick={(item, e) => onItemClick(item, e, 'equipped')} />
                </div>
            </div>
        </div>
    );

    const renderStash = () => (
        <div className="flex-1 bg-medieval-900 rounded p-3 sm:p-4 border border-medieval-700 min-w-0">
            <h3 className="font-serif text-base sm:text-xl text-medieval-300 mb-3 sm:mb-4">Stash ({character.stash.length})</h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3 max-h-[300px] sm:max-h-[400px] overflow-y-auto">
                {character.stash.map((item, idx) => (
                    <InventoryItem
                        key={idx}
                        item={item}
                        onMouseEnter={(e) => onItemHover(item, e)}
                        onMouseLeave={onItemLeave}
                        onClick={(e) => onItemClick(item, e, 'inventory')}
                    />
                ))}
            </div>
        </div>
    );

    const renderAbilitiesTab = () => {
        const activeCount = character.equippedAbilities.filter(id => ABILITY_DB.find(a => a.id === id)?.type === AbilityType.ACTIVE).length;
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

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-4 sm:mb-6">
                    {[AbilityTree.MIGHT, AbilityTree.TACTICS, AbilityTree.MYSTICS].map(tree => (
                        <button
                            key={tree}
                            onClick={() => onSetAbilityTreeTab(tree)}
                            className={`flex-1 py-2 px-2 sm:px-4 rounded border-2 font-serif uppercase tracking-widest transition-all text-xs sm:text-base ${
                                abilityTreeTab === tree
                                ? 'bg-medieval-700 border-medieval-300 text-white shadow-lg'
                                : 'bg-medieval-900 border-medieval-700 text-medieval-500 hover:bg-medieval-800'
                            }`}
                        >
                            {tree}
                        </button>
                    ))}
                </div>

                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6 overflow-y-auto">
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
                                            if (!isUnlocked) onUnlockAbility(ability.id);
                                            else if (ability.type === AbilityType.ACTIVE) onToggleAbility(ability.id);
                                        };

                                        return (
                                            <div key={ability.id} onClick={handleClick} className={`relative p-3 rounded border transition-all group ${stateClass}`}>
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded flex items-center justify-center relative ${!isLevelMet ? 'bg-gray-900' : 'bg-medieval-700'}`}>
                                                        {!isLevelMet ? <Lock size={16} /> : renderIcon(ability.icon, 20, isEquipped ? 'text-emerald-300' : isUnlocked ? 'text-medieval-300' : 'text-gray-400')}
                                                        {isUnlocked && <span className="absolute -top-2 -right-2 bg-black text-[8px] border border-gray-600 rounded px-1">{currentLevel}/{maxLevel}</span>}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="text-sm font-bold text-medieval-200">{ability.name}</div>
                                                        <div className="text-[10px] text-medieval-400">Lvl {ability.requiredLevel} Req</div>
                                                    </div>
                                                    {isEquipped && <Check size={16} className="text-emerald-500" />}
                                                    {!isUnlocked && isLevelMet && <PlusCircle size={16} className={character.skillPoints > 0 ? 'text-yellow-400 animate-pulse' : 'text-gray-500'} />}
                                                    {isUnlocked && currentLevel < maxLevel && character.skillPoints > 0 && (
                                                        <button onClick={(e) => { e.stopPropagation(); onUnlockAbility(ability.id); }} className="text-yellow-400 hover:scale-110 transition-transform"><PlusCircle size={16} /></button>
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

    return (
        <div className="flex-1 p-3 sm:p-6 flex flex-col sm:flex-row gap-3 sm:gap-6 overflow-y-auto">
            <div className="flex sm:flex-col gap-3 sm:gap-6 sm:w-1/4 shrink-0">
                {renderAttributes()}

                <nav className="flex sm:flex-col gap-2 shrink-0">
                    <button onClick={() => onSetActiveTab('equipment')} className={`p-2 sm:p-3 text-left rounded border transition-all flex items-center gap-2 sm:gap-3 text-sm sm:text-base ${activeTab === 'equipment' ? 'bg-medieval-700 border-medieval-400 text-white' : 'bg-medieval-900 border-medieval-700 hover:bg-medieval-800'}`}>
                        <Backpack size={18} /> <span className="hidden sm:inline">Equipment</span>
                    </button>
                    <button onClick={() => onSetActiveTab('abilities')} className={`p-2 sm:p-3 text-left rounded border transition-all flex items-center gap-2 sm:gap-3 text-sm sm:text-base ${activeTab === 'abilities' ? 'bg-medieval-700 border-medieval-400 text-white' : 'bg-medieval-900 border-medieval-700 hover:bg-medieval-800'}`}>
                        <Activity size={18} /> <span className="hidden sm:inline">Abilities</span>
                        {character.skillPoints > 0 && <span className="bg-yellow-500 text-black text-[10px] px-1.5 rounded-full font-bold animate-bounce">{character.skillPoints}</span>}
                    </button>
                </nav>
                <button onClick={onBack} className="sm:mt-auto py-2 sm:py-3 px-2 sm:px-0 bg-medieval-800 hover:bg-medieval-700 border border-medieval-500 text-medieval-200 font-bold rounded flex items-center justify-center gap-2 text-sm shrink-0">
                    <Map size={16} /> <span className="hidden sm:inline">Back to Town</span><span className="sm:hidden">Back</span>
                </button>
            </div>

            <div className="flex-1 bg-medieval-800 rounded border-2 border-medieval-600 p-3 sm:p-6 overflow-y-auto relative min-h-[300px]">
                {activeTab === 'equipment' && (
                    <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 h-full">
                        {renderEquipmentPaperDoll()}
                        {renderStash()}
                    </div>
                )}
                {activeTab === 'abilities' && renderAbilitiesTab()}
            </div>
        </div>
    );
};

export default Tavern;
