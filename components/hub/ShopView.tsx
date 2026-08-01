// Shop view — buy on the left, sell (stash) on the right. Used by
// Blacksmith, Ivory Tower, and Apothecary with different titles + items.

import React from 'react';
import { Item } from '../../types';
import { Map } from 'lucide-react';
import { GiShop } from 'react-icons/gi';
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
        <div className="flex-1 p-3 sm:p-6 flex flex-col sm:flex-row gap-3 sm:gap-6 overflow-y-auto">
            <div className="flex sm:flex-col gap-3 sm:gap-4 sm:w-1/4 shrink-0">
                <div className="bg-medieval-800 border-2 border-medieval-500 p-3 sm:p-4 rounded text-center flex-1 sm:flex-none">
                    <GiShop size={32} className="mx-auto text-medieval-300 mb-1 sm:mb-2 sm:hidden" />
                    <GiShop size={48} className="mx-auto text-medieval-300 mb-2 hidden sm:block" />
                    <h2 className="text-lg sm:text-2xl font-serif text-medieval-200">{title}</h2>
                    <p className="text-xs text-medieval-400 hidden sm:block">Best goods for miles.</p>
                </div>
                <div className="bg-medieval-900 border border-medieval-600 p-2 sm:p-4 rounded text-center flex-1 sm:flex-none">
                    <div className="text-[10px] sm:text-xs text-medieval-400">Gold</div>
                    <div className="text-base sm:text-xl font-bold text-yellow-500">{gold}</div>
                </div>
                <button onClick={onBack} className="py-2 sm:py-3 px-3 bg-medieval-800 hover:bg-medieval-700 border border-medieval-500 text-medieval-200 font-bold rounded flex items-center justify-center gap-2 text-sm shrink-0">
                    <Map size={16} /> <span className="hidden sm:inline">Back to Town</span><span className="sm:hidden">Back</span>
                </button>
            </div>
            <div className="flex-1 flex flex-col sm:flex-row gap-3 sm:gap-6 min-h-0">
                <div className="flex-1 bg-medieval-800/80 border border-medieval-600 rounded p-3 sm:p-4 flex flex-col min-w-0">
                    <h3 className="text-center font-bold text-emerald-400 border-b border-medieval-600 pb-2 mb-3 sm:mb-4 text-sm sm:text-base">Buy</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-2 gap-2 sm:gap-3 overflow-y-auto">
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
                <div className="flex-1 bg-medieval-800/80 border border-medieval-600 rounded p-3 sm:p-4 flex flex-col min-w-0">
                    <h3 className="text-center font-bold text-red-400 border-b border-medieval-600 pb-2 mb-3 sm:mb-4 text-sm sm:text-base">Sell (Stash)</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-2 gap-2 sm:gap-3 overflow-y-auto">
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
