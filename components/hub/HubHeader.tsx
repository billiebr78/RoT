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
                            style={{ width: `${Math.min(100, (character.exp / getExpForLevel(character.level)) * 100)}%` }}
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
                {showHealButton && localHp < maxHp && (
                    <button
                        onClick={onHeal}
                        className="px-2 py-1 bg-green-900 border border-green-600 rounded hover:bg-green-800 flex flex-col items-center text-xs"
                    >
                        <span className="font-bold text-white">Heal</span>
                        <span className="text-yellow-400">{healCost}g</span>
                    </button>
                )}
            </div>

            <div className="flex gap-4">
                <div className="text-right">
                    <div className="text-yellow-500 font-bold">{character.gold} Gold</div>
                    <div className="text-xs text-medieval-400">Stage {character.maxStage}</div>
                </div>
                <button onClick={onLogout} className="px-3 py-1 bg-red-900/50 hover:bg-red-900 rounded border border-red-800">Log Out</button>
            </div>
        </header>
    );
};

export default HubHeader;
