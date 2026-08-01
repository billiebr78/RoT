import React, { useEffect } from 'react';
import { Item } from '../../types';
import { Trophy, Bed, ChevronsRight, Footprints, AlertTriangle } from 'lucide-react';

interface BattleSummaryData {
    show: boolean;
    exp: number;
    gold: number;
    drops: Item[];
    isLevelUp?: boolean;
    outcome?: 'victory' | 'enemyFled' | 'playerFled';
    xpPenalty?: number;
}

interface Props {
    summary: BattleSummaryData | null;
    onRest: () => void;
    onContinue: () => void;
    restHealAmount: number;
}

const BattleSummary: React.FC<Props> = ({ summary, onRest, onContinue, restHealAmount }) => {
    const outcome = summary?.outcome || 'victory';
    const showButtons = summary && outcome !== 'playerFled';

    // Keyboard: H = Rest, J = Journey Onward (or Map if fled)
    useEffect(() => {
        if (!summary) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.code === 'KeyH' && showButtons) {
                e.preventDefault();
                onRest();
            } else if (e.code === 'KeyJ' || e.code === 'Enter') {
                e.preventDefault();
                onContinue();
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [summary, showButtons, onRest, onContinue]);

    if (!summary) return null;

    let icon: React.ReactNode;
    let title: string;
    let titleColor: string;
    let subtitle: React.ReactNode = null;
    let showRewards = true;

    if (outcome === 'victory') {
        icon = <Trophy className="text-yellow-500 mx-auto mb-3 relative z-10" style={{ width: 'clamp(36px, 9vmin, 56px)', height: 'clamp(36px, 9vmin, 56px)' }} />;
        title = 'Victory!';
        titleColor = 'text-white';
    } else if (outcome === 'enemyFled') {
        icon = <Footprints className="text-orange-500 mx-auto mb-3 relative z-10" style={{ width: 'clamp(36px, 9vmin, 56px)', height: 'clamp(36px, 9vmin, 56px)' }} />;
        title = 'Enemy Escaped!';
        titleColor = 'text-orange-300';
        subtitle = (
            <div className="text-orange-200 mb-3 relative z-10" style={{ fontSize: 'clamp(11px, 2.8vmin, 14px)' }}>
                The enemy fled the battle. No rewards earned.
            </div>
        );
        showRewards = false;
    } else {
        icon = <Footprints className="text-blue-400 mx-auto mb-3 relative z-10" style={{ width: 'clamp(36px, 9vmin, 56px)', height: 'clamp(36px, 9vmin, 56px)' }} />;
        title = 'You Escaped';
        titleColor = 'text-blue-200';
        subtitle = (
            <div className="space-y-2 mb-3 relative z-10">
                <div className="text-blue-200 italic" style={{ fontSize: 'clamp(12px, 3vmin, 15px)' }}>
                    "You ran to fight another day."
                </div>
                {summary.xpPenalty !== undefined && summary.xpPenalty > 0 && (
                    <div className="flex items-center justify-center gap-1.5 text-red-300" style={{ fontSize: 'clamp(11px, 2.8vmin, 14px)' }}>
                        <AlertTriangle size={14} />
                        XP penalty: -{summary.xpPenalty}
                    </div>
                )}
                {summary.xpPenalty === 0 && (
                    <div className="text-cyan-300 text-center" style={{ fontSize: 'clamp(11px, 2.8vmin, 14px)' }}>
                        Bravery spent — no XP penalty
                    </div>
                )}
            </div>
        );
        showRewards = false;
    }

    return (
        <div className="absolute inset-0 bg-black/85 flex items-center justify-center z-50 p-3 animate-in fade-in duration-300">
            <div
                className="bg-medieval-800 border-4 border-medieval-500 rounded-lg shadow-2xl text-center relative overflow-hidden"
                style={{ width: 'min(92%, 380px)', padding: 'clamp(16px, 4vmin, 32px)' }}
            >
                {outcome === 'victory' && summary.isLevelUp && (
                    <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            background: 'radial-gradient(circle at center, rgba(250,204,21,0.15) 0%, transparent 70%)',
                            animation: 'pulse 2s ease-in-out infinite',
                        }}
                    />
                )}

                {icon}
                <h2 className={`font-serif mb-2 relative z-10 ${titleColor}`} style={{ fontSize: 'clamp(18px, 4.5vmin, 26px)' }}>
                    {title}
                </h2>

                {outcome === 'victory' && summary.isLevelUp && (
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

                {subtitle}

                {showRewards && (
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
                )}

                {!showRewards && <div className="mb-5 relative z-10" />}

                {/* Player fled: only "Map" button */}
                {!showButtons && (
                    <div className="relative z-10">
                        <button
                            onClick={onContinue}
                            className="w-full py-2 bg-medieval-700 hover:bg-medieval-600 text-white font-bold rounded flex items-center justify-center gap-1.5 border border-medieval-500 active:scale-95 transition-transform"
                            style={{ fontSize: 'clamp(12px, 3vmin, 15px)' }}
                        >
                            <ChevronsRight size={16} /> Map [J]
                        </button>
                    </div>
                )}

                {/* Victory/enemyFled: Rest + Journey Onward */}
                {showButtons && (
                    <div className="flex gap-2 relative z-10">
                        <button
                            onClick={onRest}
                            className="flex-1 py-2 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded flex flex-col items-center justify-center gap-0.5 border border-blue-600 active:scale-95 transition-transform"
                            style={{ fontSize: 'clamp(12px, 3vmin, 15px)' }}
                        >
                            <Bed size={16} />
                            <span>Rest [H]</span>
                            <span className="text-blue-300" style={{ fontSize: 'clamp(8px, 2vmin, 10px)' }}>+{restHealAmount} HP (5 turns)</span>
                        </button>
                        <button
                            onClick={onContinue}
                            className="flex-1 py-2 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded flex items-center justify-center gap-1.5 border border-emerald-600 active:scale-95 transition-transform"
                            style={{ fontSize: 'clamp(12px, 3vmin, 15px)' }}
                        >
                            Journey Onward [J] <ChevronsRight size={16} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BattleSummary;
