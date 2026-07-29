
import React, { useState } from 'react';
import { Attribute, Character, ClassType, ItemSlot } from '../types';
import { BASE_ATTRIBUTE_VALUE, BONUS_ATTRIBUTE_VALUE, CLASS_BONUS, STARTING_ITEMS } from '../constants';
import { Shield, Sword, Wand, Dices, ChevronRight, ArrowLeft, Crosshair } from 'lucide-react';

interface Props {
  onCharacterCreated: (char: Character) => void;
  onBack: () => void;
}

const CharacterCreation: React.FC<Props> = ({ onCharacterCreated, onBack }) => {
  const [name, setName] = useState('');
  const [selectedClass, setSelectedClass] = useState<ClassType>(ClassType.WARRIOR);
  const [rollResult, setRollResult] = useState<number | null>(null);
  const [availablePoints, setAvailablePoints] = useState(0);
  const [attributes, setAttributes] = useState<Record<Attribute, number>>({
    [Attribute.ST]: BASE_ATTRIBUTE_VALUE,
    [Attribute.DX]: BASE_ATTRIBUTE_VALUE,
    [Attribute.INT]: BASE_ATTRIBUTE_VALUE,
    [Attribute.HT]: BASE_ATTRIBUTE_VALUE,
    [Attribute.LUCK]: BASE_ATTRIBUTE_VALUE
  });

  const handleClassSelect = (c: ClassType) => {
    setSelectedClass(c);
    // Reset stats to base
    const newAttributes = {
      [Attribute.ST]: BASE_ATTRIBUTE_VALUE,
      [Attribute.DX]: BASE_ATTRIBUTE_VALUE,
      [Attribute.INT]: BASE_ATTRIBUTE_VALUE,
      [Attribute.HT]: BASE_ATTRIBUTE_VALUE,
      [Attribute.LUCK]: BASE_ATTRIBUTE_VALUE
    };
    // Apply class bonus
    newAttributes[CLASS_BONUS[c]] += BONUS_ATTRIBUTE_VALUE;
    setAttributes(newAttributes);
  };

  const rollDice = () => {
    if (rollResult !== null) return;
    const d1 = Math.floor(Math.random() * 10) + 1;
    const d2 = Math.floor(Math.random() * 10) + 1;
    const total = d1 + d2;
    setRollResult(total);
    setAvailablePoints(total);
  };

  const adjustAttribute = (attr: Attribute, change: number) => {
    if (change > 0 && availablePoints > 0) {
      setAttributes(prev => ({ ...prev, [attr]: prev[attr] + 1 }));
      setAvailablePoints(prev => prev - 1);
    } else if (change < 0 && attributes[attr] > BASE_ATTRIBUTE_VALUE) {
      const baseLimit = attr === CLASS_BONUS[selectedClass] ? BASE_ATTRIBUTE_VALUE + BONUS_ATTRIBUTE_VALUE : BASE_ATTRIBUTE_VALUE;
      
      if (attributes[attr] > baseLimit) {
         setAttributes(prev => ({ ...prev, [attr]: prev[attr] - 1 }));
         setAvailablePoints(prev => prev + 1);
      }
    }
  };

  const handleCreate = () => {
    if (!name || availablePoints > 0) {
        alert("Please name your character and spend all points.");
        return;
    }

    const newChar: Character = {
      id: Date.now().toString(),
      name,
      classType: selectedClass,
      level: 1,
      exp: 0,
      gold: 0,
      attributes,
      attributePoints: 0,
      skillPoints: 1, 
      potions: 3, // Start with 3 potions (converted to items in migration/hub logic usually, or we init properly here)
      // To follow the new Usable item logic strictly, we should put potion items in stash or slots
      // For now, keep legacy prop as fallback or add real items to stash
      equipment: {
        [ItemSlot.MAIN_HAND]: STARTING_ITEMS[selectedClass].find(i => i.slot === ItemSlot.MAIN_HAND),
        [ItemSlot.CHEST]: STARTING_ITEMS[selectedClass].find(i => i.slot === ItemSlot.CHEST),
      },
      stash: [],
      equippedAbilities: [],
      unlockedAbilities: [],
      maxStage: 1
    };
    onCharacterCreated(newChar);
  };

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-medieval-900 p-4 sm:p-6 text-medieval-100 overflow-auto">
      <div className="w-full max-w-4xl bg-medieval-800 border-2 border-medieval-500 rounded-lg shadow-2xl p-4 sm:p-8 my-auto">
        <button onClick={onBack} className="flex items-center text-medieval-400 hover:text-white mb-4">
          <ArrowLeft className="mr-2" /> Back
        </button>
        
        <h2 className="text-4xl font-serif text-center text-medieval-300 mb-8">Create Your Hero</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Left Column: Details */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold mb-2 text-medieval-400">Name</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-medieval-900 border border-medieval-600 rounded px-4 py-2 focus:outline-none focus:border-medieval-300"
                placeholder="Enter hero name..."
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-2 text-medieval-400">Class</label>
              <div className="grid grid-cols-3 gap-4">
                {[ClassType.WARRIOR, ClassType.MAGE, ClassType.ROGUE].map(c => (
                  <button
                    key={c}
                    onClick={() => handleClassSelect(c)}
                    className={`flex flex-col items-center justify-center p-4 border rounded transition-colors ${
                      selectedClass === c 
                        ? 'bg-medieval-700 border-medieval-300 text-white' 
                        : 'bg-medieval-900 border-medieval-600 text-medieval-500 hover:bg-medieval-800'
                    }`}
                  >
                    {c === ClassType.WARRIOR && <Sword size={32} />}
                    {c === ClassType.MAGE && <Wand size={32} />}
                    {c === ClassType.ROGUE && <Crosshair size={32} />}
                    <span className="mt-2 font-bold text-xs">{c}</span>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-sm text-medieval-400 h-10">
                {selectedClass === ClassType.WARRIOR && "Masters of Strength. High physical damage and health."}
                {selectedClass === ClassType.MAGE && "Masters of Intelligence. High magic damage and barriers."}
                {selectedClass === ClassType.ROGUE && "Masters of Dexterity. High critical hits, speed, and evasion."}
              </p>
            </div>

            <div className="bg-medieval-900 p-4 rounded border border-medieval-600">
              <div className="flex justify-between items-center mb-4">
                <span className="font-bold text-lg">Fate Roll (2d10)</span>
                {rollResult === null ? (
                  <button 
                    onClick={rollDice}
                    className="flex items-center px-4 py-2 bg-amber-700 hover:bg-amber-600 rounded text-white font-bold"
                  >
                    <Dices className="mr-2" /> Roll
                  </button>
                ) : (
                  <span className="text-2xl font-bold text-amber-400">{rollResult} Points</span>
                )}
              </div>
              <div className="text-center text-sm text-medieval-400">
                Points Remaining: <span className="text-white font-bold text-lg">{availablePoints}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Stats */}
          <div className="bg-medieval-900 p-6 rounded border border-medieval-600">
            <h3 className="text-xl font-bold mb-6 text-medieval-300 border-b border-medieval-700 pb-2">Attributes</h3>
            <div className="space-y-4">
              {Object.values(Attribute).map(attr => (
                <div key={attr} className="flex items-center justify-between">
                  <div className="w-32">
                    <span className="font-bold block">{attr}</span>
                    <span className="text-xs text-medieval-500">
                      {attr === Attribute.ST && 'Phys Dmg'}
                      {attr === Attribute.DX && 'Crit/Eva/Spd'}
                      {attr === Attribute.INT && 'Mag Dmg/Res'}
                      {attr === Attribute.HT && 'Health'}
                      {attr === Attribute.LUCK && 'Drops'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button 
                      onClick={() => adjustAttribute(attr, -1)}
                      disabled={availablePoints === (rollResult || 0)} // Basic disable logic
                      className="w-8 h-8 rounded bg-medieval-800 hover:bg-red-900 disabled:opacity-50 text-xl font-bold flex items-center justify-center"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-bold text-xl">{attributes[attr]}</span>
                    <button 
                       onClick={() => adjustAttribute(attr, 1)}
                       disabled={availablePoints === 0}
                       className="w-8 h-8 rounded bg-medieval-800 hover:bg-green-900 disabled:opacity-50 text-xl font-bold flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-medieval-700">
                <button
                    onClick={handleCreate}
                    disabled={availablePoints > 0 || !name || !rollResult}
                    className="w-full py-4 bg-emerald-800 hover:bg-emerald-700 disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold text-xl rounded flex justify-center items-center transition-all"
                >
                    Begin Journey <ChevronRight className="ml-2" />
                </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CharacterCreation;
