// Top header bar shown across all Hub locations.

import React from 'react';
import { Character, Attribute } from '../../types';
import { getExpForLevel, getHp } from '../../constants';
import { User, Heart } from 'lucide-react';

interface Props {
    character: Character;
    localHp: number;
    maxHp: number;
    showHealButton: boolean;
    onHeal: () => void;
    onLogout: () => void;
}

const HubHeader: React.FC<Props> = ({ character, localHp, maxHp, showHealButton, onHeal, onLogout }) => {
    const healCost = Math.ceil(maxHp - localHp);

    return (
        <header className="bg-medieval-800 border-b-2 border-medieval-600 p-2 sm:p-4 flex justify-between items-center shadow-lg shrink-0 gap-2">
            {/* Left: avatar + name + XP */}
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-medieval-600 rounded-full flex items-center justify-center border-2 border-medieval-400 shrink-0">
                    <User size={16} className="sm:hidden" />
                    <User size={24} className="hidden sm:block" />
                </div>
                <div className="min-w-0">
                    <h1 className="font-serif text-base sm:text-2xl text-medieval-200 truncate">{character.name}</h1>
                    <span className="text-xs sm:text-sm text-medieval-400">{character.classType} Lvl {character.level}</span>
                    <div className="w-20 sm:w-32 h-2 bg-black rounded mt-1 relative overflow-hidden border border-medieval-700">
                        <div
                            className="h-full bg-blue-600"
                            style={{ width: `${Math.min(100, (character.exp / getExpForLevel(character.level)) * 100)}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            {/* Right: HP + gold + logout */}
            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                <div className="text-right">
                    <div className="text-[10px] sm:text-xs text-medieval-400">Health</div>
                    <div className="font-bold text-sm sm:text-lg flex items-center justify-end gap-1 sm:gap-2">
                        <Heart size={14} className="text-red-500 sm:hidden" fill="currentColor"/>
                        <Heart size={16} className="text-red-500 hidden sm:block" fill="currentColor"/>
                        {Math.floor(localHp)}/{maxHp}
                    </div>
                </div>
                {showHealButton && localHp < maxHp && (
                    <button
                        onClick={onHeal}
                        className="px-1 sm:px-2 py-1 bg-green-900 border border-green-600 rounded hover:bg-green-800 flex flex-col items-center text-xs shrink-0"
                    >
                        <span className="font-bold text-white text-[10px] sm:text-xs">Heal</span>
                        <span className="text-yellow-400 text-[10px] sm:text-xs">{healCost}g</span>
                    </button>
                )}
                <div className="text-right">
                    <div className="text-yellow-500 font-bold text-sm sm:text-base">{character.gold}g</div>
                    <div className="text-[10px] sm:text-xs text-medieval-400">Stage {character.maxStage}</div>
                </div>
                <button onClick={onLogout} className="px-2 sm:px-3 py-1 bg-red-900/50 hover:bg-red-900 rounded border border-red-800 text-xs sm:text-sm shrink-0">Log Out</button>
            </div>
        </header>
    );
};

export default HubHeader;
