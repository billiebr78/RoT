// Right-click / click interaction menu for items (equip, sell, buy, unequip).

import React from 'react';
import { Item, ItemSlot } from '../../types';
import { Check, Backpack, X } from 'lucide-react';
import { GiShop } from 'react-icons/gi';

export type InteractionContext = 'inventory' | 'equipped' | 'shop' | 'sell_confirm';

interface Props {
    item: Item;
    x: number;
    y: number;
    context: InteractionContext;
    onClose: () => void;
    onEquip: (item: Item) => void;
    onEquipToSlot: (item: Item, slot: ItemSlot) => void;
    onUnequip: (slot: ItemSlot) => void;
    onBuy: (item: Item) => void;
    onSellInitiate: () => void;
    onSellConfirm: (item: Item) => void;
}

const ItemInteractionMenu: React.FC<Props> = ({
    item, x, y, context,
    onClose,
    onEquip, onEquipToSlot, onUnequip, onBuy, onSellInitiate, onSellConfirm,
}) => {
    return (
        <div
            className="fixed z-50 bg-medieval-800 border-2 border-medieval-400 rounded shadow-2xl flex flex-col min-w-[200px] animate-in fade-in zoom-in duration-100"
            style={{ top: y, left: x - 100 }}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="p-2 border-b border-medieval-600 bg-medieval-900 flex justify-between items-center">
                <span className="font-bold text-sm text-medieval-200 truncate w-32">{item.name}</span>
                <button onClick={onClose}><X size={14} className="text-gray-500 hover:text-white"/></button>
            </div>

            {context === 'sell_confirm' ? (
                <div className="p-2">
                    <div className="text-center text-sm text-medieval-300 mb-2">
                        Sell for <span className="text-yellow-400 font-bold">{Math.floor(item.value * 0.5)}g</span>?
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => onSellConfirm(item)} className="flex-1 py-1 bg-red-900 hover:bg-red-800 text-white rounded text-xs font-bold">Confirm</button>
                        <button onClick={onClose} className="flex-1 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs">Cancel</button>
                    </div>
                </div>
            ) : (
                <>
                    <div className="p-2 text-[10px] text-medieval-400 space-y-1 border-b border-medieval-700 bg-medieval-900/50">
                        {item.damage && <div>Dmg: <span className="text-white">{item.damage}</span></div>}
                        {item.armor && <div>Arm: <span className="text-white">{item.armor}</span></div>}
                        {item.blockChance && <div>Blk: <span className="text-white">{item.blockChance}%</span></div>}
                        {Object.entries(item.stats).map(([k, v]) => (
                            <div key={k}>{k}: <span className="text-green-400">+{v}</span></div>
                        ))}
                    </div>

                    {context === 'inventory' && (
                        <>
                            <button onClick={() => onEquip(item)} className="p-3 hover:bg-medieval-700 text-left text-sm flex gap-2"><Check size={16}/> Equip</button>
                            {(item.slot === ItemSlot.MAIN_HAND || item.slot === ItemSlot.OFF_HAND || (item.blockChance && item.blockChance > 0)) && (
                                <>
                                    <button onClick={() => onEquipToSlot(item, ItemSlot.MAIN_HAND)} className="p-3 hover:bg-medieval-700 text-left text-sm flex gap-2 pl-6 text-xs text-medieval-300">To Main Hand</button>
                                    <button onClick={() => onEquipToSlot(item, ItemSlot.OFF_HAND)} className="p-3 hover:bg-medieval-700 text-left text-sm flex gap-2 pl-6 text-xs text-medieval-300">To Off Hand</button>
                                </>
                            )}
                            <button onClick={onSellInitiate} className="p-3 hover:bg-red-900/50 text-left text-sm text-red-300 flex gap-2"><GiShop size={16}/> Sell</button>
                        </>
                    )}

                    {context === 'equipped' && (
                        <button onClick={() => onUnequip(item.slot)} className="p-3 hover:bg-medieval-700 text-left text-sm flex gap-2"><Backpack size={16}/> Unequip</button>
                    )}

                    {context === 'shop' && (
                        <button onClick={() => onBuy(item)} className="p-3 hover:bg-green-900/50 text-left text-sm text-green-300 flex gap-2"><GiShop size={16}/> Buy</button>
                    )}
                </>
            )}
        </div>
    );
};

export default ItemInteractionMenu;
