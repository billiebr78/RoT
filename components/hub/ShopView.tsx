// Shop view — buy on the left, sell (stash) on the right. Used by
// Blacksmith, Ivory Tower, and Apothecary with different titles + items.

import React from 'react';
import { Item } from '../../types';
import { Store, Map } from 'lucide-react';
import { InventoryItem } from './itemComponents';

interface Props {
    title: string;
    gold: number;
    items: Item[];
    stash: Item[];
    onItemClick: (item: Item, e: React.MouseEvent, context: 'shop' | 'inventory') => void;
    onItemHover: (item: Item, e: React.MouseEvent) => void;
    onItemLeave: () => void;
    onBack: () => void;
}

const ShopView: React.FC<Props> = ({ title, gold, items, stash, onItemClick, onItemHover, onItemLeave, onBack }) => {
    return (
        <div className="flex-1 p-6 flex gap-6 overflow-hidden">
            <div className="w-1/4 flex flex-col gap-4">
                <div className="bg-medieval-800 border-2 border-medieval-500 p-4 rounded text-center">
                    <Store size={48} className="mx-auto text-medieval-300 mb-2" />
                    <h2 className="text-2xl font-serif text-medieval-200">{title}</h2>
                    <p className="text-xs text-medieval-400">Best goods for miles.</p>
                </div>
                <div className="bg-medieval-900 border border-medieval-600 p-4 rounded text-center">
                    <div className="text-xs text-medieval-400">Your Gold</div>
                    <div className="text-xl font-bold text-yellow-500">{gold}</div>
                </div>
                <button onClick={onBack} className="mt-auto py-3 bg-medieval-800 hover:bg-medieval-700 border border-medieval-500 text-medieval-200 font-bold rounded flex items-center justify-center gap-2">
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
                                onMouseEnter={(e) => onItemHover(item, e)}
                                onMouseLeave={onItemLeave}
                                onClick={(e) => onItemClick(item, e, 'shop')}
                                priceMult={2}
                            />
                        ))}
                    </div>
                </div>
                <div className="flex-1 bg-medieval-800/80 border border-medieval-600 rounded p-4 flex flex-col">
                    <h3 className="text-center font-bold text-red-400 border-b border-medieval-600 pb-2 mb-4">Sell (Stash)</h3>
                    <div className="grid grid-cols-2 gap-3 overflow-y-auto">
                        {stash.map((item, i) => (
                            <InventoryItem
                                key={i}
                                item={item}
                                onMouseEnter={(e) => onItemHover(item, e)}
                                onMouseLeave={onItemLeave}
                                onClick={(e) => onItemClick(item, e, 'inventory')}
                                priceMult={0.5}
                            />
                        ))}
                        {stash.length === 0 && <div className="text-center text-medieval-500 text-xs col-span-2">Stash Empty</div>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ShopView;
