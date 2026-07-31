// Town Square — landing screen with 4 location buttons + "Journey Onward".

import React from 'react';
import { Beer, Hammer, Scroll, FlaskConical, ArrowRight, Map } from 'lucide-react';

interface Props {
    onGoTavern: () => void;
    onGoBlacksmith: () => void;
    onGoIvoryTower: () => void;
    onGoApothecary: () => void;
    onJourney: () => void;
}

const TownSquare: React.FC<Props> = ({ onGoTavern, onGoBlacksmith, onGoIvoryTower, onGoApothecary, onJourney }) => {
    return (
        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 bg-gradient-to-b from-gray-900 to-black relative overflow-auto">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-medieval-500 via-transparent to-transparent"></div>
            <h2 className="text-2xl sm:text-4xl font-serif text-medieval-300 mb-6 sm:mb-12 relative z-10">Town Square</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 relative z-10 w-full max-w-4xl">
                <button onClick={onGoTavern} className="h-28 sm:h-40 bg-medieval-800/80 hover:bg-medieval-700 border-2 border-medieval-500 rounded-lg flex flex-col items-center justify-center gap-2 sm:gap-4 transition-all hover:scale-105 group">
                    <Beer size={32} className="text-yellow-600 group-hover:text-yellow-400 sm:hidden" />
                    <Beer size={48} className="text-yellow-600 group-hover:text-yellow-400 hidden sm:block" />
                    <span className="text-lg sm:text-2xl font-bold text-medieval-200">The Tavern</span>
                    <span className="text-xs sm:text-sm text-medieval-400">Manage Character</span>
                </button>
                <button onClick={onGoBlacksmith} className="h-28 sm:h-40 bg-medieval-800/80 hover:bg-medieval-700 border-2 border-medieval-500 rounded-lg flex flex-col items-center justify-center gap-2 sm:gap-4 transition-all hover:scale-105 group">
                    <Hammer size={32} className="text-gray-400 group-hover:text-gray-200 sm:hidden" />
                    <Hammer size={48} className="text-gray-400 group-hover:text-gray-200 hidden sm:block" />
                    <span className="text-lg sm:text-2xl font-bold text-medieval-200">Blacksmith</span>
                    <span className="text-xs sm:text-sm text-medieval-400">Weapons & Armor</span>
                </button>
                <button onClick={onGoIvoryTower} className="h-28 sm:h-40 bg-medieval-800/80 hover:bg-medieval-700 border-2 border-medieval-500 rounded-lg flex flex-col items-center justify-center gap-2 sm:gap-4 transition-all hover:scale-105 group">
                    <Scroll size={32} className="text-blue-400 group-hover:text-blue-200 sm:hidden" />
                    <Scroll size={48} className="text-blue-400 group-hover:text-blue-200 hidden sm:block" />
                    <span className="text-lg sm:text-2xl font-bold text-medieval-200">Ivory Tower</span>
                    <span className="text-xs sm:text-sm text-medieval-400">Magic Goods</span>
                </button>
                <button onClick={onGoApothecary} className="h-28 sm:h-40 bg-medieval-800/80 hover:bg-medieval-700 border-2 border-medieval-500 rounded-lg flex flex-col items-center justify-center gap-2 sm:gap-4 transition-all hover:scale-105 group">
                    <FlaskConical size={32} className="text-red-400 group-hover:text-red-200 sm:hidden" />
                    <FlaskConical size={48} className="text-red-400 group-hover:text-red-200 hidden sm:block" />
                    <span className="text-lg sm:text-2xl font-bold text-medieval-200">Apothecary</span>
                    <span className="text-xs sm:text-sm text-medieval-400">Potions</span>
                </button>
            </div>
            <button
                onClick={onJourney}
                className="mt-6 sm:mt-12 px-6 sm:px-12 py-3 sm:py-6 bg-emerald-900 hover:bg-emerald-800 border-2 border-emerald-500 text-white font-bold text-base sm:text-2xl rounded-lg shadow-2xl flex items-center gap-2 sm:gap-4 animate-pulse relative z-10"
            >
                Journey Onward <ArrowRight />
            </button>
        </div>
    );
};

export default TownSquare;
