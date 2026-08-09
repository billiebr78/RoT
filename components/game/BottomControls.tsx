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

/**
 * Combat HUD — mobile-first responsive layout.
 *
 * The HP bars are rendered ONCE (not duplicated for mobile/desktop).
 * On mobile (< 640px) they appear in a row above the controls.
 * On desktop (≥ 640px) they appear inline with the controls.
 * This is achieved with CSS Grid: the grid template changes based
 * on the breakpoint, but the DOM elements stay the same — so refs
 * work correctly without duplication.
 *
 * MOBILE layout (< 640px):
 *   ┌──────────────────────────┐
 *   │  Player HP  │  Enemy HP  │  ← row 1, full width
 *   ├──────────────────────────┤
 *   │ ◄ ►  U1 U2  AB1 AB2 AB3 ⚔️ │  ← row 2, wraps if needed
 *   └──────────────────────────┘
 *
 * DESKTOP layout (≥ 640px):
 *   ┌────────────────────────────────────────────┐
 *   │ ◄ ► │  Player HP  │  Enemy HP  │ U1 U2 AB1 AB2 AB3 ⚔️ │
 *   └────────────────────────────────────────────┘
 */
const BottomControls: React.FC<Props> = ({
    character, enemyName, enemyMaxHp, enemyLevel, buffs,
    equippedUsable1, equippedUsable2, activeAbilities,
    cooldownRefs,
    playerHpBarRef, playerHpTextRef,
    enemyHpBarRef, enemyContainerRef,
    onMoveLeft, onMoveRight, onAttack, onAbility, onUseItem,
}) => {
    return (
        <div className="shrink-0 z-20 bg-gradient-to-t from-black/95 via-black/70 to-transparent safe-bottom safe-left safe-right">
            <div className="combat-hud-grid px-3 py-2">
                {/* Player HP — always rendered once, ref is stable */}
                <div className="combat-hud-player-hp bg-medieval-900/90 border border-medieval-500 rounded p-1.5 shadow-lg min-w-0">
                    <div className="flex justify-between items-baseline px-1 mb-1">
                        <span className="font-bold truncate text-medieval-200 text-sm">
                            {character.name}
                        </span>
                        <span className="text-medieval-400 shrink-0 text-xs">
                            L{character.level}
                        </span>
                    </div>
                    <div className="bg-black rounded border border-medieval-600 relative overflow-hidden h-4">
                        <div ref={playerHpBarRef} className="h-full bg-gradient-to-r from-red-700 to-red-500 transition-all duration-75" style={{width: '100%'}}></div>
                        <span ref={playerHpTextRef} className="absolute inset-0 flex items-center justify-center font-bold text-white drop-shadow-md text-xs"></span>
                    </div>
                    {/* Buffs row */}
                    {buffs.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                            {buffs.map((buff, i) => (
                                <div key={i} className="bg-gray-800 border border-gray-600 rounded flex items-center justify-center relative w-5 h-5" title={buff.name}>
                                    {buff.icon && renderIcon(buff.icon, 12, buff.icon === 'Shield' ? 'text-cyan-400' : buff.icon === 'Heart' ? 'text-red-400' : buff.icon === 'Ghost' ? 'text-white' : buff.icon === 'Footprints' ? 'text-green-400' : buff.icon === 'Scroll' ? 'text-yellow-400' : 'text-white')}
                                    {buff.charges && <span className="absolute -bottom-1 -right-1 bg-blue-600 rounded-full px-0.5 leading-tight font-bold text-[8px]">{buff.charges}</span>}
                                    {buff.barrierHp !== undefined && <span className="absolute -bottom-1 -right-1 bg-cyan-600 rounded-full px-0.5 leading-tight font-bold text-[8px]">{Math.ceil(buff.barrierHp)}</span>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Enemy HP — always rendered once, ref is stable */}
                <div
                    ref={enemyContainerRef}
                    className="combat-hud-enemy-hp bg-medieval-900/90 border border-medieval-500 rounded p-1.5 shadow-lg transition-opacity duration-300 min-w-0"
                >
                    <div className="flex justify-between items-baseline px-1 mb-1">
                        <span className="font-bold truncate text-red-300 text-sm">{enemyName}</span>
                        <span className="text-red-400/80 shrink-0 text-xs">L{enemyLevel}</span>
                    </div>
                    <div className="bg-black rounded border border-medieval-600 relative overflow-hidden h-4">
                        <div ref={enemyHpBarRef} className="h-full bg-gradient-to-r from-purple-700 to-purple-500 transition-all duration-75" style={{width: '100%'}}></div>
                    </div>
                </div>

                {/* Controls row — actions on the LEFT, joystick on the RIGHT.
                    The attack button is the most-used action, so it goes
                    on the left where it's easiest to reach with the thumb.
                    The joystick (movement) goes on the right. */}
                <div className="combat-hud-controls flex items-end gap-1.5 flex-wrap sm:flex-nowrap justify-start sm:justify-end">
                    {/* Actions (items, abilities, attack) — on the LEFT */}
                    <div className="flex gap-1.5 items-end shrink-0">
                        {/* Usable items */}
                        <div className="flex flex-col gap-1">
                            <button
                                id="btn-u1"
                                onClick={() => onUseItem(ItemSlot.USABLE1)}
                                className={`touch-target relative border-2 rounded-lg flex items-center justify-center active:scale-90 transition-transform touch-none ${equippedUsable1 ? 'bg-medieval-600/90 border-medieval-400' : 'bg-gray-800/90 border-gray-600 opacity-50'}`}
                                style={{ width: 'clamp(44px, 12vmin, 56px)', height: 'clamp(44px, 12vmin, 56px)' }}
                                aria-label="Use Item 1"
                            >
                                {equippedUsable1 ? (equippedUsable1.icon ? renderIcon(equippedUsable1.icon, 22, 'text-red-400') : <HelpCircle size={22} className="text-gray-500" />) : <HelpCircle size={22} className="text-gray-500" />}
                                <span className="absolute top-0 left-0 text-gray-400 bg-black/80 rounded font-bold text-[10px] px-1">U</span>
                                <div ref={el => { if (el) cooldownRefs.current['usable1'] = el }} className="absolute bottom-0 left-0 right-0 bg-black/80" style={{ height: '0%', opacity: 0 }}></div>
                            </button>
                            <button
                                id="btn-u2"
                                onClick={() => onUseItem(ItemSlot.USABLE2)}
                                className={`touch-target relative border-2 rounded-lg flex items-center justify-center active:scale-90 transition-transform touch-none ${equippedUsable2 ? 'bg-medieval-600/90 border-medieval-400' : 'bg-gray-800/90 border-gray-600 opacity-50'}`}
                                style={{ width: 'clamp(44px, 12vmin, 56px)', height: 'clamp(44px, 12vmin, 56px)' }}
                                aria-label="Use Item 2"
                            >
                                {equippedUsable2 ? (equippedUsable2.icon ? renderIcon(equippedUsable2.icon, 22, 'text-red-400') : <HelpCircle size={22} className="text-gray-500" />) : <HelpCircle size={22} className="text-gray-500" />}
                                <span className="absolute top-0 left-0 text-gray-400 bg-black/80 rounded font-bold text-[10px] px-1">I</span>
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
                                        className="touch-target relative bg-medieval-700/90 border-2 border-medieval-400 rounded-lg flex items-center justify-center active:scale-90 transition-transform touch-none"
                                        style={{ width: 'clamp(48px, 13vmin, 64px)', height: 'clamp(48px, 13vmin, 64px)' }}
                                        aria-label={ability.name}
                                        title={ability.name}
                                    >
                                        {renderIcon(ability.icon, 26, 'text-white')}
                                        <span className="absolute top-0 right-0 text-gray-300 font-bold bg-black/80 rounded text-[10px] px-1">
                                            {idx === 0 ? 'J' : idx === 1 ? 'K' : 'L'}
                                        </span>
                                        <div ref={el => { if (el) cooldownRefs.current[abId] = el }} className="absolute bottom-0 left-0 right-0 bg-black/80" style={{ height: '0%', opacity: 0 }}></div>
                                    </button>
                                );
                            })}
                            {[...Array(Math.max(0, 3 - activeAbilities.length))].map((_, i) => (
                                <div key={i} className="touch-target bg-medieval-900/50 border-2 border-medieval-700 rounded-lg flex items-center justify-center border-dashed opacity-30" style={{ width: 'clamp(48px, 13vmin, 64px)', height: 'clamp(48px, 13vmin, 64px)' }}>
                                    <Lock size={18} className="text-medieval-500" />
                                </div>
                            ))}
                        </div>

                        {/* Attack button */}
                        <button
                            id="btn-attack"
                            onClick={onAttack}
                            className="touch-target bg-red-900/90 border-2 border-red-700 rounded-full flex items-center justify-center relative active:scale-90 transition-transform touch-none"
                            style={{ width: 'clamp(56px, 15vmin, 76px)', height: 'clamp(56px, 15vmin, 76px)', boxShadow: '0 0 15px rgba(220,38,38,0.5)' }}
                            aria-label="Attack"
                        >
                            <GiBroadsword size={32} className="text-white drop-shadow-lg" />
                            <span className="absolute top-0 right-0 text-red-200 font-bold bg-black/80 rounded text-[10px] px-1">H</span>
                            <div ref={el => { if (el) cooldownRefs.current['auto_attack'] = el }} className="absolute bottom-0 left-0 right-0 bg-black/80 pointer-events-none" style={{ height: '0%', opacity: 0 }}></div>
                        </button>
                    </div>

                    {/* Joystick — on the RIGHT side (movement with right thumb) */}
                    <div className="shrink-0 ml-auto">
                        <VirtualStick
                            onMoveLeft={onMoveLeft}
                            onMoveRight={onMoveRight}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BottomControls;
