// Floating item tooltip shown when hovering over an item card/slot.

import React from 'react';
import { Item } from '../../types';
import { rarityTextClass } from './itemComponents';

interface Props {
    item: Item;
    x: number;
    y: number;
}

const ItemTooltip: React.FC<Props> = ({ item, x, y }) => {
    return (
        <div
            className="fixed z-50 bg-black/95 border border-medieval-500 rounded p-3 shadow-2xl w-48 pointer-events-none"
            style={{ top: y, left: x }}
        >
            <div className={`text-sm font-bold ${rarityTextClass(item.rarity)}`}>
                {item.name}
            </div>
            <div className="text-[10px] text-gray-400 mb-2 uppercase">{item.rarity} {item.slot.replace('_', ' ')}</div>

            <div className="space-y-1 text-xs">
                {item.weaponType && <div>Type: <span className="text-white">{item.weaponType}</span></div>}
                {item.offHandType && <div>Type: <span className="text-white">{item.offHandType}</span></div>}
                {item.damage && <div>Damage: <span className="text-white">{item.damage}</span></div>}
                {item.armor && <div>Armor: <span className="text-white">{item.armor}</span></div>}
                {item.blockChance && <div>Block: <span className="text-white">{item.blockChance}%</span></div>}

                {Object.entries(item.stats).map(([k, v]) => (
                    <div key={k} className="text-green-400 flex justify-between">
                        <span>{k}</span><span>+{v}</span>
                    </div>
                ))}
                {item.effect && <div className="text-yellow-300 italic mt-2 border-t border-gray-800 pt-1">{item.effect}</div>}
            </div>
            <div className="mt-2 pt-1 border-t border-gray-700 text-right text-yellow-600 font-bold text-xs">
                Val: {item.value}g
            </div>
        </div>
    );
};

export default ItemTooltip;
