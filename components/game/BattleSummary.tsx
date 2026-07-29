import React from 'react';
import { Item } from '../../types';
import { Trophy, Map, ChevronsRight } from 'lucide-react';

interface BattleSummaryData {
    show: boolean;
    exp: number;
    gold: number;
    drops: Item[];
    isLevelUp?: boolean;
}

interface Props {
    summary: BattleSummaryData | null;
    onExit: () => void;
    onContinue: () => void;
}

const BattleSummary: React.FC<Props> = ({ summary, onExit, onContinue }) => {
    if (!summary) return null;

    return (
        <div className="absolute inset-0 bg-black/85 flex items-center justify-center z-50 p-3 animate-in fade-in duration-300">
            <div
                className="bg-medieval-800 border-4 border-medieval-500 rounded-lg shadow-2xl text-center relative overflow-hidden"
                style={{ width: 'min(92%, 380px)', padding: 'clamp(16px, 4vmin, 32px)' }}
            >
                {/* Level up glow background — a radial gradient behind the content,
                    NOT a separate text element. This keeps the visual effect
                    aligned with the content flow. */}
                {summary.isLevelUp && (
                    <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            background: 'radial-gradient(circle at center, rgba(250,204,21,0.15) 0%, transparent 70%)',
                            animation: 'pulse 2s ease-in-out infinite',
                        }}
                    />
                )}

                <Trophy className="text-yellow-500 mx-auto mb-3 relative z-10" style={{ width: 'clamp(36px, 9vmin, 56px)', height: 'clamp(36px, 9vmin, 56px)' }} />
                <h2 className="font-serif text-white mb-2 relative z-10" style={{ fontSize: 'clamp(18px, 4.5vmin, 26px)' }}>
                    Victory!
                </h2>

                {/* Single "LEVEL UP!" text — part of the normal flow, with bounce.
                    No separate ping overlay that could misalign. */}
                {summary.isLevelUp && (
                    <div
                        className="text-yellow-300 font-black mb-3 animate-bounce relative z-10"
                        style={{
                            fontSize: 'clamp(18px, 4.5vmin, 26px)',
                            textShadow: '0 0 12px rgba(250,204,21,0.6)',
                        }}
                    >
                        LEVEL UP!
                    </div>
                )}

                <div className="space-y-1.5 mb-5 text-left bg-medieval-900 p-3 rounded relative z-10">
                    <div className="flex justify-between" style={{ fontSize: 'clamp(11px, 2.8vmin, 14px)' }}>
                        <span className="text-medieval-300">Exp</span>
                        <span className="text-white">+{summary.exp}</span>
                    </div>
                    <div className="flex justify-between" style={{ fontSize: 'clamp(11px, 2.8vmin, 14px)' }}>
                        <span className="text-medieval-300">Gold</span>
                        <span className="text-yellow-400">+{summary.gold}</span>
                    </div>
                    {summary.drops.length > 0 && (
                        <div className="mt-2 border-t border-medieval-700 pt-2">
                            <span className="text-medieval-400 block mb-1" style={{ fontSize: 'clamp(9px, 2.3vmin, 11px)' }}>Loot:</span>
                            {summary.drops.map((d, i) => (
                                <div key={i} className={`font-bold ${d.rarity === 'mythic' ? 'text-fuchsia-400' : d.rarity === 'legendary' ? 'text-orange-400' : 'text-white'}`} style={{ fontSize: 'clamp(11px, 2.8vmin, 14px)' }}>
                                    {d.name}
                                </div>
                            ))}
                        </div>
                    )}
                    {summary.isLevelUp && (
                        <div className="mt-2 border-t border-medieval-700 pt-2 text-emerald-400 text-center" style={{ fontSize: 'clamp(9px, 2.3vmin, 11px)' }}>
                            HP restored on level up!
                        </div>
                    )}
                </div>

                <div className="flex gap-2 relative z-10">
                    <button
                        onClick={onExit}
                        className="flex-1 py-2 bg-medieval-700 hover:bg-medieval-600 text-white font-bold rounded flex items-center justify-center gap-1.5 border border-medieval-500 active:scale-95 transition-transform"
                        style={{ fontSize: 'clamp(12px, 3vmin, 15px)' }}
                    >
                        <Map size={16} /> Town [J]
                    </button>
                    <button
                        onClick={onContinue}
                        className="flex-1 py-2 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded flex items-center justify-center gap-1.5 border border-emerald-600 active:scale-95 transition-transform"
                        style={{ fontSize: 'clamp(12px, 3vmin, 15px)' }}
                    >
                        Next [H] <ChevronsRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BattleSummary;
