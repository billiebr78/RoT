
import React, { useState, useEffect } from 'react';
import { Character, ItemSlot, Attribute } from './types';
import CharacterCreation from './components/CharacterCreation';
import Hub from './components/Hub';
import GameLoop from './components/GameLoop';
import { calculateTotalStats } from './services/engine';
import { getHp } from './constants';
import { Sword, Upload, ArrowLeft, Trash2 } from 'lucide-react';

type GameScreen = 'splash' | 'create' | 'hub' | 'game' | 'dead';
type SplashView = 'main' | 'load';

const App: React.FC = () => {
  const [screen, setScreen] = useState<GameScreen>('splash');
  const [splashView, setSplashView] = useState<SplashView>('main');
  const [character, setCharacter] = useState<Character | null>(null);
  const [saveSlots, setSaveSlots] = useState<Character[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('rot_saves');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Migration: Ensure new chars have correct slot structure if loading old version
        const migrated = parsed.map((c: any) => {
             // Migrate specific potion/scroll slots to generic USABLE slots if needed
             if (c.equipment && (!c.equipment[ItemSlot.USABLE1] && c.equipment['potion'])) {
                 c.equipment[ItemSlot.USABLE1] = c.equipment['potion'];
                 delete c.equipment['potion'];
             }
             if (c.equipment && (!c.equipment[ItemSlot.USABLE2] && c.equipment['scroll'])) {
                 c.equipment[ItemSlot.USABLE2] = c.equipment['scroll'];
                 delete c.equipment['scroll'];
             }
             // Migrate WEAPON -> MAIN_HAND
             if (c.equipment && c.equipment['weapon']) {
                 c.equipment[ItemSlot.MAIN_HAND] = c.equipment['weapon'];
                 delete c.equipment['weapon'];
             }
             return c;
        });
        setSaveSlots(migrated);
      } catch (e) {
        console.error("Failed to load saves", e);
      }
    }
  }, []);

  const saveGame = (char: Character) => {
    const newSlots = [...saveSlots];
    const idx = newSlots.findIndex(c => c.id === char.id);
    if (idx >= 0) {
      newSlots[idx] = char;
    } else {
      newSlots.push(char);
    }
    setSaveSlots(newSlots);
    localStorage.setItem('rot_saves', JSON.stringify(newSlots));
    setCharacter(char);
  };

  const deleteCharacter = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();
      if (window.confirm("Are you sure you want to delete this legend permanently?")) {
          const newSlots = saveSlots.filter(c => c.id !== id);
          setSaveSlots(newSlots);
          localStorage.setItem('rot_saves', JSON.stringify(newSlots));
      }
  };

  const handleCharacterCreated = (newChar: Character) => {
    saveGame(newChar);
    setScreen('hub');
  };

  const handleLoad = (char: Character) => {
    setCharacter(char);
    setScreen('hub');
  };

  const handleDeath = () => {
    setScreen('dead');
  };

  const handleRevive = () => {
      if (!character) return;
      
      const newChar = { ...character };
      const stats = calculateTotalStats(newChar);
      const maxHp = getHp(stats[Attribute.HT]);
      
      // Penalty: Revive with 10% HP
      newChar.currentHp = Math.floor(maxHp * 0.1);
      
      // Penalty: Lose 5-25% Gold
      const lossPct = 0.05 + Math.random() * 0.20; // 0.05 to 0.25
      newChar.gold = Math.floor(newChar.gold * (1 - lossPct));
      
      // Boss Retreat Mechanic: If died at a Boss Stage (multiple of 5), push back to start of chapter
      if (newChar.maxStage % 5 === 0 && newChar.maxStage > 1) {
          // E.g. Died at 5 -> Go to 1. Died at 10 -> Go to 6.
          newChar.maxStage = newChar.maxStage - 4;
      }

      saveGame(newChar);
      setScreen('hub');
  };

  return (
    <div className="min-h-screen bg-medieval-900 text-white font-sans">
      {screen === 'splash' && (
        <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-black relative">
           <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-transparent via-black/50 to-black"></div>
           <div className="relative z-10 text-center p-12 border-4 border-medieval-500 bg-black/80 rounded-xl shadow-2xl max-w-2xl w-full min-h-[500px] flex flex-col items-center justify-center">
              <h1 className="text-6xl font-serif text-medieval-300 mb-2">Realm of the Trinity</h1>
              <p className="text-medieval-400 mb-10 italic">A Strategy RPG</p>
              
              {splashView === 'main' && (
                  <div className="space-y-4 w-full max-w-md">
                    <button 
                      onClick={() => setScreen('create')}
                      disabled={saveSlots.length >= 3}
                      className="w-full py-5 bg-medieval-700 hover:bg-medieval-600 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-medieval-400 rounded text-xl font-bold transition-all flex items-center justify-center gap-3 shadow-lg hover:scale-105"
                    >
                      <Sword className="fill-current" /> New Game
                    </button>

                    <button 
                      onClick={() => setSplashView('load')}
                      className="w-full py-5 bg-medieval-800 hover:bg-medieval-700 border-2 border-medieval-600 rounded text-xl font-bold transition-all flex items-center justify-center gap-3 shadow-lg hover:scale-105"
                    >
                      <Upload className="fill-current" /> Load Game
                    </button>
                  </div>
              )}

              {splashView === 'load' && (
                  <div className="w-full max-w-md">
                    <div className="flex items-center mb-6">
                        <button onClick={() => setSplashView('main')} className="text-medieval-400 hover:text-white">
                            <ArrowLeft size={24} />
                        </button>
                        <h2 className="text-2xl font-serif text-medieval-200 mx-auto">Select a Legend</h2>
                    </div>

                    {saveSlots.length === 0 ? (
                         <div className="text-center text-medieval-500 italic py-8">No saved games found.</div>
                    ) : (
                        <div className="space-y-3">
                          {saveSlots.map(slot => (
                            <div 
                              key={slot.id}
                              onClick={() => handleLoad(slot)}
                              className="w-full p-4 bg-medieval-900 hover:bg-medieval-800 border border-medieval-700 rounded flex justify-between items-center group transition-all hover:border-medieval-400 cursor-pointer relative"
                            >
                              <div className="text-left">
                                  <span className="font-bold text-lg group-hover:text-medieval-300 block">{slot.name}</span>
                                  <span className="text-xs text-medieval-500">Last played: Stage {slot.maxStage}</span>
                              </div>
                              <div className="flex items-center gap-4">
                                  <span className="text-sm text-medieval-300 font-serif">{slot.classType} Lvl {slot.level}</span>
                                  <button 
                                      onClick={(e) => deleteCharacter(slot.id, e)}
                                      className="p-2 hover:bg-red-900 rounded text-red-500 hover:text-red-300 transition-colors z-20"
                                      title="Delete Character"
                                  >
                                      <Trash2 size={18} />
                                  </button>
                              </div>
                            </div>
                          ))}
                        </div>
                    )}
                  </div>
              )}
           </div>
        </div>
      )}

      {screen === 'create' && (
        <CharacterCreation 
          onCharacterCreated={handleCharacterCreated} 
          onBack={() => setScreen('splash')}
        />
      )}

      {screen === 'hub' && character && (
        <Hub 
          character={character} 
          onUpdateCharacter={saveGame}
          onStartJourney={() => setScreen('game')}
          onLogout={() => { setCharacter(null); setScreen('splash'); setSplashView('main'); }}
        />
      )}

      {screen === 'game' && character && (
        <GameLoop 
          character={character} 
          onExit={(updatedChar) => {
              saveGame(updatedChar);
              setScreen('hub');
          }}
          onDeath={handleDeath}
        />
      )}

      {screen === 'dead' && (
        <div className="h-screen w-full bg-red-950 flex flex-col items-center justify-center text-center">
            <h1 className="text-6xl font-bold text-red-500 mb-4">YOU DIED</h1>
            <p className="text-medieval-300 mb-8">Your journey has ended... for now.</p>
            <div className="text-sm text-red-300 mb-4">Penalty: 5-25% Gold Loss, Revive with 10% Health</div>
            <button 
              onClick={handleRevive}
              className="px-8 py-4 bg-medieval-800 border border-medieval-500 hover:bg-medieval-700 text-white rounded font-bold text-xl"
            >
              Return to Town
            </button>
        </div>
      )}
    </div>
  );
};

export default App;
