import React from 'react';
import { Item, ItemSlot, Character, Buff } from '../../types';
import { ABILITY_DB } from '../../constants';
import { HelpCircle, Lock } from 'lucide-react';
import { GiBroadsword } from 'react-icons/gi';
import { renderIcon } from '../../render/icons';
import VirtualStick from './VirtualStick';

interface Props {
    character: Character;
    enemyName: string;
    enemyMaxHp: number;
    enemyLevel: number;
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
    character, enemyName, enemyMaxHp, enemyLevel, buffs,
    equippedUsable1, equippedUsable2, activeAbilities,
    cooldownRefs,
    playerHpBarRef, playerHpTextRef,
    enemyHpBarRef, enemyContainerRef,
    onMoveLeft, onMoveRight, onAttack, onAbility, onUseItem,
}) => {
    return (
        <div className="shrink-0 px-3 py-2 flex justify-between items-end gap-2 z-20 bg-gradient-to-t from-black/95 via-black/70 to-transparent">
            {/* Movement (left) — horizontal virtual joystick */}
            <div className="flex gap-2 shrink-0 items-end">
                <VirtualStick
                    onMoveLeft={onMoveLeft}
                    onMoveRight={onMoveRight}
                />
            </div>

            {/* Center: Player (left) + Enemy (right) HP bars */}
            <div className="flex-1 flex gap-2 min-w-0 items-end">
                {/* Player info */}
                <div className="flex-1 bg-medieval-900/90 border border-medieval-500 rounded p-1 shadow-lg min-w-0">
                    <div className="flex justify-between items-baseline px-1">
                        <span className="font-bold truncate text-medieval-200" style={{ fontSize: 'clamp(16px, 4vmin, 22px)' }}>
                            {character.name}
                        </span>
                        <span className="text-medieval-400 shrink-0" style={{ fontSize: 'clamp(14px, 3.2vmin, 20px)' }}>
                            L{character.level}
                        </span>
                    </div>
                    <div className="bg-black rounded border border-medieval-600 relative overflow-hidden" style={{ height: 'clamp(10px, 3vmin, 16px)' }}>
                        <div ref={playerHpBarRef} className="h-full bg-gradient-to-r from-red-700 to-red-500 transition-all duration-75" style={{width: '100%'}}></div>
                        <span ref={playerHpTextRef} className="absolute inset-0 flex items-center justify-center font-bold text-white drop-shadow-md" style={{ fontSize: 'clamp(12px, 2.8vmin, 16px)' }}></span>
                    </div>
                    <div className="flex gap-1 mt-1 flex-wrap">
                        {buffs.map((buff, i) => (
                            <div key={i} className="bg-gray-800 border border-gray-600 rounded flex items-center justify-center relative" style={{ width: 'clamp(16px, 4vmin, 24px)', height: 'clamp(16px, 4vmin, 24px)' }} title={buff.name}>
                                {buff.icon && renderIcon(buff.icon, 14, buff.icon === 'Shield' ? 'text-cyan-400' : buff.icon === 'Heart' ? 'text-red-400' : buff.icon === 'Ghost' ? 'text-white' : buff.icon === 'Footprints' ? 'text-green-400' : buff.icon === 'Scroll' ? 'text-yellow-400' : 'text-white')}
                                {buff.charges && <span className="absolute -bottom-1 -right-1 bg-blue-600 rounded-full px-1 leading-tight font-bold" style={{ fontSize: '10px' }}>{buff.charges}</span>}
                                {buff.barrierHp !== undefined && <span className="absolute -bottom-1 -right-1 bg-cyan-600 rounded-full px-1 leading-tight font-bold" style={{ fontSize: '10px' }}>{Math.ceil(buff.barrierHp)}</span>}
                            </div>
                        ))}
                    </div>
                </div>
                {/* Enemy info */}
                <div ref={enemyContainerRef} className="flex-1 bg-medieval-900/90 border border-medieval-500 rounded p-1 shadow-lg transition-opacity duration-300 min-w-0">
                    <div className="flex justify-between items-baseline px-1">
                        <span className="font-bold truncate text-red-300" style={{ fontSize: 'clamp(16px, 4vmin, 22px)' }}>{enemyName}</span>
                        <span className="text-red-400/80 shrink-0" style={{ fontSize: 'clamp(14px, 3.2vmin, 20px)' }}>
                            L{enemyLevel}
                        </span>
                    </div>
                    <div className="bg-black rounded border border-medieval-600 relative overflow-hidden" style={{ height: 'clamp(10px, 3vmin, 16px)' }}>
                        <div ref={enemyHpBarRef} className="h-full bg-gradient-to-r from-purple-700 to-purple-500 transition-all duration-75" style={{width: '100%'}}></div>
                    </div>
                </div>
            </div>

            {/* Actions (right): items, abilities, attack */}
            <div className="flex gap-2 items-end shrink-0">
                {/* Usable items */}
                <div className="flex flex-col gap-1">
                    <button
                        id="btn-u1"
                        onClick={() => onUseItem(ItemSlot.USABLE1)}
                        className={`relative border rounded flex items-center justify-center active:scale-90 transition-transform touch-none ${equippedUsable1 ? 'bg-medieval-600/90 border-medieval-400' : 'bg-gray-800/90 border-gray-600 opacity-50'}`}
                        style={{ width: 'clamp(52px, 14vmin, 72px)', height: 'clamp(52px, 14vmin, 72px)' }}
                        aria-label="Use Item 1"
                    >
                        {equippedUsable1 ? (equippedUsable1.icon ? renderIcon(equippedUsable1.icon, 28, 'text-red-400') : <HelpCircle size={28} className="text-gray-500" />) : <HelpCircle size={28} className="text-gray-500" />}
                        <span className="absolute top-0 left-0 text-gray-400 bg-black/80 rounded font-bold" style={{ fontSize: '14px', padding: '0px 4px' }}>U</span>
                        <div ref={el => { if (el) cooldownRefs.current['usable1'] = el }} className="absolute bottom-0 left-0 right-0 bg-black/80" style={{ height: '0%', opacity: 0 }}></div>
                    </button>
                    <button
                        id="btn-u2"
                        onClick={() => onUseItem(ItemSlot.USABLE2)}
                        className={`relative border rounded flex items-center justify-center active:scale-90 transition-transform touch-none ${equippedUsable2 ? 'bg-medieval-600/90 border-medieval-400' : 'bg-gray-800/90 border-gray-600 opacity-50'}`}
                        style={{ width: 'clamp(52px, 14vmin, 72px)', height: 'clamp(52px, 14vmin, 72px)' }}
                        aria-label="Use Item 2"
                    >
                        {equippedUsable2 ? (equippedUsable2.icon ? renderIcon(equippedUsable2.icon, 28, 'text-red-400') : <HelpCircle size={28} className="text-gray-500" />) : <HelpCircle size={28} className="text-gray-500" />}
                        <span className="absolute top-0 left-0 text-gray-400 bg-black/80 rounded font-bold" style={{ fontSize: '14px', padding: '0px 4px' }}>I</span>
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
                                style={{ width: 'clamp(64px, 17vmin, 96px)', height: 'clamp(64px, 17vmin, 96px)' }}
                                aria-label={ability.name}
                                title={ability.name}
                            >
                                {renderIcon(ability.icon, 36, 'text-white')}
                                <span className="absolute top-0 right-0 text-gray-300 font-bold bg-black/80 rounded" style={{ fontSize: '14px', padding: '0px 4px' }}>
                                    {idx === 0 ? 'J' : idx === 1 ? 'K' : 'L'}
                                </span>
                                <div ref={el => { if (el) cooldownRefs.current[abId] = el }} className="absolute bottom-0 left-0 right-0 bg-black/80" style={{ height: '0%', opacity: 0 }}></div>
                            </button>
                        );
                    })}
                    {[...Array(Math.max(0, 3 - activeAbilities.length))].map((_, i) => (
                        <div key={i} className="bg-medieval-900/50 border-2 border-medieval-700 rounded-lg flex items-center justify-center border-dashed opacity-30" style={{ width: 'clamp(64px, 17vmin, 96px)', height: 'clamp(64px, 17vmin, 96px)' }}>
                            <Lock size={24} className="text-medieval-500" />
                        </div>
                    ))}
                </div>

                {/* Attack button */}
                <button
                    id="btn-attack"
                    onClick={onAttack}
                    className="bg-red-900/90 border-2 border-red-700 rounded-full flex items-center justify-center relative active:scale-90 transition-transform touch-none"
                    style={{ width: 'clamp(84px, 22vmin, 128px)', height: 'clamp(84px, 22vmin, 128px)', boxShadow: '0 0 15px rgba(220,38,38,0.5)' }}
                    aria-label="Attack"
                >
                    <GiBroadsword size={48} className="text-white drop-shadow-lg" />
                    <span className="absolute top-0 right-0 text-red-200 font-bold bg-black/80 rounded" style={{ fontSize: '14px', padding: '0px 4px' }}>H</span>
                    <div ref={el => { if (el) cooldownRefs.current['auto_attack'] = el }} className="absolute bottom-0 left-0 right-0 bg-black/80 pointer-events-none" style={{ height: '0%', opacity: 0 }}></div>
                </button>
            </div>
        </div>
    );
};

export default BottomControls;
