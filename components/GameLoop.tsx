
import React, { useEffect, useRef, useState } from 'react';
import { Character, Enemy, Ability, AbilityType, Attribute, ItemSlot, Item, EnemyAbility, SpriteFrame, Buff, BuffType, OffHandType, ItemType } from '../types';
import { calculatePlayerDamage, generateEnemy, generateLoot, calculateTotalStats } from '../services/engine';
import { ABILITY_DB, getCritChance, getEvasion, POTION_COOLDOWN, SCROLL_DB, getExpForLevel, getHp, getCooldownReduction } from '../constants';
import { draw as drawScene, CANVAS_WIDTH, CANVAS_HEIGHT, GROUND_Y } from '../render/canvas';
import TopHUD from './game/TopHUD';
import BottomControls from './game/BottomControls';
import BattleSummary from './game/BattleSummary';
import { Heart, Zap, Shield, Sword, ChevronsRight, Trophy, LogOut, Lock, ArrowRight, Ghost, Footprints, Crosshair, Wind, Droplets, Flame, Book, Tornado, Skull, ArrowLeft, ChevronLeft, ChevronRight, FlaskConical, Map, Scroll, HelpCircle, Hammer, Wand } from 'lucide-react';

interface Props {
  character: Character;
  onExit: (updatedChar: Character) => void;
  onDeath: () => void;
}

const PLAYER_SPEED = 2.5;
// Character width on canvas: sprite is 12 cols × scale 5 = 60px.
// Used as a reference unit for ability ranges (Dash distance, Aura Shield push).
const CHARACTER_WIDTH = 60;

type AIState = 'IDLE' | 'ADVANCE' | 'PREPARE' | 'ATTACK' | 'RETREAT' | 'COOLDOWN' | 'STUNNED' | 'DEFENDING' | 'CASTING';
type PlayerState = 'IDLE' | 'MOVING' | 'ATTACKING' | 'DEFENDING' | 'CASTING';

interface Projectile {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    owner: 'player' | 'enemy';
    damage: number;
    isCrit: boolean;
    color: string;
    size: number;
    effectType?: string; 
    life: number;
}

interface VisualEffect {
    id: number;
    type: 'SLASH' | 'IMPACT' | 'SMASH' | 'SPIN' | 'BUFF' | 'THRUST';
    x: number;
    y: number;
    life: number;
    maxLife: number;
    color: string;
    size: number;
}

