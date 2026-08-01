// Shared item components and helpers used by Hub and its sub-components.

import React from 'react';
import { Item, ItemSlot } from '../../types';
import { Shirt, Gem, User, Activity, Backpack } from 'lucide-react';
import { GiBroadsword, GiShield, GiBubblingFlask } from 'react-icons/gi';
import type { IconType } from 'react-icons';
import { renderIcon } from '../../render/icons';

// Color helper for item name based on rarity.
export const rarityTextClass = (rarity: Item['rarity']): string => {
    switch (rarity) {
        case 'mythic': return 'text-fuchsia-400';
        case 'legendary': return 'text-orange-400';
        case 'rare': return 'text-yellow-400';
        case 'uncommon': return 'text-blue-400';
        default: return 'text-white';
    }
};

export const rarityBorderClass = (rarity: Item['rarity']): string => {
    switch (rarity) {
        case 'mythic': return 'border-fuchsia-500 bg-fuchsia-900/20 shadow-[0_0_10px_rgba(217,70,239,0.3)]';
        case 'legendary': return 'border-orange-500 bg-orange-900/20';
        case 'rare': return 'border-yellow-500 bg-yellow-900/20';
        case 'uncommon': return 'border-blue-500 bg-blue-900/20';
        default: return 'border-gray-600 bg-gray-800';
    }
};

// Map slot enum to a short display label.
export const slotLabel = (slot: ItemSlot): string => {
    if (slot === ItemSlot.MAIN_HAND) return 'Main';
    if (slot === ItemSlot.OFF_HAND) return 'Off';
    if (slot === ItemSlot.USABLE1) return 'Quick 1';
    if (slot === ItemSlot.USABLE2) return 'Quick 2';
    return slot;
};

interface InventoryItemProps {
    item: Item;
    onClick: (e: React.MouseEvent) => void;
    onMouseEnter?: (e: React.MouseEvent) => void;
    onMouseLeave?: () => void;
    priceMult?: number;
}

export const InventoryItem: React.FC<InventoryItemProps> = ({ item, onClick, onMouseEnter, onMouseLeave, priceMult }) => (
    <div
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className={`p-2 rounded border cursor-pointer hover:scale-105 transition-transform relative group ${rarityBorderClass(item.rarity)}`}
    >
        <div className={`text-xs font-bold truncate ${item.rarity === 'mythic' ? 'text-fuchsia-300' : ''}`}>{item.name}</div>
        <div className="flex justify-between items-center mt-1">
            <span className="text-[10px] text-medieval-400 uppercase">{slotLabel(item.slot)}</span>
            {priceMult && (
                <span className="text-[10px] font-bold text-yellow-500">{Math.floor(item.value * priceMult)}g</span>
            )}
        </div>
    </div>
);

interface SlotIconProps {
    slot: ItemSlot;
    item?: Item;
    onClick: (item: Item, e: React.MouseEvent) => void;
    onMouseEnter?: (item: Item, e: React.MouseEvent) => void;
    onMouseLeave?: () => void;
    label?: string;
}

export const SlotIcon: React.FC<SlotIconProps> = ({ slot, item, onClick, onMouseEnter, onMouseLeave, label }) => {
    // Default icon for empty slot, based on the slot itself.
    let DefaultIcon: IconType = Backpack;
    if (slot === ItemSlot.HEAD) DefaultIcon = User;
    if (slot === ItemSlot.CHEST) DefaultIcon = Shirt;
    if (slot === ItemSlot.MAIN_HAND || slot === ItemSlot.OFF_HAND) DefaultIcon = GiBroadsword;
    if (slot === ItemSlot.RING1 || slot === ItemSlot.RING2 || slot === ItemSlot.NECK) DefaultIcon = Gem;
    if (slot === ItemSlot.LEGS) DefaultIcon = Activity;
    if (slot === ItemSlot.HANDS) DefaultIcon = GiShield;
    if (slot === ItemSlot.USABLE1 || slot === ItemSlot.USABLE2) DefaultIcon = GiBubblingFlask;

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
                item.icon ? renderIcon(item.icon, 20, 'text-white') :
                <span className={`text-[10px] text-center font-bold leading-tight ${item.rarity === 'mythic' ? 'text-fuchsia-200' : 'text-white'}`}>
                    {item.name.split(' ')[1] || item.name}
                </span>
            ) : (
                <DefaultIcon className="text-medieval-600" size={20} />
            )}
            <span className="absolute -bottom-4 text-[8px] text-medieval-500 uppercase w-max">{label || slotLabel(slot)}</span>
        </div>
    );
};
