import React from 'react';
import { Item, ItemSlot, Character, Buff } from '../../types';
import { ABILITY_DB } from '../../constants';
import { Sword, ChevronLeft, ChevronRight, FlaskConical, Scroll, HelpCircle, Lock, Shield, Heart, Ghost, Footprints } from 'lucide-react';
import { renderIcon } from '../../render/icons';

interface Props {
    character: Character;
    enemyName: string;
    enemyMaxHp: number;
    buffs: Buff[];
    equippedUsable1?: Item;
    equippedUsable2?: Item;
    activeAbilities: string[];
    cooldownRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
    playerHpBarRef: React.RefObject<HTMLDivElement>;
    playerHpTextRef: React.RefObject<HTMLSpanElement>;
    enemyHpBarRef: React.RefObject<HTMLDivElement>;
    enemyContainerRef: React.RefObject<HTMLDivElement>;
    onMoveLeft: (pressed: boolean) => void;
    onMoveRight: (pressed: boolean) => void;
    onAttack: () => void;
    onAbility: (id: string) => void;
    onUseItem: (slot: ItemSlot.USABLE1 | ItemSlot.USABLE2) => void;
}

const BottomControls: React.FC<Props> = ({
    character, enemyName, enemyMaxHp, buffs,
    equippedUsable1, equippedUsable2, activeAbilities,
    cooldownRefs,
    playerHpBarRef, playerHpTextRef,
    enemyHpBarRef, enemyContainerRef,
    onMoveLeft, onMoveRight, onAttack, onAbility, onUseItem,
}) => {
    return (
        <div className="shrink-0 px-2 py-1.5 flex justify-between items-end gap-1 sm:gap-2 z-20 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
            {/* Movement (left) */}
            <div className="flex gap-1 sm:gap-2 shrink-0">
                <button
                    onPointerDown={(e) => { e.preventDefault(); onMoveLeft(true); }}
                    onPointerUp={() => onMoveLeft(false)}
                    onPointerLeave={() => onMoveLeft(false)}
                    onPointerCancel={() => onMoveLeft(false)}
                    className="bg-medieval-700/90 border-2 border-medieval-500 rounded-full flex items-center justify-center active:bg-medieval-600 active:scale-90 transition-transform shadow-lg touch-none"
                    style={{ width: 'clamp(44px, 11vmin, 64px)', height: 'clamp(44px, 11vmin, 64px)' }}
                    aria-label="Move Left"
                >
                    <ChevronLeft size={28} className="text-medieval-300" />
                </button>
                <button
                    onPointerDown={(e) => { e.preventDefault(); onMoveRight(true); }}
                    onPointerUp={() => onMoveRight(false)}
                    onPointerLeave={() => onMoveRight(false)}
                    onPointerCancel={() => onMoveRight(false)}
                    className="bg-medieval-700/90 border-2 border-medieval-500 rounded-full flex items-center justify-center active:bg-medieval-600 active:scale-90 transition-transform shadow-lg touch-none"
                    style={{ width: 'clamp(44px, 11vmin, 64px)', height: 'clamp(44px, 11vmin, 64px)' }}
                    aria-label="Move Right"
                >
                    <ChevronRight size={28} className="text-medieval-300" />
                </button>
            </div>

            {/* Center: Player (left) + Enemy (right) info side by side */}
            <div className="flex-1 flex gap-1 sm:gap-2 min-w-0 max-w-lg items-end">
                {/* Player info (left) */}
                <div className="flex-1 bg-medieval-900/90 border border-medieval-500 rounded p-1 shadow-lg min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5 px-0.5">
                        <span className="font-bold truncate text-medieval-200" style={{ fontSize: 'clamp(9px, 2.2vmin, 12px)' }}>
                            {character.name}
                        </span>
                        <span className="text-medieval-400 shrink-0" style={{ fontSize: 'clamp(8px, 1.8vmin, 10px)' }}>
                            L{character.level}
                        </span>
                    </div>
                    <div
                        className="bg-black rounded border border-medieval-600 relative overflow-hidden"
                        style={{ height: 'clamp(6px, 1.8vmin, 10px)' }}
                    >
                        <div ref={playerHpBarRef} className="h-full bg-gradient-to-r from-red-700 to-red-500 transition-all duration-75" style={{width: '100%'}}></div>
                        <span ref={playerHpTextRef} className="absolute inset-0 flex items-center justify-center font-bold text-white drop-shadow-md" style={{ fontSize: 'clamp(7px, 1.6vmin, 9px)' }}></span>
                    </div>
                    <div className="flex gap-0.5 mt-0.5 flex-wrap">
                        {buffs.map((buff, i) => (
                            <div
                                key={i}
                                className="bg-gray-800 border border-gray-600 rounded flex items-center justify-center relative"
                                style={{ width: 'clamp(10px, 2.5vmin, 14px)', height: 'clamp(10px, 2.5vmin, 14px)' }}
                                title={buff.name}
                            >
                                {buff.icon === 'Shield' && <Shield size={8} className="text-cyan-400" />}
                                {buff.icon === 'Heart' && <Heart size={8} className="text-red-400" />}
                                {buff.icon === 'Ghost' && <Ghost size={8} className="text-white" />}
                                {buff.icon === 'Footprints' && <Footprints size={8} className="text-green-400" />}
                                {buff.icon === 'Scroll' && <Scroll size={8} className="text-yellow-400" />}
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

                {/* Enemy info (right) */}
                <div
                    ref={enemyContainerRef}
                    className="flex-1 bg-medieval-900/90 border border-medieval-500 rounded p-1 shadow-lg transition-opacity duration-300 min-w-0"
                >
                    <div className="flex justify-between items-baseline mb-0.5 px-0.5">
                        <span className="font-bold truncate text-red-300" style={{ fontSize: 'clamp(9px, 2.2vmin, 12px)' }}>
                            {enemyName}
                        </span>
                    </div>
                    <div
                        className="bg-black rounded border border-medieval-600 relative overflow-hidden"
                        style={{ height: 'clamp(6px, 1.8vmin, 10px)' }}
                    >
                        <div ref={enemyHpBarRef} className="h-full bg-gradient-to-r from-purple-700 to-purple-500 transition-all duration-75" style={{width: '100%'}}></div>
                    </div>
                </div>
            </div>

            {/* Actions (right): items, abilities, attack */}
            <div className="flex gap-1 sm:gap-2 items-end shrink-0">
                {/* Usable items */}
                <div className="flex flex-col gap-1">
                    <button
                        id="btn-u1"
                        onClick={() => onUseItem(ItemSlot.USABLE1)}
                        className={`relative border rounded flex items-center justify-center active:scale-90 transition-transform touch-none ${equippedUsable1 ? 'bg-medieval-600/90 border-medieval-400' : 'bg-gray-800/90 border-gray-600 opacity-50'}`}
                        style={{ width: 'clamp(30px, 8vmin, 40px)', height: 'clamp(30px, 8vmin, 40px)' }}
                        aria-label="Use Item 1"
                    >
                        {equippedUsable1 ? (
                            equippedUsable1.icon === 'FlaskConical' ? <FlaskConical size={16} className="text-red-400" /> : <Scroll size={16} className="text-blue-400" />
                        ) : <HelpCircle size={16} className="text-gray-500" />}
                        <span className="absolute top-0 left-0 text-gray-400 bg-black/80 rounded font-bold" style={{ fontSize: '8px', padding: '1px 3px' }}>U</span>
                        <div ref={el => { if (el) cooldownRefs.current['usable1'] = el }} className="absolute bottom-0 left-0 right-0 bg-black/80" style={{ height: '0%', opacity: 0 }}></div>
                    </button>
                    <button
                        id="btn-u2"
                        onClick={() => onUseItem(ItemSlot.USABLE2)}
                        className={`relative border rounded flex items-center justify-center active:scale-90 transition-transform touch-none ${equippedUsable2 ? 'bg-medieval-600/90 border-medieval-400' : 'bg-gray-800/90 border-gray-600 opacity-50'}`}
                        style={{ width: 'clamp(30px, 8vmin, 40px)', height: 'clamp(30px, 8vmin, 40px)' }}
                        aria-label="Use Item 2"
                    >
                        {equippedUsable2 ? (
                            equippedUsable2.icon === 'FlaskConical' ? <FlaskConical size={16} className="text-red-400" /> : <Scroll size={16} className="text-blue-400" />
                        ) : <HelpCircle size={16} className="text-gray-500" />}
                        <span className="absolute top-0 left-0 text-gray-400 bg-black/80 rounded font-bold" style={{ fontSize: '8px', padding: '1px 3px' }}>I</span>
                        <div ref={el => { if (el) cooldownRefs.current['usable2'] = el }} className="absolute bottom-0 left-0 right-0 bg-black/80" style={{ height: '0%', opacity: 0 }}></div>
                    </button>
                </div>

                {/* Ability buttons */}
                <div className="flex gap-1">
                    {activeAbilities.slice(0, 3).map((abId, idx) => {
                        const ability = ABILITY_DB.find(a => a.id === abId);
                        if (!ability) return null;
                        return (
                            <button
                                key={abId}
                                id={`btn-ability-${abId}`}
                                onClick={() => onAbility(abId)}
                                className="relative bg-medieval-700/90 border-2 border-medieval-400 rounded-lg flex items-center justify-center active:scale-90 transition-transform touch-none"
                                style={{ width: 'clamp(38px, 10vmin, 56px)', height: 'clamp(38px, 10vmin, 56px)' }}
                                aria-label={ability.name}
                                title={ability.name}
                            >
                                {renderIcon(ability.icon, 22, 'text-white')}
                                <span className="absolute top-0 right-0 text-gray-300 font-bold bg-black/80 rounded" style={{ fontSize: '8px', padding: '1px 3px' }}>
                                    {idx === 0 ? 'J' : idx === 1 ? 'K' : 'L'}
                                </span>
                                <div ref={el => { if (el) cooldownRefs.current[abId] = el }} className="absolute bottom-0 left-0 right-0 bg-black/80" style={{ height: '0%', opacity: 0 }}></div>
                            </button>
                        );
                    })}
                    {[...Array(Math.max(0, 3 - activeAbilities.length))].map((_, i) => (
                        <div key={i} className="bg-medieval-900/50 border-2 border-medieval-700 rounded-lg flex items-center justify-center border-dashed opacity-30" style={{ width: 'clamp(38px, 10vmin, 56px)', height: 'clamp(38px, 10vmin, 56px)' }}>
                            <Lock size={14} className="text-medieval-500" />
                        </div>
                    ))}
                </div>

                {/* Attack button */}
                <button
                    id="btn-attack"
                    onClick={onAttack}
                    className="bg-red-900/90 border-2 border-red-700 rounded-full flex items-center justify-center relative active:scale-90 transition-transform touch-none"
                    style={{
                        width: 'clamp(50px, 13vmin, 76px)',
                        height: 'clamp(50px, 13vmin, 76px)',
                        boxShadow: '0 0 15px rgba(220,38,38,0.5)'
                    }}
                    aria-label="Attack"
                >
                    <Sword size={28} className="text-white drop-shadow-lg" />
                    <span className="absolute top-0 right-0 text-red-200 font-bold bg-black/80 rounded" style={{ fontSize: '8px', padding: '1px 3px' }}>H</span>
                    <div ref={el => { if (el) cooldownRefs.current['auto_attack'] = el }} className="absolute bottom-0 left-0 right-0 bg-black/80 pointer-events-none" style={{ height: '0%', opacity: 0 }}></div>
                </button>
            </div>
        </div>
    );
};

export default BottomControls;
