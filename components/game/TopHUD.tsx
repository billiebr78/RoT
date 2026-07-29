import React from 'react';
import { Character, Buff } from '../../types';
import { Shield, Heart, Ghost, Footprints, Scroll, ArrowLeft } from 'lucide-react';

interface Props {
    character: Character;
    stage: number;
    enemyName: string;
    enemyMaxHp: number;
    buffs: Buff[];
    playerHpBarRef: React.RefObject<HTMLDivElement>;
    playerHpTextRef: React.RefObject<HTMLSpanElement>;
    enemyHpBarRef: React.RefObject<HTMLDivElement>;
    enemyContainerRef: React.RefObject<HTMLDivElement>;
    onExit: () => void;
}

const TopHUD: React.FC<Props> = ({
    character, stage, enemyName, buffs,
    playerHpBarRef, playerHpTextRef,
    enemyHpBarRef, enemyContainerRef,
    onExit,
}) => {
    return (
        <div className="shrink-0 px-2 py-1.5 flex justify-between items-start gap-2 z-20 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none">
            {/* Player info (top-left) */}
            <div className="flex gap-1.5 items-start pointer-events-auto">
                <button
                    onClick={onExit}
                    className="shrink-0 bg-red-950/90 hover:bg-red-900 text-red-200 rounded border border-red-800 shadow-lg active:scale-90 transition-transform flex items-center justify-center"
                    style={{ width: 'clamp(32px, 8vmin, 44px)', height: 'clamp(32px, 8vmin, 44px)' }}
                    title="Retreat to Town"
                    aria-label="Retreat to Town"
                >
                    <ArrowLeft size={20} />
                </button>
                <div
                    className="bg-medieval-900/90 border border-medieval-500 rounded p-1 shadow-lg"
                    style={{ width: 'clamp(140px, 36vmin, 220px)' }}
                >
                    <div className="flex justify-between items-baseline mb-0.5 px-0.5">
                        <span className="font-bold truncate text-medieval-200" style={{ fontSize: 'clamp(10px, 2.6vmin, 14px)' }}>
                            {character.name}
                        </span>
                        <span className="text-medieval-400" style={{ fontSize: 'clamp(8px, 2vmin, 11px)' }}>
                            L{character.level}
                        </span>
                    </div>
                    <div
                        className="bg-black rounded border border-medieval-600 relative overflow-hidden"
                        style={{ height: 'clamp(7px, 2vmin, 12px)' }}
                    >
                        <div ref={playerHpBarRef} className="h-full bg-gradient-to-r from-red-700 to-red-500 transition-all duration-75" style={{width: '100%'}}></div>
                        <span ref={playerHpTextRef} className="absolute inset-0 flex items-center justify-center font-bold text-white drop-shadow-md" style={{ fontSize: 'clamp(7px, 1.9vmin, 10px)' }}></span>
                    </div>
                    <div className="flex gap-0.5 mt-1 flex-wrap">
                        {buffs.map((buff, i) => (
                            <div
                                key={i}
                                className="bg-gray-800 border border-gray-600 rounded flex items-center justify-center relative"
                                style={{ width: 'clamp(12px, 3vmin, 16px)', height: 'clamp(12px, 3vmin, 16px)' }}
                                title={buff.name}
                            >
                                {buff.icon === 'Shield' && <Shield size={9} className="text-cyan-400" />}
                                {buff.icon === 'Heart' && <Heart size={9} className="text-red-400" />}
                                {buff.icon === 'Ghost' && <Ghost size={9} className="text-white" />}
                                {buff.icon === 'Footprints' && <Footprints size={9} className="text-green-400" />}
                                {buff.icon === 'Scroll' && <Scroll size={9} className="text-yellow-400" />}
                                {buff.charges && (
                                    <span className="absolute -bottom-1 -right-1 bg-blue-600 rounded-full px-0.5 leading-tight font-bold" style={{ fontSize: '6px' }}>
                                        {buff.charges}
                                    </span>
                                )}
                                {buff.barrierHp !== undefined && (
                                    <span className="absolute -bottom-1 -right-1 bg-cyan-600 rounded-full px-0.5 leading-tight font-bold" style={{ fontSize: '6px' }}>
                                        {Math.ceil(buff.barrierHp)}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Enemy info (top-right) */}
            <div
                ref={enemyContainerRef}
                className="bg-medieval-900/90 border border-medieval-500 rounded p-1 shadow-lg transition-opacity duration-300 pointer-events-auto"
                style={{ width: 'clamp(140px, 36vmin, 220px)' }}
            >
                <div className="flex justify-between items-baseline mb-0.5 px-0.5">
                    <span className="font-bold truncate text-red-300" style={{ fontSize: 'clamp(10px, 2.6vmin, 14px)' }}>
                        {enemyName}
                    </span>
                    <span className="text-red-500" style={{ fontSize: 'clamp(8px, 2vmin, 11px)' }}>
                        S{stage}
                    </span>
                </div>
                <div
                    className="bg-black rounded border border-medieval-600 relative overflow-hidden"
                    style={{ height: 'clamp(7px, 2vmin, 12px)' }}
                >
                    <div ref={enemyHpBarRef} className="h-full bg-gradient-to-r from-purple-700 to-purple-500 transition-all duration-75" style={{width: '100%'}}></div>
                </div>
            </div>
        </div>
    );
};

export default TopHUD;
