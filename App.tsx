
import React, { useState, useEffect } from 'react';
import { Character, ItemSlot, Attribute, Enemy } from './types';
import CharacterCreation from './components/CharacterCreation';
import Hub from './components/Hub';
import GameLoop from './components/GameLoop';
import MapView from './components/MapView';
import { calculateTotalStats } from './services/engine';
import { getHp } from './constants';
import { PLAYER_START } from './game/mapData';
import { Upload, ArrowLeft, Trash2 } from 'lucide-react';
import { GiBroadsword } from 'react-icons/gi';

type GameScreen = 'splash' | 'create' | 'hub' | 'map' | 'game' | 'dead';
type SplashView = 'main' | 'load';

const App: React.FC = () => {
  const [screen, setScreen] = useState<GameScreen>('splash');
  const [splashView, setSplashView] = useState<SplashView>('main');
  const [character, setCharacter] = useState<Character | null>(null);
  const [saveSlots, setSaveSlots] = useState<Character[]>([]);
  const [pendingEnemy, setPendingEnemy] = useState<Enemy | null>(null);
  const [mapPrevPos, setMapPrevPos] = useState<{ row: number; col: number } | null>(null);
  const [combatResult, setCombatResult] = useState<'win' | 'flee' | 'enemyFled' | null>(null);
  const [restHealInfo, setRestHealInfo] = useState<number | null>(null);
  const [mapReloadKey, setMapReloadKey] = useState(0);

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
      
      // Full Bravery recovery on death
      const maxBravery = 1 + Math.floor(newChar.level / 5);
      newChar.bravery = maxBravery;
      newChar.maxBravery = maxBravery;

      // Return to starting city on death
      newChar.mapRow = PLAYER_START.row;
      newChar.mapCol = PLAYER_START.col;

      saveGame(newChar);
      setMapReloadKey(k => k + 1);
      setScreen('map');
  };

  // Keyboard shortcut: press J on the death screen to revive
  useEffect(() => {
      if (screen !== 'dead') return;
      const handleKeyDown = (e: KeyboardEvent) => {
          if (e.code === 'KeyJ') {
              handleRevive();
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [screen]);

  return (
    <div className="fixed inset-0 bg-medieval-900 text-white font-sans overflow-y-auto">
      {screen === 'splash' && (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-purple-950 to-black relative overflow-auto">
           <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-transparent via-black/50 to-black"></div>
           <div className="relative z-10 text-center p-4 sm:p-12 border-4 border-medieval-500 bg-black/80 rounded-xl shadow-2xl max-w-2xl w-full flex flex-col items-center justify-center my-auto">
              <h1 className="text-3xl sm:text-6xl font-serif text-medieval-300 mb-2">Realm of the Trinity</h1>
              <p className="text-medieval-400 mb-6 sm:mb-10 italic text-sm sm:text-base">A Strategy RPG</p>
              
              {splashView === 'main' && (
                  <div className="space-y-3 sm:space-y-4 w-full max-w-md">
                    <button 
                      onClick={() => setScreen('create')}
                      disabled={saveSlots.length >= 3}
                      className="w-full py-3 sm:py-5 bg-medieval-700 hover:bg-medieval-600 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-medieval-400 rounded text-base sm:text-xl font-bold transition-all flex items-center justify-center gap-3 shadow-lg hover:scale-105"
                    >
                      <GiBroadsword className="fill-current" /> New Game
                    </button>

                    <button 
                      onClick={() => setSplashView('load')}
                      className="w-full py-3 sm:py-5 bg-medieval-800 hover:bg-medieval-700 border-2 border-medieval-600 rounded text-base sm:text-xl font-bold transition-all flex items-center justify-center gap-3 shadow-lg hover:scale-105"
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
          onStartJourney={() => setScreen('map')}
          onLogout={() => { setCharacter(null); setScreen('splash'); setSplashView('main'); }}
        />
      )}

      {screen === 'map' && character && (
        <MapView
          key={`map-${character.id}-${mapReloadKey}`}
          character={character}
          combatResult={combatResult}
          prevPos={mapPrevPos}
          onClearCombatResult={() => { setCombatResult(null); setMapPrevPos(null); }}
          onEnterCombat={(enemy, prev) => {
              setPendingEnemy(enemy);
              setMapPrevPos(prev);
              setScreen('game');
          }}
          onEnterTown={() => setScreen('hub')}
          onLogout={() => { setCharacter(null); setScreen('splash'); setSplashView('main'); }}
          onUpdateCharacter={saveGame}
        />
      )}

      {screen === 'game' && character && (
        <GameLoop 
          character={character} 
          presetEnemy={pendingEnemy}
          onExit={(updatedChar, result) => {
              saveGame(updatedChar);
              setCombatResult(result || 'win');
              setPendingEnemy(null);
              setMapReloadKey(k => k + 1);
              setScreen('map');
          }}
          onRest={(updatedChar, healAmount) => {
              saveGame(updatedChar);
              // Advance 5 turns on the map (decrement cooldowns 5 times)
              try {
                  const saved = localStorage.getItem(`rot_map_state_${updatedChar.id}`);
                  if (saved) {
                      const mapState = JSON.parse(saved);
                      for (let i = 0; i < 5; i++) {
                          for (let r = 0; r < 16; r++) {
                              for (let c = 0; c < 16; c++) {
                                  if (mapState.cells[r][c].clearedTurnsRemaining > 0) {
                                      mapState.cells[r][c].clearedTurnsRemaining--;
                                      if (mapState.cells[r][c].clearedTurnsRemaining === 0) {
                                          mapState.cells[r][c].bossDefeated = false;
                                      }
                                  }
                              }
                          }
                      }
                      localStorage.setItem(`rot_map_state_${updatedChar.id}`, JSON.stringify(mapState));
                  }
              } catch (e) { /* ignore */ }
              setRestHealInfo(healAmount);
              setPendingEnemy(null);
              setMapReloadKey(k => k + 1);
              setScreen('map');
          }}
          onDeath={handleDeath}
        />
      )}

      {screen === 'dead' && (
        <div className="fixed inset-0 w-full bg-red-950 flex flex-col items-center justify-center text-center p-4 sm:p-6 overflow-auto">
            <h1 className="text-3xl sm:text-6xl font-bold text-red-500 mb-4">YOU DIED</h1>
            <p className="text-medieval-300 mb-6 sm:mb-8 text-sm sm:text-base">Your journey has ended... for now.</p>
            <div className="text-xs sm:text-sm text-red-300 mb-4">Penalty: 5-25% Gold Loss, Revive with 10% Health</div>
            <button 
              onClick={handleRevive}
              className="px-6 sm:px-8 py-3 sm:py-4 bg-medieval-800 border border-medieval-500 hover:bg-medieval-700 text-white rounded font-bold text-base sm:text-xl"
            >
              Return to Town [J]
            </button>
        </div>
      )}

      {/* Rest heal dialog */}
      {restHealInfo !== null && screen === 'map' && (
        <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-medieval-800 border-4 border-medieval-500 rounded-lg shadow-2xl p-6 text-center max-w-xs">
            <h2 className="font-serif text-xl text-emerald-300 mb-2">You Rested</h2>
            <p className="text-medieval-200 text-sm mb-4">
              You recovered <span className="font-bold text-emerald-400">{restHealInfo} HP</span> over 5 turns.
            </p>
            <p className="text-medieval-400 text-xs mb-4">Nearby areas may have respawned enemies.</p>
            <button
              onClick={() => setRestHealInfo(null)}
              onKeyDown={(e) => { if (e.key === 'j' || e.key === 'J' || e.key === 'Enter') setRestHealInfo(null); }}
              className="px-6 py-2 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded border border-emerald-600 text-sm"
              autoFocus
            >
              Journey Onward [J]
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
