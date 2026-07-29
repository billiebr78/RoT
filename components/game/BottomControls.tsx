import React from 'react';
import { Item, ItemSlot, AbilityType, Ability } from '../../types';
import { ABILITY_DB } from '../../constants';
import { Sword, ChevronLeft, ChevronRight, FlaskConical, Scroll, HelpCircle, Lock } from 'lucide-react';
import { renderIcon } from '../../render/icons';

interface Props {
    equippedUsable1?: Item;
    equippedUsable2?: Item;
    activeAbilities: string[]; // IDs of equipped active abilities
    cooldownRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
    onMoveLeft: (pressed: boolean) => void;
    onMoveRight: (pressed: boolean) => void;
    onAttack: () => void;
    onAbility: (id: string) => void;
    onUseItem: (slot: ItemSlot.USABLE1 | ItemSlot.USABLE2) => void;
}

const BottomControls: React.FC<Props> = ({
    equippedUsable1, equippedUsable2, activeAbilities,
    cooldownRefs,
    onMoveLeft, onMoveRight, onAttack, onAbility, onUseItem,
}) => {
    return (
        <div className="shrink-0 px-2 py-1.5 flex justify-between items-end gap-2 z-20 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
            {/* Movement (bottom-left) */}
            <div className="flex gap-2">
                <button
                    onPointerDown={(e) => { e.preventDefault(); onMoveLeft(true); }}
                    onPointerUp={() => onMoveLeft(false)}
                    onPointerLeave={() => onMoveLeft(false)}
                    onPointerCancel={() => onMoveLeft(false)}
                    className="bg-medieval-700/90 border-2 border-medieval-500 rounded-full flex items-center justify-center active:bg-medieval-600 active:scale-90 transition-transform shadow-lg touch-none"
                    style={{ width: 'clamp(48px, 13vmin, 76px)', height: 'clamp(48px, 13vmin, 76px)' }}
                    aria-label="Move Left"
                >
                    <ChevronLeft size={32} className="text-medieval-300" />
                </button>
                <button
                    onPointerDown={(e) => { e.preventDefault(); onMoveRight(true); }}
                    onPointerUp={() => onMoveRight(false)}
                    onPointerLeave={() => onMoveRight(false)}
                    onPointerCancel={() => onMoveRight(false)}
                    className="bg-medieval-700/90 border-2 border-medieval-500 rounded-full flex items-center justify-center active:bg-medieval-600 active:scale-90 transition-transform shadow-lg touch-none"
                    style={{ width: 'clamp(48px, 13vmin, 76px)', height: 'clamp(48px, 13vmin, 76px)' }}
                    aria-label="Move Right"
                >
                    <ChevronRight size={32} className="text-medieval-300" />
                </button>
            </div>

            {/* Actions (bottom-right): items, abilities, attack */}
            <div className="flex gap-2 items-end">
                {/* Usable items stacked vertically */}
                <div className="flex flex-col gap-1.5">
                    <button
                        id="btn-u1"
                        onClick={() => onUseItem(ItemSlot.USABLE1)}
                        className={`relative border rounded flex items-center justify-center active:scale-90 transition-transform touch-none ${equippedUsable1 ? 'bg-medieval-600/90 border-medieval-400' : 'bg-gray-800/90 border-gray-600 opacity-50'}`}
                        style={{ width: 'clamp(34px, 9vmin, 44px)', height: 'clamp(34px, 9vmin, 44px)' }}
                        aria-label="Use Item 1"
                    >
                        {equippedUsable1 ? (
                            equippedUsable1.icon === 'FlaskConical' ? <FlaskConical size={18} className="text-red-400" /> : <Scroll size={18} className="text-blue-400" />
                        ) : <HelpCircle size={18} className="text-gray-500" />}
                        <span className="absolute top-0 left-0 text-gray-400 bg-black/80 rounded font-bold" style={{ fontSize: '8px', padding: '1px 3px' }}>U</span>
                        <div
                            ref={el => { if (el) cooldownRefs.current['usable1'] = el }}
                            className="absolute bottom-0 left-0 right-0 bg-black/80"
                            style={{ height: '0%', opacity: 0 }}
                        ></div>
                    </button>
                    <button
                        id="btn-u2"
                        onClick={() => onUseItem(ItemSlot.USABLE2)}
                        className={`relative border rounded flex items-center justify-center active:scale-90 transition-transform touch-none ${equippedUsable2 ? 'bg-medieval-600/90 border-medieval-400' : 'bg-gray-800/90 border-gray-600 opacity-50'}`}
                        style={{ width: 'clamp(34px, 9vmin, 44px)', height: 'clamp(34px, 9vmin, 44px)' }}
                        aria-label="Use Item 2"
                    >
                        {equippedUsable2 ? (
                            equippedUsable2.icon === 'FlaskConical' ? <FlaskConical size={18} className="text-red-400" /> : <Scroll size={18} className="text-blue-400" />
                        ) : <HelpCircle size={18} className="text-gray-500" />}
                        <span className="absolute top-0 left-0 text-gray-400 bg-black/80 rounded font-bold" style={{ fontSize: '8px', padding: '1px 3px' }}>I</span>
                        <div
                            ref={el => { if (el) cooldownRefs.current['usable2'] = el }}
                            className="absolute bottom-0 left-0 right-0 bg-black/80"
                            style={{ height: '0%', opacity: 0 }}
                        ></div>
                    </button>
                </div>

                {/* Ability buttons */}
                <div className="flex gap-1.5">
                    {activeAbilities.slice(0, 3).map((abId, idx) => {
                        const ability = ABILITY_DB.find(a => a.id === abId);
                        if (!ability) return null;
                        return (
                            <button
                                key={abId}
                                id={`btn-ability-${abId}`}
                                onClick={() => onAbility(abId)}
                                className="relative bg-medieval-700/90 border-2 border-medieval-400 rounded-lg flex items-center justify-center active:scale-90 transition-transform touch-none"
                                style={{ width: 'clamp(42px, 11vmin, 64px)', height: 'clamp(42px, 11vmin, 64px)' }}
                                aria-label={ability.name}
                                title={ability.name}
                            >
                                {renderIcon(ability.icon, 24, 'text-white')}
                                <span className="absolute top-0 right-0 text-gray-300 font-bold bg-black/80 rounded" style={{ fontSize: '8px', padding: '1px 3px' }}>
                                    {idx === 0 ? 'J' : idx === 1 ? 'K' : 'L'}
                                </span>
                                <div
                                    ref={el => { if (el) cooldownRefs.current[abId] = el }}
                                    className="absolute bottom-0 left-0 right-0 bg-black/80"
                                    style={{ height: '0%', opacity: 0 }}
                                ></div>
                            </button>
                        );
                    })}
                    {[...Array(Math.max(0, 3 - activeAbilities.length))].map((_, i) => (
                        <div
                            key={i}
                            className="bg-medieval-900/50 border-2 border-medieval-700 rounded-lg flex items-center justify-center border-dashed opacity-30"
                            style={{ width: 'clamp(42px, 11vmin, 64px)', height: 'clamp(42px, 11vmin, 64px)' }}
                        >
                            <Lock size={16} className="text-medieval-500" />
                        </div>
                    ))}
                </div>

                {/* Attack button */}
                <button
                    id="btn-attack"
                    onClick={onAttack}
                    className="bg-red-900/90 border-2 border-red-700 rounded-full flex items-center justify-center relative active:scale-90 transition-transform touch-none"
                    style={{
                        width: 'clamp(58px, 15vmin, 88px)',
                        height: 'clamp(58px, 15vmin, 88px)',
                        boxShadow: '0 0 15px rgba(220,38,38,0.5)'
                    }}
                    aria-label="Attack"
                >
                    <Sword size={32} className="text-white drop-shadow-lg" />
                    <span className="absolute top-0 right-0 text-red-200 font-bold bg-black/80 rounded" style={{ fontSize: '8px', padding: '1px 3px' }}>
                        H
                    </span>
                    <div
                        ref={el => { if (el) cooldownRefs.current['auto_attack'] = el }}
                        className="absolute bottom-0 left-0 right-0 bg-black/80 pointer-events-none"
                        style={{ height: '0%', opacity: 0 }}
                    ></div>
                </button>
            </div>
        </div>
    );
};

export default BottomControls;