const GameLoop: React.FC<Props> = ({ character, onExit, onDeath }) => {
  const playerHpBarRef = useRef<HTMLDivElement>(null);
  const playerHpTextRef = useRef<HTMLSpanElement>(null);
  const enemyHpBarRef = useRef<HTMLDivElement>(null);
  const enemyContainerRef = useRef<HTMLDivElement>(null);
  const cooldownRefs = useRef<Record<string, HTMLDivElement | null>>({});
  
  const characterRef = useRef(character);
  useEffect(() => { characterRef.current = character; }, [character]);

  const gameState = useRef({
    playerX: 100,
    playerHp: 0,
    playerMaxHp: 0,
    playerState: 'IDLE' as PlayerState,
    playerVx: 0, 
    attackTimer: 0, 
    attackDuration: 0, 
    
    castTimer: 0,
    castTotalTime: 0,
    pendingAbilityId: null as string | null,
    
    enemy: null as Enemy | null,
    enemyX: 800,
    enemyVx: 0, 
    enemyAI: {
        state: 'IDLE' as AIState,
        timer: 0,
        abilityToCast: null as EnemyAbility | null
    },
    
    impactTimer: 0, 
    lastTime: 0,
    keys: {} as Record<string, boolean>,
    cooldowns: {} as Record<string, number>,
    usable1Cd: 0, 
    usable2Cd: 0,
    potionGlobalCd: 0, 

    floatingTexts: [] as { id: number, x: number, y: number, text: string, color: string, life: number }[],
    particles: [] as { x: number, y: number, vx: number, vy: number, life: number, color: string, size: number }[],
    projectiles: [] as Projectile[],
    vfx: [] as VisualEffect[],
    activeBuffs: [] as Buff[],

    stage: 1,
    isPaused: false,
    goldGained: 0,
    expGained: 0,
    lootFound: [] as Item[],
    animFrame: 0,
    parallaxOffset: 0,
    currentAttackSpeed: 1000, 
    cachedTotalStats: null as Record<Attribute, number> | null,
    enemyAbilityCooldowns: {} as Record<string, number>
  });

  const [hudStatic, setHudStatic] = useState({
    stage: 1,
    enemyName: '',
    enemyMaxHp: 100,
    equippedUsable1: character.equipment[ItemSlot.USABLE1],
    equippedUsable2: character.equipment[ItemSlot.USABLE2],
    buffs: [] as Buff[] 
  });

  const [battleSummary, setBattleSummary] = useState<{
    show: boolean;
    exp: number;
    gold: number;
    drops: Item[];
    isLevelUp?: boolean;
  } | null>(null);

  const battleSummaryRef = useRef(battleSummary);
  useEffect(() => { battleSummaryRef.current = battleSummary; }, [battleSummary]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  
  useEffect(() => {
    if (!character) return; 

    const stats = calculateTotalStats(character);
    gameState.current.cachedTotalStats = stats; 

    const maxHp = Math.max(10, getHp(stats[Attribute.HT]));
    gameState.current.playerMaxHp = maxHp;
    gameState.current.playerHp = character.currentHp !== undefined ? character.currentHp : maxHp;
    gameState.current.stage = character.maxStage || 1; 
    gameState.current.currentAttackSpeed = Math.max(500, 1500 - (stats[Attribute.DX] * 34));

    setHudStatic(prev => ({ 
        ...prev, 
        stage: character.maxStage || 1, 
        equippedUsable1: character.equipment[ItemSlot.USABLE1],
        equippedUsable2: character.equipment[ItemSlot.USABLE2]
    }));

    if (playerHpBarRef.current) playerHpBarRef.current.style.width = '100%';
    if (playerHpTextRef.current) playerHpTextRef.current.innerText = `${Math.floor(Math.max(0, gameState.current.playerHp))} / ${maxHp}`;

    spawnEnemy();

    const handleKeyDown = (e: KeyboardEvent) => { 
        if (e.repeat) return;
        
        if (battleSummaryRef.current?.show) {
            if (e.code === 'KeyH' || e.code === 'Enter') {
                handleContinueJourney();
                return;
            }
            if (e.code === 'KeyJ' || e.code === 'Escape') {
                handleExit();
                return;
            }
        }

        gameState.current.keys[e.code] = true; 
        handleActionKey(e.code);
    };
    const handleKeyUp = (e: KeyboardEvent) => { gameState.current.keys[e.code] = false; };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    gameState.current.lastTime = performance.now();
    requestRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  // ... (Key Handler, Particles, VFX, Projectile Logic same as previous)
  const handleActionKey = (code: string) => {
      if (gameState.current.isPaused) return;

      const char = characterRef.current;
      const activeAbilities = char.equippedAbilities.filter(id => {
          const a = ABILITY_DB.find(db => db.id === id);
          return a && a.type === AbilityType.ACTIVE;
      });

      switch(code) {
          case 'KeyH': // Attack
              handleManualAttack();
              break;
          case 'KeyJ': // Ability 1
              if (activeAbilities[0]) handleAbilityUse(activeAbilities[0]);
              break;
          case 'KeyK': // Ability 2
              if (activeAbilities[1]) handleAbilityUse(activeAbilities[1]);
              break;
          case 'KeyL': // Ability 3
              if (activeAbilities[2]) handleAbilityUse(activeAbilities[2]);
              break;
          case 'KeyU': // Item 1
              handleConsumeItem(ItemSlot.USABLE1);
              break;
          case 'KeyI': // Item 2
              handleConsumeItem(ItemSlot.USABLE2);
              break;
      }
  };

  const spawnEnemy = () => {
    const stats = gameState.current.cachedTotalStats || calculateTotalStats(character);
    const enemy = generateEnemy(gameState.current.stage, character.level, stats[Attribute.LUCK]);
    gameState.current.enemy = enemy;
    gameState.current.enemyX = CANVAS_WIDTH + 150; 
    gameState.current.enemyAI = { state: 'IDLE', timer: 0, abilityToCast: null }; 
    gameState.current.enemyVx = 0;
    gameState.current.playerVx = 0;
    gameState.current.enemyAbilityCooldowns = {}; 
    gameState.current.projectiles = []; 
    
    setHudStatic(prev => ({
        ...prev,
        enemyName: enemy.name,
        enemyMaxHp: enemy.maxHp
    }));

    if (enemy.isBoss) {
        addFloatingText(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 100, "⚠️ MINI-BOSS DETECTED ⚠️", "red");
        addFloatingText(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 60, enemy.name, "orange");
        addParticles(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 80, 50, "red");
    }
    
    if (enemyContainerRef.current) enemyContainerRef.current.style.opacity = '1';
    if (enemyHpBarRef.current) enemyHpBarRef.current.style.width = '100%';
  };

  const addFloatingText = (x: number, y: number, text: string, color: string) => {
    gameState.current.floatingTexts.push({
      id: Math.random(),
      x, y, text, color, life: 80 
    });
  };

  const addParticles = (x: number, y: number, count: number, color: string) => {
      for(let i=0; i<count; i++) {
          gameState.current.particles.push({
              x, y,
              vx: (Math.random() - 0.5) * 8,
              vy: (Math.random() - 0.5) * 8 - 2,
              life: 20 + Math.random() * 15,
              color,
              size: 2 + Math.random() * 4
          });
      }
  };

  const addVFX = (type: VisualEffect['type'], x: number, y: number, color: string, size: number = 50) => {
      gameState.current.vfx.push({
          id: Math.random(),
          type,
          x,
          y,
          color,
          size,
          life: 20, 
          maxLife: 20
      });
  };

  const spawnProjectile = (owner: 'player' | 'enemy', startX: number, startY: number, targetX: number, damage: number, isCrit: boolean, color: string, effectType?: string) => {
      const dx = targetX - startX;
      const speed = 12;
      const angle = Math.atan2(0, dx); 
      
      gameState.current.projectiles.push({
          id: Math.random(),
          x: startX,
          y: startY,
          vx: Math.cos(angle) * speed * (dx < 0 ? -1 : 1), 
          vy: 0,
          owner,
          damage,
          isCrit,
          color,
          size: 6,
          life: 100, 
          effectType
      });
  };

  const triggerEnemyRetreat = () => {
      const state = gameState.current;
      if (!state.enemy || state.enemyAI.state === 'STUNNED') return;
      const ht = state.enemy.attributes[Attribute.HT] || 5; 
      let durationSec = 5 - (ht / 3);
      if (durationSec < 1) durationSec = 1;

      state.enemyAI.state = 'RETREAT';
      state.enemyAI.timer = durationSec * 1000;
      addFloatingText(state.enemyX, GROUND_Y - 120, "Fear!", "white");
  };

  const applyKnockback = (target: 'player' | 'enemy', velocity: number) => {
      const state = gameState.current;
      if (target === 'player') {
          state.playerVx = -velocity;
          state.attackTimer = 0; 
          if (state.castTimer > 0) {
              state.castTimer = 0;
              state.pendingAbilityId = null;
              addFloatingText(state.playerX, GROUND_Y - 100, "Interrupted!", "yellow");
          }
      } else {
          state.enemyVx = velocity;
          if (state.enemyAI.state === 'ATTACK' || state.enemyAI.state === 'PREPARE' || state.enemyAI.state === 'CASTING') {
              state.enemyAI.state = 'IDLE'; 
              state.enemyAI.timer = 500; 
          }
      }
  };

  const loop = (time: number) => {
    if (gameState.current.playerHp < 1) {
        onDeath();
        return; 
    }

    if (!gameState.current.isPaused) {
        const dt = time - gameState.current.lastTime;
        const safeDt = Math.min(dt, 50); 
        gameState.current.lastTime = time;

        update(safeDt);
        drawGame();
        updateUI(); 
    } else {
        gameState.current.lastTime = time;
    }

    requestRef.current = requestAnimationFrame(loop);
  };

  const update = (dt: number) => {
    const state = gameState.current;
    
    if (state.playerHp < 0) state.playerHp = 0;

    if (state.impactTimer > 0) {
        state.impactTimer -= dt;
        return; 
    }

    // Decrement duration for ALL buffs, then check mechanic-specific expiry.
    // Previously, buffs with `charges` (Dash) returned early via
    // `return b.charges > 0` and buffs with `barrierHp` (Aura Shield, Majesty)
    // returned early via `return false` when barrier broke — neither had
    // their duration decremented, so an unbroken/unspent buff lasted forever.
    state.activeBuffs = state.activeBuffs.filter(b => {
        b.duration -= dt;
        if (b.duration <= 0) return false;
        if (b.charges !== undefined && b.charges <= 0) return false;
        if (b.barrierHp !== undefined && b.barrierHp <= 0) return false;
        return true;
    });

    const totalStats = calculateTotalStats(character, state.activeBuffs);
    state.cachedTotalStats = totalStats; 
    state.currentAttackSpeed = Math.max(500, 1500 - (totalStats[Attribute.DX] * 34));

    state.animFrame++;
    if (state.attackTimer > 0) state.attackTimer -= dt;

    if (Math.abs(state.playerVx) > 0.1) {
        state.playerX += state.playerVx;
        state.playerVx *= 0.9; 
        if (state.playerX < 50) { state.playerX = 50; state.playerVx = 0; }
        if (state.playerX > CANVAS_WIDTH - 50) { state.playerX = CANVAS_WIDTH - 50; state.playerVx = 0; }
    }
    if (Math.abs(state.enemyVx) > 0.1) {
        state.enemyX += state.enemyVx;
        state.enemyVx *= 0.9; 
        if (state.enemyX > CANVAS_WIDTH + 150) { state.enemyX = CANVAS_WIDTH + 150; state.enemyVx = 0; }
    }

    let isMoving = false;
    let isDefending = false;
    const moveSpeed = PLAYER_SPEED + (totalStats[Attribute.DX] * 0.02);

    if (state.castTimer > 0) {
        state.castTimer -= dt;
        if (state.castTimer <= 0 && state.pendingAbilityId) {
            executeAbilityEffect(state.pendingAbilityId);
            state.pendingAbilityId = null;
        }
    }

    const moveRightInput = state.keys['ArrowRight'] || state.keys['KeyD'];
    const moveLeftInput = state.keys['ArrowLeft'] || state.keys['KeyA'];

    if (moveRightInput && !moveLeftInput) {
        if (state.castTimer > 0) {
            state.castTimer = 0; 
            state.pendingAbilityId = null;
        }
        state.playerX = Math.min(state.playerX + moveSpeed, CANVAS_WIDTH - 100);
        state.parallaxOffset += 0.5;
        isMoving = true;
    } else if (moveLeftInput && !moveRightInput) {
        if (state.castTimer > 0) {
            state.castTimer = 0; 
            state.pendingAbilityId = null;
        }
        const isThreatened = state.enemy && (state.enemyAI.state === 'PREPARE' || state.enemyAI.state === 'ATTACK' || state.enemyAI.state === 'CASTING');
        
        if (isThreatened && state.attackTimer <= 0) {
            isDefending = true;
        } else {
            state.playerX = Math.max(state.playerX - moveSpeed, 50);
            state.parallaxOffset -= 0.5;
            isMoving = true;
        }
    }

    state.playerState = state.castTimer > 0 ? 'CASTING' : (isDefending ? 'DEFENDING' : (isMoving ? 'MOVING' : (state.attackTimer > 0 ? 'ATTACKING' : 'IDLE')));

    if (state.enemy) {
        const ai = state.enemyAI;
        const dist = state.enemyX - state.playerX;
        const meleeRange = 110; 
        const retreatDistance = 250; 

        if (ai.timer > 0) ai.timer -= dt;
        Object.keys(state.enemyAbilityCooldowns).forEach(k => {
             if(state.enemyAbilityCooldowns[k] > 0) state.enemyAbilityCooldowns[k] -= dt;
        });
        
        if (state.impactTimer > 0) {
            // Do nothing
        } else if (Math.abs(state.enemyVx) < 0.5) { 
            switch (ai.state) {
                case 'IDLE':
                    if (dist < 1000) ai.state = 'ADVANCE';
                    break;

                case 'ADVANCE':
                    if (dist > meleeRange) {
                         const rangedAbility = state.enemy.abilities.find(a => a.effect === 'ranged');
                         const canCastRanged = rangedAbility && (state.enemyAbilityCooldowns[rangedAbility.id] || 0) <= 0;

                         if (canCastRanged && dist < rangedAbility.range && dist > 200) {
                             ai.state = 'CASTING';
                             ai.abilityToCast = rangedAbility;
                             const castTime = state.enemy.isBoss ? rangedAbility.castTime * 0.75 : rangedAbility.castTime;
                             ai.timer = castTime;
                             addFloatingText(state.enemyX, GROUND_Y - 140, "CASTING!", "fuchsia");
                         } else {
                             state.enemyX -= state.enemy.speed;
                         }
                    } else {
                        const readyAbilities = state.enemy.abilities.filter(a => a.effect !== 'ranged' && (state.enemyAbilityCooldowns[a.id] || 0) <= 0);
                        if (readyAbilities.length > 0 && Math.random() < 0.4) {
                             const ability = readyAbilities[Math.floor(Math.random() * readyAbilities.length)];
                             ai.state = 'CASTING';
                             ai.abilityToCast = ability;
                             const castTime = state.enemy.isBoss ? ability.castTime * 0.75 : ability.castTime;
                             ai.timer = castTime;
                             addFloatingText(state.enemyX, GROUND_Y - 140, "CASTING!", "fuchsia");
                        } else {
                            ai.state = 'PREPARE';
                            const bossMod = state.enemy.isBoss ? 50 : 0;
                            ai.timer = Math.max(50, (300 + Math.random() * 150) - bossMod); 
                        }
                    }
                    break;

                case 'PREPARE':
                    if (ai.timer <= 0) {
                        ai.state = 'ATTACK';
                    }
                    break;

                case 'CASTING':
                     if (ai.timer <= 0 && ai.abilityToCast) {
                         handleEnemyAbility(ai.abilityToCast);
                         ai.abilityToCast = null;
                         ai.state = 'COOLDOWN';
                         ai.timer = 1000; 
                     }
                     break;

                case 'ATTACK':
                    if (state.impactTimer <= 0) { 
                        if (dist <= meleeRange + 10) {
                            performEnemyAttack(totalStats);
                        } else {
                            addFloatingText(state.enemyX, GROUND_Y - 80, "Miss!", "gray");
                        }
                        ai.state = 'COOLDOWN';
                        const cooldownMod = state.enemy.isBoss ? 0.75 : 1.0;
                        ai.timer = (500 + Math.random() * 500) * cooldownMod;
                    }
                    break;

                case 'RETREAT':
                    if (ai.timer > 0 && dist < retreatDistance) {
                        state.enemyX += state.enemy.speed * 0.7;
                    } else {
                        ai.state = 'COOLDOWN';
                        ai.timer = 200 + Math.random() * 200;
                    }
                    break;

                case 'COOLDOWN':
                    if (ai.timer <= 0) {
                        ai.state = 'ADVANCE';
                    } 
                    break;
                
                case 'STUNNED':
                    if (ai.timer <= 0) {
                        ai.state = 'IDLE';
                        addFloatingText(state.enemyX, GROUND_Y - 120, "Recovered!", "white");
                    }
                    break;
                case 'DEFENDING':
                    if (ai.timer <= 0) ai.state = 'IDLE';
                    break;
            }
        }

        if (state.enemyX < state.playerX + 30) state.enemyX = state.playerX + 30;

        if (state.enemy.hp <= 0) {
            handleEnemyDeath(totalStats);
            return;
        }
    }

    const projectilesToRemove: number[] = [];
    state.projectiles.forEach((p, index) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;

        if (state.animFrame % 2 === 0) {
            state.particles.push({
                x: p.x, y: p.y,
                vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2,
                life: 10, color: p.color, size: 2
            });
        }

        let hit = false;
        if (p.owner === 'player' && state.enemy) {
             if (Math.abs(p.x - state.enemyX) < 30) {
                 hit = true;
                 applyProjectileDamageToEnemy(p, totalStats);
             }
        } else if (p.owner === 'enemy') {
             if (Math.abs(p.x - state.playerX) < 20) {
                 hit = true;
                 applyProjectileDamageToPlayer(p);
             }
        }

        if (hit || p.life <= 0 || p.x < 0 || p.x > CANVAS_WIDTH + 200) {
            projectilesToRemove.push(index);
            if (hit) {
                 addVFX('IMPACT', p.x, p.y, p.color, 30);
            }
        }
    });
    for(let i = projectilesToRemove.length - 1; i >= 0; i--) {
        state.projectiles.splice(projectilesToRemove[i], 1);
    }

    Object.keys(state.cooldowns).forEach(key => {
        if (state.cooldowns[key] > 0) state.cooldowns[key] -= dt;
    });
    if (state.usable1Cd > 0) state.usable1Cd -= dt;
    if (state.usable2Cd > 0) state.usable2Cd -= dt;
    if (state.potionGlobalCd > 0) state.potionGlobalCd -= dt;

    state.floatingTexts.forEach(t => { t.y -= 1; t.life--; });
    state.floatingTexts = state.floatingTexts.filter(t => t.life > 0);

    state.particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.3; p.life--;
    });
    state.particles = state.particles.filter(p => p.life > 0);

    state.vfx.forEach(v => { v.life--; });
    state.vfx = state.vfx.filter(v => v.life > 0);
  };

  // ... (applyProjectileDamageToEnemy/Player, performEnemyAttack, handleEnemyAbility same)
  // Re-pasting existing logic functions to maintain file integrity
  const applyProjectileDamageToEnemy = (p: Projectile, totalStats: Record<Attribute, number>) => {
      const state = gameState.current;
      if (!state.enemy) return;
      
      let finalDmg = p.damage;

      const hasBackstabPassive = character.unlockedAbilities.includes('tactics_mastery');
      if (hasBackstabPassive && (state.enemyAI.state === 'STUNNED' || state.enemyAI.state === 'RETREAT')) {
          // Backstab scales with ability level: +30% / +45% / +60% at L1/L2/L3.
          const backstabLvl = character.abilityLevels?.['tactics_mastery'] || 1;
          const backstabMult = 1 + (0.15 + (backstabLvl - 1) * 0.15);
          finalDmg *= backstabMult;
          addFloatingText(state.enemyX, GROUND_Y - 140, "Backstab!", "red");
      }

      const isEnemyAttacking = state.enemyAI.state === 'ATTACK' || state.enemyAI.state === 'CASTING';
      const isControl = state.enemyAI.state === 'STUNNED' || state.enemyAI.state === 'RETREAT';
      let isBlocked = false;
      if (!isEnemyAttacking && !isControl) {
           const baseBlock = 0.20;
           const levelBlock = (state.stage * 0.75) / 100; 
           const blockChance = Math.min(0.40, baseBlock + levelBlock);
           isBlocked = Math.random() < blockChance;
      }

      if (isBlocked) {
           finalDmg = Math.ceil(finalDmg * 0.2);
           state.enemy.hp -= finalDmg;
           addFloatingText(state.enemyX, GROUND_Y - 80, "Blocked!", "white");
           state.impactTimer = 45; 
           applyKnockback('enemy', 1); 
           addVFX('IMPACT', state.enemyX, GROUND_Y - 40, "blue");
      } else {
           state.enemy.hp -= finalDmg;
           applyKnockback('enemy', 1.5);
           addFloatingText(state.enemyX, GROUND_Y - 100, `${Math.floor(finalDmg)}`, p.isCrit ? "gold" : "orange");
           addVFX('IMPACT', state.enemyX, GROUND_Y - 40, "red");
           if (p.isCrit) {
               const chance = 0.4 - (state.enemy.fearResist / 100);
               if (Math.random() < chance) triggerEnemyRetreat();
           }
      }
  };

  const applyProjectileDamageToPlayer = (p: Projectile) => {
      const state = gameState.current;
      let finalDmg = p.damage;

      const barrier = state.activeBuffs.find(b => b.barrierHp && b.barrierHp > 0);
      if (barrier && barrier.barrierHp) {
           if (state.playerState !== 'DEFENDING') {
                const absorbed = Math.min(finalDmg, barrier.barrierHp);
                barrier.barrierHp -= absorbed;
                finalDmg -= absorbed;
                addFloatingText(state.playerX, GROUND_Y - 120, `Absorbed ${Math.floor(absorbed)}`, "cyan");
                if (finalDmg <= 0) return;
           }
      }

      if (state.playerState === 'DEFENDING') {
           finalDmg *= 0.2;
           addFloatingText(state.playerX, GROUND_Y - 100, "Blocked!", "blue");
           addVFX('IMPACT', state.playerX, GROUND_Y - 40, "blue");
      } else {
           addVFX('IMPACT', state.playerX, GROUND_Y - 40, "red");
      }
      finalDmg = Math.floor(finalDmg);
      state.playerHp -= finalDmg;
      addFloatingText(state.playerX, GROUND_Y - 80, `-${finalDmg}`, "cyan");
  };

  const performEnemyAttack = (totalStats: Record<Attribute, number>) => {
      const state = gameState.current;
      if (!state.enemy) return;
      
      let evasion = getEvasion(totalStats[Attribute.DX]);
      
      // Check Buckler in Offhand for Evasion Bonus
      const offHand = character.equipment[ItemSlot.OFF_HAND];
      if (offHand && offHand.offHandType === OffHandType.BUCKLER) {
          evasion += 5; // Minimal bonus
      }

      const dashBuff = state.activeBuffs.find(b => b.name === 'Dash');
      if (dashBuff && dashBuff.charges && dashBuff.charges > 0) {
          evasion = 80; 
          dashBuff.charges -= 1;
          addFloatingText(state.playerX, GROUND_Y - 120, `Dash! (${dashBuff.charges})`, "white");
      }

      if (Math.random() * 100 < evasion) {
          addFloatingText(state.playerX, GROUND_Y - 80, "Evade!", "cyan");
      } else {
          const parryBuff = state.activeBuffs.find(b => b.name === 'Parry');
          if (parryBuff) {
               addFloatingText(state.playerX, GROUND_Y - 100, "PARRY!", "gold");
               addVFX('IMPACT', state.playerX, GROUND_Y - 40, "gold");
               const result = calculatePlayerDamage(character, false, state.activeBuffs); 
               const counterDmg = result.damage * 1.5;
               state.enemy.hp -= Math.floor(counterDmg);
               addFloatingText(state.enemyX, GROUND_Y - 100, `Counter! ${Math.floor(counterDmg)}`, "gold");
               addVFX('SLASH', state.enemyX, GROUND_Y - 40, 'gold');
               applyKnockback('enemy', 2);
               parryBuff.duration = 0; 
               return; 
          }

          let dmg = Math.max(1, state.enemy.damage);

          const barrier = state.activeBuffs.find(b => b.barrierHp && b.barrierHp > 0);
          if (state.playerState !== 'DEFENDING' && barrier && barrier.barrierHp) {
              const absorbed = Math.min(dmg, barrier.barrierHp);
              barrier.barrierHp -= absorbed;
              dmg -= absorbed;
              addFloatingText(state.playerX, GROUND_Y - 140, `Barrier -${Math.floor(absorbed)}`, "cyan");
          }

          if (dmg > 0) {
              if (state.playerState === 'DEFENDING') {
                  dmg = Math.ceil(dmg * 0.2); 
                  addFloatingText(state.playerX, GROUND_Y - 100, "Blocked!", "blue");
                  applyKnockback('player', 2); 
                  applyKnockback('enemy', 1); 
                  state.impactTimer = 45; 
                  addVFX('IMPACT', state.playerX, GROUND_Y - 40, "blue");
              } else {
                  const mainHand = character.equipment[ItemSlot.MAIN_HAND];
                  const offHand = character.equipment[ItemSlot.OFF_HAND];
                  let passiveBlockChance = 0;
                  if (mainHand?.blockChance) passiveBlockChance += mainHand.blockChance;
                  if (offHand?.blockChance) passiveBlockChance += offHand.blockChance;
                  
                  if (Math.random() * 100 < passiveBlockChance) {
                       dmg = Math.ceil(dmg * 0.3);
                       addFloatingText(state.playerX, GROUND_Y - 100, "Shield Block!", "white");
                       applyKnockback('player', 1);
                       state.impactTimer = 30;
                       addVFX('IMPACT', state.playerX, GROUND_Y - 40, "gray");
                  } else {
                       state.playerHp -= dmg;
                       applyKnockback('player', 1.25);
                       addFloatingText(state.playerX, GROUND_Y - 80, `-${Math.floor(dmg)}`, "red");
                       addVFX('IMPACT', state.playerX, GROUND_Y - 40, "red");
                  }
              }
          } else {
              addVFX('IMPACT', state.playerX, GROUND_Y - 40, "cyan");
          }
      }
  };

  const handleEnemyAbility = (ability: EnemyAbility) => {
      const state = gameState.current;
      if (!state.enemy) return;
      state.enemyAbilityCooldowns[ability.id] = ability.cooldown;
      addFloatingText(state.enemyX, GROUND_Y - 140, ability.name.toUpperCase() + "!", "fuchsia");
      let baseDmg = state.enemy.damage * ability.damageMult;
      
      const applyBarrier = (incoming: number) => {
           if (state.playerState === 'DEFENDING') return incoming;
           const barrier = state.activeBuffs.find(b => b.barrierHp && b.barrierHp > 0);
           if (barrier && barrier.barrierHp) {
                const absorbed = Math.min(incoming, barrier.barrierHp);
                barrier.barrierHp -= absorbed;
                addFloatingText(state.playerX, GROUND_Y - 140, `Barrier -${Math.floor(absorbed)}`, "cyan");
                return incoming - absorbed;
           }
           return incoming;
      };

      if (ability.effect === 'lifesteal') {
          let dmg = baseDmg;
          if (state.playerState === 'DEFENDING') {
               dmg = baseDmg * 0.8; 
               addFloatingText(state.playerX, GROUND_Y - 100, "Shield Pierced!", "purple");
               applyKnockback('player', 2);
          } else {
               applyKnockback('player', 1.5);
          }
          dmg = applyBarrier(dmg);
          
          const finalDmg = Math.floor(dmg);
          state.playerHp -= finalDmg;
          state.enemy.hp = Math.min(state.enemy.maxHp, state.enemy.hp + finalDmg); 
          addVFX('IMPACT', state.playerX, GROUND_Y - 40, "purple");
          for(let i=0; i<20; i++) {
              state.particles.push({
                  x: state.playerX, y: GROUND_Y - 60,
                  vx: (state.enemyX - state.playerX) / 20 + Math.random(),
                  vy: (Math.random() - 0.5) * 5,
                  life: 30, color: 'red', size: 4
              });
          }
      } else if (ability.effect === 'stun') {
           if (state.playerState === 'DEFENDING') {
               baseDmg *= 0.3;
               addFloatingText(state.playerX, GROUND_Y - 100, "Heavy Block!", "blue");
               applyKnockback('player', 3); 
           } else {
               applyKnockback('player', 4);
           }
           baseDmg = applyBarrier(baseDmg);
           const finalDmg = Math.floor(baseDmg);
           state.playerHp -= finalDmg;
           addVFX('SMASH', state.playerX, GROUND_Y, "orange");
           addFloatingText(state.playerX, GROUND_Y - 80, `-${finalDmg}`, "red");
           
           state.castTimer = 0;
           state.pendingAbilityId = null;

      } else if (ability.effect === 'ranged') {
           spawnProjectile('enemy', state.enemyX - 20, GROUND_Y - 50, state.playerX, baseDmg, false, 'cyan', 'damage');
      }
  };

  const updateUI = () => {
      const state = gameState.current;

      // Re-render the buff row whenever the buff SET changes (length) OR
      // whenever a buff's internal state changes (charges, barrierHp).
      // The previous check (length-only) meant the Dash charge counter and
      // the Aura Shield / Majesty barrier HP value froze in the HUD until
      // another buff entered or left.
      const buffsSignature = state.activeBuffs
          .map(b => `${b.id}|${b.charges ?? 0}|${Math.ceil(b.barrierHp ?? 0)}`)
          .join(';;');
      const lastSignature = hudStatic.buffs
          .map(b => `${b.id}|${b.charges ?? 0}|${Math.ceil(b.barrierHp ?? 0)}`)
          .join(';;');
      if (buffsSignature !== lastSignature) {
          setHudStatic(prev => ({ ...prev, buffs: state.activeBuffs.map(b => ({ ...b })) }));
      }

      if (playerHpBarRef.current) {
          const pct = Math.max(0, (state.playerHp / state.playerMaxHp) * 100);
          playerHpBarRef.current.style.width = `${pct}%`;
      }
      if (playerHpTextRef.current) {
          playerHpTextRef.current.innerText = `${Math.floor(Math.max(0, state.playerHp))} / ${state.playerMaxHp}`;
      }
      if (state.enemy && enemyHpBarRef.current) {
          const pct = Math.max(0, (state.enemy.hp / state.enemy.maxHp) * 100);
          enemyHpBarRef.current.style.width = `${pct}%`;
      }
      
      const updateButtonVisual = (el: HTMLDivElement | null, currentCd: number, maxCd: number, buttonEl?: HTMLElement) => {
          if (!el) return;
          if (currentCd > 0) {
              const pct = (currentCd / maxCd) * 100;
              el.style.height = `${pct}%`; 
              el.style.opacity = '1';
              if (buttonEl) buttonEl.style.filter = 'grayscale(100%)';
          } else {
              el.style.height = '0%'; 
              el.style.opacity = '0';
              if (buttonEl) buttonEl.style.filter = 'none';
          }
      };

      character.equippedAbilities.slice(0, 3).forEach(abId => {
          const el = cooldownRefs.current[abId];
          const btn = document.getElementById(`btn-ability-${abId}`);
          const ability = ABILITY_DB.find(a => a.id === abId);
          const currentCd = state.cooldowns[abId] || 0;
          updateButtonVisual(el, currentCd, ability?.cooldown || 1000, btn || undefined);
      });

      const atkEl = cooldownRefs.current['auto_attack'];
      const atkBtn = document.getElementById('btn-attack');
      updateButtonVisual(atkEl, state.cooldowns['auto_attack'] || 0, state.currentAttackSpeed, atkBtn || undefined);
      
      const u1Item = character.equipment[ItemSlot.USABLE1];
      const u2Item = character.equipment[ItemSlot.USABLE2];

      const u1Cd = !!u1Item?.name.includes('Potion') ? Math.max(state.usable1Cd, state.potionGlobalCd) : state.usable1Cd;
      const u2Cd = !!u2Item?.name.includes('Potion') ? Math.max(state.usable2Cd, state.potionGlobalCd) : state.usable2Cd;
      // The display MAX must match the actual cooldown the player experiences.
      // For potions: that's the global potion cooldown (10s) since it always
      //   overrides the shorter 5s slot CD.
      // For scrolls: that's item.duration (20-45s depending on scroll), since
      //   handleConsumeItem sets the slot CD = duration for scrolls.
      // Previously the max was hardcoded at 10000ms for scrolls, so the bar
      // visually emptied at 10s while the scroll was still on cooldown for
      // another 10-35s.
      const getItemMaxCooldown = (item?: Item): number => {
          if (!item) return 10000;
          if (item.name.includes('Potion')) return POTION_COOLDOWN;
          return item.duration || 10000;
      };
      const u1Max = getItemMaxCooldown(u1Item);
      const u2Max = getItemMaxCooldown(u2Item);

      updateButtonVisual(cooldownRefs.current['usable1'], u1Cd, u1Max, document.getElementById('btn-u1') || undefined);
      updateButtonVisual(cooldownRefs.current['usable2'], u2Cd, u2Max, document.getElementById('btn-u2') || undefined);
  };

  const handleConsumeItem = (slot: ItemSlot.USABLE1 | ItemSlot.USABLE2) => {
      const state = gameState.current;
      const equippedItem = characterRef.current.equipment[slot];
      
      if (!equippedItem) {
          addFloatingText(state.playerX, GROUND_Y - 100, "Empty Slot!", "gray");
          return;
      }
      
      const isPotion = equippedItem.name.includes('Potion');
      
      if (slot === ItemSlot.USABLE1 && state.usable1Cd > 0) return;
      if (slot === ItemSlot.USABLE2 && state.usable2Cd > 0) return;
      if (isPotion && state.potionGlobalCd > 0) {
          addFloatingText(state.playerX, GROUND_Y - 100, "Potion CD!", "gray");
          return;
      }

      const duration = equippedItem.duration || 10000;
      const cooldown = isPotion ? 5000 : duration; 

      if (isPotion) {
          const healAmount = equippedItem.magnitude || 50; 
          state.playerHp = Math.min(state.playerMaxHp, state.playerHp + healAmount);
          addFloatingText(state.playerX, GROUND_Y - 100, `+${Math.floor(healAmount)} HP`, "green");
          addVFX('BUFF', state.playerX, GROUND_Y, "green");
          state.potionGlobalCd = POTION_COOLDOWN; 
      } else {
          let buff: Buff = {
              id: `buff_${Date.now()}`,
              name: equippedItem.name.replace('Lesser ', '').replace('Greater ', '').replace('Major ', ''),
              type: BuffType.STAT,
              duration: duration,
              icon: 'Scroll'
          };
          
          let tierMult = 1;
          if (equippedItem.tier === 'Greater') tierMult = 1.5;
          if (equippedItem.tier === 'Major') tierMult = 2;

          const baseName = buff.name;

          if (baseName.includes('Scroll of Power')) {
              buff.damageBonus = 0.5 * tierMult; 
          } else if (baseName.includes('Stone Skin')) {
              buff.statBonus = { [Attribute.HT]: 10 * tierMult };
          } else if (baseName.includes('Feral Instinct')) {
              buff.critBonus = 20 * tierMult; 
          } else if (baseName.includes('Strength of Bear')) {
              buff.statBonus = { [Attribute.ST]: 10 * tierMult };
          } else if (baseName.includes('Shadow Whispers')) {
              buff.type = BuffType.MECHANIC;
              buff.statBonus = { [Attribute.DX]: 15 * tierMult };
          } else if (baseName.includes('Ancient Wisdom')) {
              buff.statBonus = { [Attribute.INT]: 10 * tierMult };
          }

          state.activeBuffs.push(buff);
          setHudStatic(prev => ({ ...prev, buffs: [...state.activeBuffs] })); // Force UI Update
          addFloatingText(state.playerX, GROUND_Y - 100, "Buff Applied!", "gold");
          addVFX('BUFF', state.playerX, GROUND_Y, "gold");
      }

      if (slot === ItemSlot.USABLE1) state.usable1Cd = cooldown;
      if (slot === ItemSlot.USABLE2) state.usable2Cd = cooldown;

      // Immutable update: previously this block mutated characterRef.current
      // (which is the same object as the `character` prop) directly via
      // `delete char.equipment[slot]` and `char.stash.splice(...)`. That
      // violated React's "props are read-only" contract and would silently
      // break if App ever passed a fresh character object on re-render.
      //
      // Build new equipment/stash objects, then assign a fresh character
      // object to characterRef.current so the rest of the combat loop sees
      // the updated state.
      const char = characterRef.current;
      const newEquipment = { ...char.equipment };
      delete newEquipment[slot];

      const newStash = [...char.stash];
      const replacementIdx = newStash.findIndex(i => i.name === equippedItem.name);
      if (replacementIdx !== -1) {
          newEquipment[slot] = newStash[replacementIdx];
          newStash.splice(replacementIdx, 1);
          addFloatingText(state.playerX, GROUND_Y - 120, "Refilled!", "white");
      }

      characterRef.current = {
          ...char,
          equipment: newEquipment,
          stash: newStash,
      };

      setHudStatic(prev => ({
          ...prev,
          equippedUsable1: newEquipment[ItemSlot.USABLE1],
          equippedUsable2: newEquipment[ItemSlot.USABLE2]
      }));
  };

  const handleManualAttack = () => {
      const state = gameState.current;
      if (!state.enemy) return;
      if (state.cooldowns['auto_attack'] > 0) return;
      if (state.impactTimer > 0) return; 
      if (Math.abs(state.playerVx) > 0.1) return; 
      if (state.castTimer > 0) {
          addFloatingText(state.playerX, GROUND_Y - 100, "Busy!", "gray");
          return;
      }

      const dist = state.enemyX - state.playerX;
      const isMelee = character.classType === 'Warrior' || character.classType === 'Rogue';
      const weaponRange = isMelee ? 110 : 400;

      if (dist <= weaponRange && dist > 0) {
           // The `isMagic` hint is now secondary — calculatePlayerDamage
           // primarily derives the scaling attribute from the equipped
           // weapon's weaponType (MAGIC weapons scale with INT, SLASH/BLUNT
           // with ST). Passing classType === 'Mage' here is retained as a
           // hint for the rare case of a Mage with no weapon equipped
           // (falls back to baseDmg 2 with INT scaling).
           const result = calculatePlayerDamage(character, character.classType === 'Mage', state.activeBuffs);
           
           const hasBackstabPassive = character.unlockedAbilities.includes('tactics_mastery');
           if (hasBackstabPassive && (state.enemyAI.state === 'STUNNED' || state.enemyAI.state === 'RETREAT')) {
               const backstabLvl = character.abilityLevels?.['tactics_mastery'] || 1;
               const backstabMult = 1 + (0.15 + (backstabLvl - 1) * 0.15);
               result.damage *= backstabMult;
               addFloatingText(state.playerX + 50, GROUND_Y - 120, "Backstab!", "red");
           }

           if (!isMelee) {
               spawnProjectile('player', state.playerX + 20, GROUND_Y - 50, state.enemyX, result.damage, result.isCrit, '#3b82f6', 'damage');
           } else {
               if (character.classType === 'Warrior') addVFX('SLASH', state.playerX + 40, GROUND_Y - 40, 'white', 80);
               else addVFX('THRUST', state.playerX + 40, GROUND_Y - 40, 'white', 60);

               const isEnemyAttacking = state.enemyAI.state === 'ATTACK' || state.enemyAI.state === 'CASTING';
               const isControl = state.enemyAI.state === 'STUNNED' || state.enemyAI.state === 'RETREAT';
               let isBlocked = false;
               if (!isEnemyAttacking && !isControl) {
                   const baseBlock = 0.20;
                   const levelBlock = (state.stage * 0.75) / 100; 
                   const blockChance = Math.min(0.40, baseBlock + levelBlock);
                   isBlocked = Math.random() < blockChance;
               }

               if (isBlocked) {
                   addFloatingText(state.enemyX, GROUND_Y - 80, "Blocked!", "white");
                   const blockedDmg = Math.ceil(result.damage * 0.2);
                   state.enemy.hp -= blockedDmg;
                   state.impactTimer = 45; 
                   applyKnockback('enemy', 1); 
                   applyKnockback('player', 0.5); 
                   addFloatingText(state.enemyX, GROUND_Y - 60, `-${blockedDmg}`, "gray");
                   addVFX('IMPACT', state.enemyX, GROUND_Y - 40, "blue");
               } else {
                   state.enemy.hp -= Math.floor(result.damage);
                   applyKnockback('enemy', 1.3); 
                   addFloatingText(state.enemyX, GROUND_Y - 80, Math.floor(result.damage).toString(), result.isCrit ? "yellow" : "white");
                   addVFX('IMPACT', state.enemyX, GROUND_Y - 40, result.isCrit ? "gold" : "red");
                   
                   if (result.isCrit) {
                       const chance = 0.4 - (state.enemy.fearResist / 100); 
                       if (Math.random() < chance) triggerEnemyRetreat();
                   }

                   // BONUS ATTACK (Dual Wield)
                   const offHand = characterRef.current.equipment[ItemSlot.OFF_HAND];
                   const isOffhandWeapon = offHand && (offHand.type === ItemType.EQUIPMENT || offHand.offHandType === OffHandType.SWORDBREAKER) && (offHand.slot === ItemSlot.MAIN_HAND || offHand.offHandType === OffHandType.SWORDBREAKER); 
                   
                   if (offHand && offHand.damage && offHand.damage > 0 && !offHand.blockChance) { 
                        if (Math.random() < 0.5) {
                            setTimeout(() => {
                                if (!state.enemy) return;
                                const bonusDmg = Math.floor(result.damage * 0.5);
                                state.enemy.hp -= bonusDmg;
                                addFloatingText(state.enemyX + 10, GROUND_Y - 60, `${bonusDmg}`, "silver");
                                addVFX('SLASH', state.enemyX, GROUND_Y - 30, 'silver', 40);
                            }, 150);
                        }
                   }
               }
           }
           state.cooldowns['auto_attack'] = state.currentAttackSpeed;
           state.playerState = 'ATTACKING';
           state.attackDuration = 300; 
           state.attackTimer = 300;
      } else {
          addFloatingText(state.playerX, GROUND_Y - 80, "Out of Range", "gray");
      }
  };

  const handleAbilityUse = (abilityId: string) => {
    const state = gameState.current;
    const ability = ABILITY_DB.find(a => a.id === abilityId);
    if (!ability || !state.enemy) return;
    if ((state.cooldowns[abilityId] || 0) > 0) return;
    if (state.impactTimer > 0) return;
    if (Math.abs(state.playerVx) > 0.1) return;
    if (state.castTimer > 0) return; 

    const dist = state.enemyX - state.playerX;
    const range = ability.range || 80;

    if ((ability.effect === 'damage' || ability.effect === 'stun') && dist > range) {
         addFloatingText(state.playerX, GROUND_Y - 100, "Out of Range!", "gray");
         return;
    }

    const stats = state.cachedTotalStats || calculateTotalStats(character, state.activeBuffs);
    let castTime = ability.castTime || 0;
    
    if (castTime > 0) {
        const dxReduction = Math.min(0.5, stats[Attribute.DX] * 0.01); 
        castTime = Math.floor(castTime * (1 - dxReduction));
    }

    if (castTime > 0) {
        state.castTimer = castTime;
        state.castTotalTime = castTime;
        state.pendingAbilityId = abilityId;
        addFloatingText(state.playerX, GROUND_Y - 120, "Casting...", "cyan");
    } else {
        executeAbilityEffect(abilityId);
    }
  };

  const executeAbilityEffect = (abilityId: string) => {
    const state = gameState.current;
    const ability = ABILITY_DB.find(a => a.id === abilityId);
    if (!ability) return;

    const stats = state.cachedTotalStats || calculateTotalStats(character, state.activeBuffs);
    const level = character.abilityLevels ? (character.abilityLevels[abilityId] || 1) : 1;
    
    const getScaledValue = (base: number | undefined, scale: number | undefined) => {
         return (base || 0) + ((scale || 0) * (level - 1));
    };

    let used = false;
    const dist = state.enemyX - state.playerX;
    const range = ability.range || 80;

    if ((ability.effect === 'damage' || ability.effect === 'stun') && dist > range) {
        addFloatingText(state.playerX, GROUND_Y - 100, "Target Lost!", "gray");
        return;
    }

    if (ability.effect === 'damage' || ability.effect === 'stun') {
        if (state.enemy) {
             const mult = getScaledValue(ability.damageMultiplier, ability.scaling?.damage);
             let dmg = 0;
             
             if (ability.name === 'Shield Bash') {
                  const mainHand = character.equipment[ItemSlot.MAIN_HAND];
                  const offHand = character.equipment[ItemSlot.OFF_HAND];
                  const armor = (mainHand?.armor || 0) + (offHand?.armor || 0) + (character.equipment[ItemSlot.CHEST]?.armor || 0) + (character.equipment[ItemSlot.HEAD]?.armor || 0) + (character.equipment[ItemSlot.LEGS]?.armor || 0) + (character.equipment[ItemSlot.HANDS]?.armor || 0);
                  const bashMult = 2 + (level - 1); 
                  dmg = Math.max(10, armor * bashMult);
                  addFloatingText(state.playerX, GROUND_Y - 120, "Shield Bash!", "white");
             } else {
                  dmg = mult * (ability.tree === 'Mystics' ? stats[Attribute.INT] * 2 : stats[Attribute.ST] * 2);
             }
             
             const hasBackstabPassive = character.unlockedAbilities.includes('tactics_mastery');
             if (hasBackstabPassive && (state.enemyAI.state === 'STUNNED' || state.enemyAI.state === 'RETREAT')) {
                 const backstabLvl = character.abilityLevels?.['tactics_mastery'] || 1;
                 const backstabMult = 1 + (0.15 + (backstabLvl - 1) * 0.15);
                 dmg *= backstabMult;
                 addFloatingText(state.playerX + 50, GROUND_Y - 120, "Backstab!", "red");
             }

             const isRanged = ability.range && ability.range > 120;

             const isCrit = Math.random() * 100 < getCritChance(stats[Attribute.DX]);
             if (isCrit) dmg *= 1.5;

             if (isRanged) {
                 spawnProjectile('player', state.playerX + 20, GROUND_Y - 50, state.enemyX, dmg, isCrit, ability.tree === 'Mystics' ? '#3b82f6' : '#fff', ability.effect);
             } else {
                 if (ability.name === 'Shield Bash') {
                      addVFX('SMASH', state.enemyX, GROUND_Y - 40, 'gray');
                      state.enemyAI.state = 'STUNNED';
                      state.enemyAI.timer = 2000;
                      addFloatingText(state.enemyX, GROUND_Y - 120, "STUNNED!", "yellow");
                 }
                 else if (ability.name === 'Power Strike') addVFX('SMASH', state.enemyX, GROUND_Y, 'white');
                 else if (ability.name === 'Eviscerate') addVFX('SLASH', state.enemyX, GROUND_Y - 40, 'red'); 
                 else if (ability.name === 'Cheap Shot') addVFX('THRUST', state.enemyX, GROUND_Y - 40, 'white'); 
                 else addVFX('SLASH', state.enemyX, GROUND_Y - 40, 'white');

                 const isEnemyAttacking = state.enemyAI.state === 'ATTACK';
                 const isControl = state.enemyAI.state === 'STUNNED' || state.enemyAI.state === 'RETREAT';
                 let isBlocked = false;
                 if (!isEnemyAttacking && !isControl) {
                     const baseBlock = 0.20;
                     const levelBlock = (state.stage * 0.75) / 100; 
                     const blockChance = Math.min(0.40, baseBlock + levelBlock);
                     isBlocked = Math.random() < blockChance;
                 }

                 if (isBlocked) {
                     const blockedDmg = Math.ceil(dmg * 0.2);
                     state.enemy.hp -= blockedDmg;
                     addFloatingText(state.enemyX, GROUND_Y - 80, "Blocked!", "white");
                     state.impactTimer = 45; 
                     applyKnockback('enemy', 1); 
                     applyKnockback('player', 0.5); 
                 } else {
                     state.enemy.hp -= Math.floor(dmg);
                     applyKnockback('enemy', 2.5); 
                     addFloatingText(state.enemyX, GROUND_Y - 100, `${ability.name}! ${Math.floor(dmg)}`, isCrit ? "gold" : "orange");
                     addVFX('IMPACT', state.enemyX, GROUND_Y - 40, isCrit ? "gold" : "red");
                     
                     if (ability.effect === 'stun') {
                         state.enemyAI.state = 'STUNNED';
                         state.enemyAI.timer = 2000;
                         addFloatingText(state.enemyX, GROUND_Y - 120, "STUNNED!", "yellow");
                     }
                     
                     const baseChance = 0.3 + (isCrit ? 0.1 : 0);
                     const chance = baseChance - (state.enemy.fearResist / 100);
                     if (Math.random() < chance) triggerEnemyRetreat();
                 }
             }
             used = true;
        }
    } else if (ability.effect === 'heal') {
        let statBase = ability.tree === 'Might' ? stats[Attribute.ST] : stats[Attribute.INT];

        // Note: Battle Roar used to be handled here, but it has effect='buff' in
        // the DB, so this branch was unreachable for it. The heal is now applied
        // inside the buff branch below. This branch only handles pure heals
        // like "Body to Mind".
        let baseMult = ability.tree === 'Might' ? 5 : 8;
        let scaleMult = ability.scaling?.effect || 0;
        let finalMult = baseMult + (scaleMult * (level - 1));
        state.playerHp = Math.min(state.playerMaxHp, state.playerHp + (statBase * finalMult));
        addFloatingText(state.playerX, GROUND_Y - 100, "Heal!", "green");
        addVFX('BUFF', state.playerX, GROUND_Y, "green");
        used = true;
    } else {
        addFloatingText(state.playerX, GROUND_Y - 100, "Buff!", "yellow");
        addVFX('BUFF', state.playerX, GROUND_Y, "yellow");

        if (ability.name === 'Dash') {
            // Dash is now a literal dash: a quick backward (leftward) burst
            // of movement, distance = 4 × CHARACTER_WIDTH (240px). If the
            // player is too close to the left wall to complete the dash,
            // the dash "redirects" and pushes the enemy backward instead
            // (same 240px distance). Either way the player gets a brief
            // evasion buff so the dash has defensive value too.
            const dashDistance = 4 * CHARACTER_WIDTH; // 240px
            const leftWall = 50;
            const canDashBack = (state.playerX - dashDistance) >= leftWall;

            if (canDashBack) {
                // Teleport-style dash: set position directly + spin VFX trail.
                state.playerX = Math.max(leftWall, state.playerX - dashDistance);
                addVFX('SPIN', state.playerX + dashDistance / 2, GROUND_Y - 40, 'cyan', 60);
                addFloatingText(state.playerX, GROUND_Y - 120, "Dash!", "cyan");
            } else if (state.enemy) {
                // Cornered — push the enemy back instead.
                state.enemyX = Math.min(CANVAS_WIDTH + 150, state.enemyX + dashDistance);
                applyKnockback('enemy', 6);
                addVFX('SPIN', state.enemyX - dashDistance / 2, GROUND_Y - 40, 'cyan', 60);
                addFloatingText(state.enemyX, GROUND_Y - 120, "Pushed!", "cyan");
            }

            // Brief evasion buff (1s) so the dash still functions defensively.
            const dashDuration = 1000;
            state.activeBuffs.push({
                id: `buff_${Date.now()}`,
                name: 'Dash',
                type: BuffType.MECHANIC,
                duration: dashDuration,
                statBonus: {},
                charges: 1,
                icon: 'Footprints'
            });
        } else if (ability.name === 'Battle Roar') {
             // Battle Roar's tooltip says "+15% Dmg/Lvl and Heals." Previously
             // only the damage buff was applied because the heal code lived in
             // the unreachable 'heal' branch above. Apply both effects here.
             const baseDmgBonus = 0.15;
             const scaleDmg = 0.15;
             const totalDmgBonus = baseDmgBonus + (scaleDmg * (level - 1));

             const roarDuration = getScaledValue(10000, ability.scaling?.duration);

             state.activeBuffs.push({
                 id: `buff_${Date.now()}`,
                 name: 'Enraged',
                 type: BuffType.STAT,
                 duration: roarDuration,
                 damageBonus: totalDmgBonus,
                 icon: 'Heart'
             });
             addFloatingText(state.playerX, GROUND_Y - 120, "Enraged!", "red");

             // Heal component: 20/35/50 HP at levels 1/2/3.
             const heals = [20, 35, 50];
             const healVal = heals[Math.min(heals.length - 1, level - 1)];
             const prevHp = state.playerHp;
             state.playerHp = Math.min(state.playerMaxHp, state.playerHp + healVal);
             const actualHeal = Math.floor(state.playerHp - prevHp);
             if (actualHeal > 0) {
                 addFloatingText(state.playerX, GROUND_Y - 140, `+${actualHeal} HP`, "green");
                 addVFX('BUFF', state.playerX, GROUND_Y, "green");
             }

             // Fear component: any enemy within attack range (110px, the
             // melee range used by handleManualAttack) is forced into the
             // RETREAT state. triggerEnemyRetreat handles the duration and
             // the "Fear!" floating text. Bosses resist via fearResist but
             // Battle Roar bypasses that check — it's a roar, not a crit.
             if (state.enemy) {
                 const dist = state.enemyX - state.playerX;
                 if (dist > 0 && dist <= 110) {
                     triggerEnemyRetreat();
                 }
             }
        } else if (ability.name === 'Parry') {
             const parryDuration = getScaledValue(1000, ability.scaling?.duration);
             state.activeBuffs.push({
                 id: `buff_${Date.now()}`,
                 name: 'Parry',
                 type: BuffType.MECHANIC,
                 duration: parryDuration,
                 icon: 'Ghost'
             });
        } else if (ability.name === 'Majesty') {
             // Majesty used to push a buff with no mechanical fields at all
             // (no statBonus, no barrierHp, no damageBonus) — so despite the
             // "Exponential Armor Buff (Base 15)" tooltip it did literally
             // nothing. Interpret "armor buff" as a damage-absorbing barrier
             // that scales exponentially with level: 50 / 100 / 200 at
             // levels 1 / 2 / 3 (= 50 * 2^(level-1)). The barrier is drawn
             // in cyan like Aura Shield so the player can see it active.
             const majDuration = getScaledValue(10000, ability.scaling?.duration);
             const majBarrier = 50 * Math.pow(2, level - 1);
             state.activeBuffs.push({
                 id: `buff_${Date.now()}`,
                 name: 'Majesty',
                 type: BuffType.MECHANIC,
                 duration: majDuration,
                 barrierHp: majBarrier,
                 icon: 'Shield',
             });
             addFloatingText(state.playerX, GROUND_Y - 120, `Majesty! +${majBarrier}`, "cyan");
        } else if (ability.name === 'Aura Shield') {
             const shieldBase = 20;
             const scale = ability.scaling?.effect || 10;
             const barrierVal = getScaledValue(shieldBase, scale) + (stats[Attribute.INT] * 2);
             const shieldDur = getScaledValue(10000, ability.scaling?.duration);

             state.activeBuffs.push({
                 id: `buff_${Date.now()}`,
                 name: 'Barrier',
                 type: BuffType.MECHANIC,
                 duration: shieldDur,
                 barrierHp: barrierVal,
                 icon: 'Shield'
             });
             addFloatingText(state.playerX, GROUND_Y - 120, `Barrier +${barrierVal}`, "cyan");

             // Explosion component: a shockwave radiates from the player,
             // dealing light damage (scales with INT) and pushing the enemy
             // back 6 × CHARACTER_WIDTH (360px). The push is clamped to the
             // canvas bounds so the enemy doesn't despawn off-screen.
             if (state.enemy) {
                 const explosionDmg = Math.floor(stats[Attribute.INT] * 1.5) + 5;
                 state.enemy.hp -= explosionDmg;
                 const pushDist = 6 * CHARACTER_WIDTH; // 360px
                 state.enemyX = Math.min(CANVAS_WIDTH + 150, state.enemyX + pushDist);
                 applyKnockback('enemy', 8);
                 addVFX('IMPACT', state.enemyX - 30, GROUND_Y - 40, 'cyan', 80);
                 addVFX('SMASH', state.playerX + 40, GROUND_Y - 40, 'cyan', 60);
                 addParticles(state.enemyX, GROUND_Y - 50, 25, 'cyan');
                 addFloatingText(state.enemyX, GROUND_Y - 100, `-${explosionDmg}`, "cyan");
                 addFloatingText(state.enemyX, GROUND_Y - 140, "Pushed!", "cyan");
             }
        }
        
        setHudStatic(prev => ({ ...prev, buffs: [...state.activeBuffs] }));
        used = true;
    }

    if (used) {
        const cdReduc = getCooldownReduction(stats[Attribute.DX]);
        state.cooldowns[ability.id] = ability.cooldown * (1 - cdReduc);
        state.playerState = 'ATTACKING';
        state.attackTimer = 300;
        state.attackDuration = 300;
    }
  };

  const handleEnemyDeath = (totalStats: Record<Attribute, number>) => {
    const state = gameState.current;
    if (!state.enemy) return;

    const exp = state.enemy.expReward;
    const gold = state.enemy.goldReward;
    const drops: Item[] = [];
    const loot = generateLoot(state.stage, totalStats[Attribute.LUCK], state.enemy.luckBonus || 0);
    if (loot) drops.push(loot);

    state.expGained += exp;
    state.goldGained += gold;
    state.lootFound.push(...drops);

    addParticles(state.enemyX, GROUND_Y - 50, 30, 'gold');
    if (enemyContainerRef.current) enemyContainerRef.current.style.opacity = '0';

    // Level Up Check
    const currentExp = character.exp + state.expGained;
    const expNeeded = getExpForLevel(character.level);
    const isLevelUp = currentExp >= expNeeded;

    setBattleSummary({ show: true, exp, gold, drops, isLevelUp });
    state.isPaused = true;
    state.enemy = null;
    drawGame();
  };

  const handleContinueJourney = () => {
      const state = gameState.current;
      state.stage++;
      setHudStatic(prev => ({ ...prev, stage: state.stage }));
      setBattleSummary(null);
      state.isPaused = false;
      state.lastTime = performance.now();
      spawnEnemy();
  };

  const calculateExitState = () => {
      // Start from characterRef.current (the latest in-combat state) rather
      // than the `character` prop. The prop is frozen for the duration of
      // combat — handleConsumeItem now reassigns characterRef.current to a
      // fresh object on every item use, so this reads the post-consumption
      // equipment/stash directly. This also removes the dead
      // `activeBuffs.length >= 0 ? ... : undefined` ternary that previously
      // tried (and failed) to overlay the USABLE1/USABLE2 slots onto the
      // stale prop copy.
      const updatedChar = { ...characterRef.current };
      updatedChar.exp += gameState.current.expGained;
      updatedChar.gold += gameState.current.goldGained;
      updatedChar.stash = [...updatedChar.stash, ...gameState.current.lootFound];
      updatedChar.maxStage = gameState.current.stage;
      updatedChar.currentHp = gameState.current.playerHp;

      let xpNeeded = getExpForLevel(updatedChar.level);
      let leveledUp = false;
      while(updatedChar.exp >= xpNeeded) {
          updatedChar.exp -= xpNeeded;
          updatedChar.level++;
          updatedChar.attributePoints = (updatedChar.attributePoints || 0) + 1;
          updatedChar.skillPoints = (updatedChar.skillPoints || 0) + 1;
          xpNeeded = getExpForLevel(updatedChar.level);
          leveledUp = true;
      }
      // QoL: refill HP on level up. The Hub's Tavern offers a gold-cost heal,
      // but forcing the player to backtrack after every level-up was tedious
      // — the battle summary even warned "Health not regenerated. Check
      // inventory!" acknowledging the gap. Refill to the current max HP
      // (HT doesn't auto-increase on level-up, so maxHp is unchanged, but
      // the refill itself is the reward for leveling).
      if (leveledUp) {
          const newStats = calculateTotalStats(updatedChar);
          const newMaxHp = Math.max(10, getHp(newStats[Attribute.HT]));
          updatedChar.currentHp = newMaxHp;
      }
      return updatedChar;
  };

  const handleExit = () => {
      onExit(calculateExitState());
  };

  const setKey = (key: string, pressed: boolean) => {
      gameState.current.keys[key] = pressed;
  };

  // Wrapper around the extracted draw module — passes canvas ctx + state + character.
  const drawGame = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      drawScene(ctx, gameState.current, character);
  };

  const activeAbilities = character.equippedAbilities.filter(id => {
      const a = ABILITY_DB.find(db => db.id === id);
      return a && a.type === AbilityType.ACTIVE;
  });

  return (
    <div className="fixed inset-0 bg-black flex flex-col overflow-y-auto select-none touch-none">
      <TopHUD
        character={character}
        stage={hudStatic.stage}
        enemyName={hudStatic.enemyName}
        enemyMaxHp={hudStatic.enemyMaxHp}
        buffs={hudStatic.buffs}
        playerHpBarRef={playerHpBarRef}
        playerHpTextRef={playerHpTextRef}
        enemyHpBarRef={enemyHpBarRef}
        enemyContainerRef={enemyContainerRef}
        onExit={handleExit}
      />

      <div className="flex-1 flex items-center justify-center min-h-[280px] relative overflow-hidden">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="max-w-full max-h-full"
          style={{
            imageRendering: 'pixelated',
            aspectRatio: '16 / 9',
            objectFit: 'contain',
          }}
        />
        <BattleSummary
          summary={battleSummary}
          onExit={handleExit}
          onContinue={handleContinueJourney}
        />
      </div>

      <BottomControls
        equippedUsable1={hudStatic.equippedUsable1}
        equippedUsable2={hudStatic.equippedUsable2}
        activeAbilities={activeAbilities}
        cooldownRefs={cooldownRefs}
        onMoveLeft={(pressed) => setKey('ArrowLeft', pressed)}
        onMoveRight={(pressed) => setKey('ArrowRight', pressed)}
        onAttack={handleManualAttack}
        onAbility={handleAbilityUse}
        onUseItem={handleConsumeItem}
      />

      {/* Keyboard help text - faint and centered */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-medieval-500 opacity-20 pointer-events-none whitespace-nowrap"
        style={{ fontSize: '10px' }}
      >
        [A/D] Move • [H] Attack • [J,K,L] Skills • [U,I] Items
      </div>
    </div>
  );
};

export default GameLoop;
