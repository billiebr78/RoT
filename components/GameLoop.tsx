
import React, { useEffect, useRef, useState } from 'react';
import { Character, Enemy, Ability, AbilityType, Attribute, ItemSlot, Item, EnemyAbility, SpriteFrame, Buff, BuffType, OffHandType, ItemType } from '../types';
import { calculatePlayerDamage, generateEnemy, generateLoot, calculateTotalStats } from '../services/engine';
import { ABILITY_DB, getCritChance, getEvasion, SPRITE_LIBRARY, POTION_COOLDOWN, SCROLL_DB, getExpForLevel, getHp, getCooldownReduction } from '../constants';
import { Heart, Zap, Shield, Sword, ChevronsRight, Trophy, LogOut, Lock, ArrowRight, Ghost, Footprints, Crosshair, Wind, Droplets, Flame, Book, Tornado, Skull, ArrowLeft, ChevronLeft, ChevronRight, FlaskConical, Map, Scroll, HelpCircle, Hammer, Wand, RotateCw } from 'lucide-react';

interface Props {
  character: Character;
  onExit: (updatedChar: Character) => void;
  onDeath: () => void;
}

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;
const GROUND_Y = 480;
const PLAYER_SPEED = 2.5;

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

const drawHills = (ctx: CanvasRenderingContext2D, offset: number, groundY: number) => {
    // Far hills
    ctx.fillStyle = '#1e1b4b'; // Dark blue/purple
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    for(let x=0; x<=CANVAS_WIDTH; x+=10) {
        ctx.lineTo(x, groundY - 100 - Math.sin((x + offset * 0.5) * 0.01) * 50);
    }
    ctx.lineTo(CANVAS_WIDTH, groundY);
    ctx.lineTo(0, groundY);
    ctx.fill();

    // Close hills
    ctx.fillStyle = '#312e81'; 
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    for(let x=0; x<=CANVAS_WIDTH; x+=10) {
            ctx.lineTo(x, groundY - 50 - Math.sin((x + offset) * 0.02) * 30);
    }
    ctx.lineTo(CANVAS_WIDTH, groundY);
    ctx.lineTo(0, groundY);
    ctx.fill();
};

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

  // Track device orientation so we can prompt the player to rotate on phones.
  // The game is designed for landscape; in portrait the canvas would be tiny
  // and the controls would crowd each other out.
  const [isPortrait, setIsPortrait] = useState(false);
  useEffect(() => {
    const checkOrientation = () => {
      // Treat as portrait whenever the viewport is taller than it is wide.
      // This catches both phone-portrait and any narrow desktop window, but
      // the rotate prompt is only really shown on touch devices (see below).
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

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
        draw();
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
            const dashDuration = getScaledValue(1000, ability.scaling?.duration);
            const charges = 2 + level;
            state.activeBuffs.push({
                id: `buff_${Date.now()}`,
                name: 'Dash',
                type: BuffType.MECHANIC,
                duration: dashDuration,
                statBonus: {},
                charges: charges,
                icon: 'Footprints'
            });
            addFloatingText(state.playerX, GROUND_Y - 120, `Evasion Up (${charges})`, "cyan");
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
    draw(); 
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

  const drawSprite = (ctx: CanvasRenderingContext2D, spriteKey: string, x: number, y: number, scale: number = 4, facingRight: boolean = true, frame: number = 0, overrideColor?: string) => {
        const sprite = SPRITE_LIBRARY[spriteKey] || SPRITE_LIBRARY['goblin'];
        if (!sprite) return;
        const { rows, palette } = sprite;
        
        let animRowIndex = 0; 
        const state = gameState.current;

        if (spriteKey === character.classType) {
             if (state.playerState === 'ATTACKING') animRowIndex = 2; 
             else if (state.playerState === 'MOVING') animRowIndex = 1; 
             else if (state.playerState === 'DEFENDING' || state.playerState === 'CASTING') animRowIndex = 3; 
             else animRowIndex = 0; 
        }

        const spriteWidth = 12; 
        let frameOffset = 0;
        
        if (state.playerState === 'ATTACKING' && spriteKey === character.classType) {
             const duration = state.attackDuration || 300;
             const progress = 1 - (state.attackTimer / duration); 
             if (progress < 0.3) frameOffset = 0; 
             else if (progress < 0.6) frameOffset = 1; 
             else frameOffset = 2; 
        } else if (state.playerState === 'MOVING' || state.enemyAI.state === 'ADVANCE') {
             frameOffset = (frame % 3);
        } else {
             frameOffset = (Math.floor(frame / 10) % 3);
        }

        const frameHeight = 16; 
        const yOffset = animRowIndex * frameHeight; 

        ctx.save();
        ctx.translate(x, y);
        if (!facingRight) {
            ctx.scale(-1, 1);
        }
        if (animRowIndex === 0) {
            const bob = Math.sin(frame * 0.2) * 2;
            ctx.translate(0, bob);
        }

        for (let r = 0; r < frameHeight; r++) {
            if (yOffset + r >= rows.length) break;
            const fullRowStr = rows[yOffset + r];
            const frameStart = frameOffset * 12;
            const rowStr = fullRowStr.slice(frameStart, frameStart + 12);
            for (let c = 0; c < 12; c++) {
                const char = rowStr[c];
                const color = overrideColor || palette[char];
                if (color && color !== 'transparent') {
                    ctx.fillStyle = color;
                    const dx = (c - 6) * scale; 
                    const dy = (r - 16) * scale; 
                    ctx.fillRect(dx, dy, scale, scale);
                }
            }
        }
        ctx.restore();
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const state = gameState.current;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    for (let y = 0; y < CANVAS_HEIGHT; y+=4) {
        const ratio = y / CANVAS_HEIGHT;
        ctx.fillStyle = ratio < 0.3 ? '#0f172a' : ratio < 0.6 ? '#1e293b' : '#334155';
        ctx.fillRect(0, y, CANVAS_WIDTH, 4);
    }
    drawHills(ctx, state.parallaxOffset, GROUND_Y);
    ctx.fillStyle = '#27272a';
    ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);
    ctx.fillStyle = '#3f3f46';
    for(let i=0; i<30; i++) {
        const rx = (state.animFrame * 2 + i * 50) % CANVAS_WIDTH;
        ctx.fillRect(rx, GROUND_Y + 4 + (i%3)*4, 8, 4);
    }

    if (state.enemy && state.enemyX > CANVAS_WIDTH - 50) {
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.abs(Math.sin(state.animFrame * 0.1))})`;
        ctx.font = "bold 20px monospace";
        ctx.fillText("ENEMY ->", CANVAS_WIDTH - 100, GROUND_Y - 20);
    }

    const playerSprite = character.classType; 
    let playerColorOverride = undefined;
    if (state.playerState === 'DEFENDING') playerColorOverride = '#3b82f6'; 
    if (state.castTimer > 0) playerColorOverride = '#eab308'; 

    drawSprite(ctx, playerSprite, state.playerX, GROUND_Y - 10, 5, true, state.animFrame, playerColorOverride);

    if (state.castTimer > 0) {
        const castPct = 1 - (state.castTimer / state.castTotalTime);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(state.playerX - 20, GROUND_Y - 100, 40, 6);
        ctx.fillStyle = '#eab308';
        ctx.fillRect(state.playerX - 20, GROUND_Y - 100, 40 * castPct, 6);
    }

    if (state.playerState === 'DEFENDING') {
        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(state.playerX, GROUND_Y - 40, 30, 0, Math.PI*2); ctx.stroke();
    }
    
    const barrier = state.activeBuffs.find(b => b.barrierHp && b.barrierHp > 0);
    if (barrier) {
         ctx.strokeStyle = '#22d3ee'; // Cyan
         ctx.lineWidth = 2;
         ctx.setLineDash([5, 3]);
         ctx.beginPath(); 
         ctx.arc(state.playerX, GROUND_Y - 40, 38, 0, Math.PI*2); 
         ctx.stroke();
         ctx.setLineDash([]);
    }

    if (state.enemy) {
        const aiState = state.enemyAI.state;
        let enemyColor = undefined;
        if (aiState === 'STUNNED') enemyColor = '#555';
        if (aiState === 'DEFENDING') enemyColor = '#b91c1c';

        drawSprite(ctx, state.enemy.sprite, state.enemyX, GROUND_Y - 10, state.enemy.isBoss ? 7 : 5, false, state.animFrame, enemyColor);

        if (aiState === 'PREPARE') {
            ctx.font = "900 40px serif";
            ctx.fillStyle = "#fbbf24";
            ctx.fillText("!", state.enemyX - 10, GROUND_Y - 110 + Math.sin(state.animFrame * 0.2) * 5);
        }
        if (aiState === 'CASTING') {
            ctx.font = "900 40px serif";
            ctx.fillStyle = "#d946ef";
            ctx.fillText("✦", state.enemyX - 10, GROUND_Y - 110 + Math.sin(state.animFrame * 0.2) * 5);
        }
    }

    state.projectiles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
    });

    state.vfx.forEach(v => {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = v.life / v.maxLife;
        
        if (v.type === 'SLASH') {
             ctx.strokeStyle = v.color;
             ctx.lineWidth = 4;
             ctx.beginPath();
             ctx.arc(v.x, v.y, v.size, Math.PI, Math.PI * 1.8); 
             ctx.stroke();
        } 
        else if (v.type === 'THRUST') {
             ctx.strokeStyle = v.color;
             ctx.lineWidth = 3;
             ctx.beginPath();
             ctx.moveTo(v.x, v.y);
             ctx.lineTo(v.x + v.size, v.y);
             ctx.stroke();
        }
        else if (v.type === 'SMASH') {
             ctx.fillStyle = v.color;
             ctx.beginPath();
             ctx.ellipse(v.x, v.y, v.size / 2, v.size, 0, 0, Math.PI * 2);
             ctx.fill();
        }
        else if (v.type === 'IMPACT') {
             ctx.fillStyle = v.color;
             ctx.beginPath();
             const spikes = 8;
             for(let i=0; i<spikes*2; i++) {
                 const r = (i%2 === 0) ? v.size : v.size/2;
                 const a = (Math.PI * i) / spikes;
                 ctx.lineTo(v.x + Math.cos(a)*r, v.y + Math.sin(a)*r);
             }
             ctx.fill();
        }
        else if (v.type === 'SPIN') {
             ctx.strokeStyle = v.color;
             ctx.lineWidth = 2;
             ctx.beginPath();
             ctx.ellipse(v.x, v.y, v.size, v.size/3, state.animFrame * 0.5, 0, Math.PI * 2);
             ctx.stroke();
        }
        else if (v.type === 'BUFF') {
             ctx.fillStyle = v.color;
             for(let i=0; i<3; i++) {
                 ctx.fillRect(v.x + (Math.random()-0.5)*20, v.y - (20-v.life)*3, 4, 4);
             }
        }
        ctx.restore();
    });

    state.particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / 20;
        ctx.fillRect(p.x, p.y, p.size, p.size); 
        ctx.globalAlpha = 1.0;
    });

    ctx.font = "bold 16px monospace";
    ctx.textAlign = "center";
    state.floatingTexts.forEach(t => {
        ctx.fillStyle = 'black'; ctx.fillText(t.text, t.x + 2, t.y + 2);
        ctx.fillStyle = t.color; ctx.fillText(t.text, t.x, t.y);
    });
    ctx.textAlign = "left";
  };

  const activeAbilities = character.equippedAbilities.filter(id => {
      const a = ABILITY_DB.find(db => db.id === id);
      return a && a.type === AbilityType.ACTIVE;
  });

  const renderIcon = (iconName: string, size: number = 24, className: string = '') => {
      switch (iconName) {
          case 'Sword': return <Sword size={size} className={className} />;
          case 'Shield': return <Shield size={size} className={className} />;
          case 'Zap': return <Zap size={size} className={className} />;
          case 'Heart': return <Heart size={size} className={className} />;
          case 'Skull': return <Skull size={size} className={className} />;
          case 'Ghost': return <Ghost size={size} className={className} />;
          case 'Footprints': return <Footprints size={size} className={className} />;
          case 'Crosshair': return <Crosshair size={size} className={className} />;
          case 'Hurricane': return <Tornado size={size} className={className} />;
          case 'Tornado': return <Tornado size={size} className={className} />;
          case 'Wind': return <Wind size={size} className={className} />;
          case 'Flame': return <Flame size={size} className={className} />;
          case 'Droplets': return <Droplets size={size} className={className} />;
          case 'Book': return <Book size={size} className={className} />;
          case 'Hammer': return <Hammer size={size} className={className} />;
          case 'Wand': return <Wand size={size} className={className} />;
          default: return <Zap size={size} className={className} />;
      }
  };

  return (
    <div className="fixed inset-0 bg-black overflow-hidden select-none touch-none">
      {/* Canvas fills the entire viewport; object-contain preserves the 16:9
          internal resolution (960x540) and centers it. Black letterbox bars
          appear automatically on ultra-wide or non-16:9 screens, leaving the
          gameplay area undistorted at any size. */}
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="absolute inset-0 w-full h-full"
        style={{ imageRendering: 'pixelated', objectFit: 'contain' }}
      />

      {/* Battle Summary overlay - centered modal */}
      {battleSummary && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 animate-in fade-in duration-300 p-4">
          <div className="bg-medieval-800 border-4 border-medieval-500 p-6 sm:p-8 rounded-lg shadow-2xl w-full max-w-sm sm:max-w-md text-center relative overflow-hidden">
              {battleSummary.isLevelUp && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="text-3xl sm:text-4xl font-black text-yellow-400 animate-ping opacity-50">LEVEL UP!</div>
                  </div>
              )}
              <Trophy className="w-12 h-12 sm:w-16 sm:h-16 text-yellow-500 mx-auto mb-3 sm:mb-4 relative z-10" />
              <h2 className="text-2xl sm:text-3xl font-serif text-white mb-2 relative z-10">Victory!</h2>
              {battleSummary.isLevelUp && <div className="text-yellow-300 font-bold text-base sm:text-lg mb-3 sm:mb-4 animate-bounce">LEVEL UP!</div>}
              <div className="space-y-2 mb-6 sm:mb-8 text-left bg-medieval-900 p-3 sm:p-4 rounded relative z-10">
                  <div className="flex justify-between"><span className="text-medieval-300">Exp</span><span className="text-white">+{battleSummary.exp}</span></div>
                  <div className="flex justify-between"><span className="text-medieval-300">Gold</span><span className="text-yellow-400">+{battleSummary.gold}</span></div>
                  {battleSummary.drops.length > 0 && (
                      <div className="mt-2 border-t border-medieval-700 pt-2">
                          <span className="text-xs text-medieval-400 block mb-1">Loot:</span>
                          {battleSummary.drops.map((d, i) => (
                              <div key={i} className={`text-sm font-bold ${d.rarity === 'mythic' ? 'text-fuchsia-400' : d.rarity === 'legendary' ? 'text-orange-400' : 'text-white'}`}>
                                  {d.name}
                              </div>
                          ))}
                      </div>
                  )}
                  {battleSummary.isLevelUp && (
                      <div className="mt-2 border-t border-medieval-700 pt-2 text-xs text-emerald-400 text-center">
                         HP restored on level up!
                      </div>
                  )}
              </div>
              <div className="flex gap-3 sm:gap-4 relative z-10">
                  <button onClick={handleExit} className="flex-1 py-2 sm:py-3 bg-medieval-700 hover:bg-medieval-600 text-white font-bold rounded flex items-center justify-center gap-2 border border-medieval-500 text-sm sm:text-base">
                      <Map size={16} /> Town [J]
                  </button>
                  <button onClick={handleContinueJourney} className="flex-1 py-2 sm:py-3 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded flex items-center justify-center gap-2 border border-emerald-600 text-sm sm:text-base">
                      Next [H] <ChevronsRight size={16} />
                  </button>
              </div>
          </div>
        </div>
      )}

      {/* Top HUD overlay - absolute positioned, doesn't push canvas */}
      <div className="absolute top-2 left-2 right-2 z-20 flex justify-between items-start pointer-events-none gap-2">
          <div className="flex gap-2 sm:gap-4 items-start">
              <button
                onClick={handleExit}
                className="pointer-events-auto bg-red-950 hover:bg-red-900 text-red-200 p-1.5 sm:p-2 rounded border border-red-800 shadow-lg transition-colors flex items-center justify-center"
                title="Retreat to Town"
              >
                 <ArrowLeft size={20} className="sm:hidden" />
                 <ArrowLeft size={24} className="hidden sm:block" />
              </button>
              <div className="w-32 sm:w-48 bg-medieval-900/80 border-2 border-medieval-500 p-1 rounded shadow-lg">
                  <div className="flex justify-between items-end mb-1 px-1">
                      <span className="font-bold text-xs sm:text-sm text-medieval-200 truncate max-w-[70%]">{character.name}</span>
                      <span className="text-[10px] sm:text-xs text-medieval-400">Lvl {character.level}</span>
                  </div>
                  <div className="w-full sm:w-32 h-2 bg-black rounded border border-medieval-600 relative overflow-hidden">
                      <div ref={playerHpBarRef} className="h-full bg-gradient-to-r from-red-700 to-red-500 transition-all duration-75" style={{width: '100%'}}></div>
                      <span ref={playerHpTextRef} className="absolute inset-0 flex items-center justify-center text-[7px] sm:text-[8px] font-bold text-white drop-shadow-md"></span>
                  </div>

                  <div className="flex gap-0.5 sm:gap-1 mt-1 pl-0.5 sm:pl-1 flex-wrap">
                      {hudStatic.buffs.map((buff, i) => (
                          <div key={i} className="w-3.5 h-3.5 sm:w-4 sm:h-4 bg-gray-800 border border-gray-600 rounded flex items-center justify-center relative" title={buff.name}>
                              {buff.icon === 'Shield' && <Shield size={9} className="text-cyan-400" />}
                              {buff.icon === 'Heart' && <Heart size={9} className="text-red-400" />}
                              {buff.icon === 'Ghost' && <Ghost size={9} className="text-white" />}
                              {buff.icon === 'Footprints' && <Footprints size={9} className="text-green-400" />}
                              {buff.icon === 'Scroll' && <Scroll size={9} className="text-yellow-400" />}

                              {buff.charges && <span className="absolute -bottom-1 -right-1 bg-blue-600 text-[6px] rounded-full px-0.5 sm:px-1 leading-tight">{buff.charges}</span>}
                              {buff.barrierHp !== undefined && <span className="absolute -bottom-1 -right-1 bg-cyan-600 text-[6px] rounded-full px-0.5 sm:px-1 leading-tight">{Math.ceil(buff.barrierHp)}</span>}
                          </div>
                      ))}
                  </div>
              </div>
          </div>

          <div ref={enemyContainerRef} className="w-32 sm:w-48 bg-medieval-900/80 border-2 border-medieval-500 p-1 rounded shadow-lg transition-opacity duration-300">
              <div className="flex justify-between items-end mb-1 px-1">
                  <span className="font-bold text-xs sm:text-sm text-red-300 truncate max-w-[60%]">{hudStatic.enemyName}</span>
                  <span className="text-[10px] sm:text-xs text-red-500">Stage {hudStatic.stage}</span>
              </div>
              <div className="w-full h-2 sm:h-3 bg-black rounded border border-medieval-600 relative overflow-hidden">
                  <div ref={enemyHpBarRef} className="h-full bg-gradient-to-r from-purple-700 to-purple-500 transition-all duration-75" style={{width: '100%'}}></div>
              </div>
          </div>
      </div>

      {/* Bottom controls overlay - absolute positioned at bottom */}
      <div className="absolute bottom-2 left-2 right-2 z-20 flex justify-between items-end gap-2">
          {/* Movement buttons (left side) */}
          <div className="flex gap-2 sm:gap-4">
              <button
                onPointerDown={(e) => { e.preventDefault(); setKey('ArrowLeft', true); }}
                onPointerUp={() => setKey('ArrowLeft', false)}
                onPointerLeave={() => setKey('ArrowLeft', false)}
                onPointerCancel={() => setKey('ArrowLeft', false)}
                className="w-14 h-14 sm:w-20 sm:h-20 bg-medieval-700/90 border-2 sm:border-4 border-medieval-500 rounded-full flex items-center justify-center active:bg-medieval-600 active:scale-95 transition-transform shadow-lg backdrop-blur-sm touch-none"
              >
                  <ChevronLeft size={32} className="text-medieval-300 sm:hidden" />
                  <ChevronLeft size={48} className="text-medieval-300 hidden sm:block" />
              </button>
              <button
                onPointerDown={(e) => { e.preventDefault(); setKey('ArrowRight', true); }}
                onPointerUp={() => setKey('ArrowRight', false)}
                onPointerLeave={() => setKey('ArrowRight', false)}
                onPointerCancel={() => setKey('ArrowRight', false)}
                className="w-14 h-14 sm:w-20 sm:h-20 bg-medieval-700/90 border-2 sm:border-4 border-medieval-500 rounded-full flex items-center justify-center active:bg-medieval-600 active:scale-95 transition-transform shadow-lg backdrop-blur-sm touch-none"
              >
                  <ChevronRight size={32} className="text-medieval-300 sm:hidden" />
                  <ChevronRight size={48} className="text-medieval-300 hidden sm:block" />
              </button>
          </div>

          {/* Items + Abilities + Attack (right side) */}
          <div className="flex gap-2 sm:gap-4 items-end">
             <div className="flex flex-col gap-1 sm:gap-2">
                 {/* USABLE SLOT 1 */}
                 <button
                    id="btn-u1"
                    onClick={() => handleConsumeItem(ItemSlot.USABLE1)}
                    className={`relative w-8 h-8 sm:w-10 sm:h-10 border rounded flex items-center justify-center transition-all ${hudStatic.equippedUsable1 ? 'bg-medieval-600 border-medieval-400 hover:bg-medieval-500' : 'bg-gray-800 border-gray-600 opacity-50'}`}
                 >
                    {hudStatic.equippedUsable1 ? (
                        hudStatic.equippedUsable1.icon === 'FlaskConical' ? <FlaskConical size={16} className="text-red-400 sm:hidden" /> : <Scroll size={16} className="text-blue-400 sm:hidden" />
                    ) : <HelpCircle size={16} className="text-gray-500 sm:hidden" />}
                    {hudStatic.equippedUsable1 ? (
                        hudStatic.equippedUsable1.icon === 'FlaskConical' ? <FlaskConical size={20} className="text-red-400 hidden sm:block" /> : <Scroll size={20} className="text-blue-400 hidden sm:block" />
                    ) : <HelpCircle size={20} className="text-gray-500 hidden sm:block" />}
                    <span className="absolute -top-2 -left-2 text-[8px] sm:text-[10px] text-gray-400 bg-black/50 px-0.5 sm:px-1 rounded">[U]</span>

                    <div
                        ref={el => { if(el) cooldownRefs.current['usable1'] = el }}
                        className="absolute bottom-0 left-0 right-0 bg-black/80 transition-none"
                        style={{ height: '0%', opacity: 0 }}
                    ></div>
                 </button>

                 {/* USABLE SLOT 2 */}
                 <button
                    id="btn-u2"
                    onClick={() => handleConsumeItem(ItemSlot.USABLE2)}
                    className={`relative w-8 h-8 sm:w-10 sm:h-10 border rounded flex items-center justify-center transition-all ${hudStatic.equippedUsable2 ? 'bg-medieval-600 border-medieval-400 hover:bg-medieval-500' : 'bg-gray-800 border-gray-600 opacity-50'}`}
                 >
                    {hudStatic.equippedUsable2 ? (
                        hudStatic.equippedUsable2.icon === 'FlaskConical' ? <FlaskConical size={16} className="text-red-400 sm:hidden" /> : <Scroll size={16} className="text-blue-400 sm:hidden" />
                    ) : <HelpCircle size={16} className="text-gray-500 sm:hidden" />}
                    {hudStatic.equippedUsable2 ? (
                        hudStatic.equippedUsable2.icon === 'FlaskConical' ? <FlaskConical size={20} className="text-red-400 hidden sm:block" /> : <Scroll size={20} className="text-blue-400 hidden sm:block" />
                    ) : <HelpCircle size={20} className="text-gray-500 hidden sm:block" />}
                    <span className="absolute -top-2 -left-2 text-[8px] sm:text-[10px] text-gray-400 bg-black/50 px-0.5 sm:px-1 rounded">[I]</span>

                    <div
                        ref={el => { if(el) cooldownRefs.current['usable2'] = el }}
                        className="absolute bottom-0 left-0 right-0 bg-black/80 transition-none"
                        style={{ height: '0%', opacity: 0 }}
                    ></div>
                 </button>
             </div>

             <div className="flex gap-1 sm:gap-2 mr-1 sm:mr-2">
                {activeAbilities.slice(0, 3).map((abId, idx) => {
                    const ability = ABILITY_DB.find(a => a.id === abId);
                    if (!ability) return null;
                    const hotkey = idx === 0 ? 'J' : idx === 1 ? 'K' : 'L';
                    return (
                        <button
                            key={abId}
                            id={`btn-ability-${abId}`}
                            onClick={() => handleAbilityUse(abId)}
                            className="relative w-12 h-12 sm:w-16 sm:h-16 bg-medieval-700/90 border-2 border-medieval-400 rounded-lg flex items-center justify-center overflow-hidden shadow-inner active:scale-95 transition-transform backdrop-blur-sm touch-none"
                        >
                             {renderIcon(ability.icon, 24, 'text-white sm:hidden')}
                             {renderIcon(ability.icon, 32, 'text-white hidden sm:block')}
                             <span className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 text-[8px] sm:text-[10px] text-gray-300 font-bold bg-black/50 px-0.5 sm:px-1 rounded">[{hotkey}]</span>
                             <div
                                ref={el => { if(el) cooldownRefs.current[abId] = el }}
                                className="absolute bottom-0 left-0 right-0 bg-black/80 transition-none"
                                style={{ height: '0%', opacity: 0 }}
                             ></div>
                             <span className="absolute bottom-0 text-[7px] sm:text-[9px] text-medieval-200 font-bold w-full text-center bg-black/50 truncate px-0.5">{ability.name}</span>
                        </button>
                    )
                })}
                {[...Array(Math.max(0, 3 - activeAbilities.length))].map((_, i) => (
                    <div key={i} className="w-12 h-12 sm:w-16 sm:h-16 bg-medieval-900/50 border-2 border-medieval-700 rounded-lg flex items-center justify-center border-dashed opacity-30">
                        <Lock size={16} className="sm:hidden" />
                        <Lock size={20} className="hidden sm:block" />
                    </div>
                ))}
             </div>

             <button
                id="btn-attack"
                onClick={handleManualAttack}
                className="w-16 h-16 sm:w-24 sm:h-24 bg-red-900/90 border-2 sm:border-4 border-red-700 rounded-full flex flex-col items-center justify-center relative overflow-hidden shadow-[0_0_15px_rgba(220,38,38,0.5)] active:scale-95 transition-transform backdrop-blur-sm touch-none"
             >
                 <Sword size={32} className="text-white drop-shadow-lg sm:hidden" />
                 <Sword size={48} className="text-white drop-shadow-lg hidden sm:block" />
                 <span className="text-[8px] sm:text-xs font-bold text-red-200 mt-0.5 sm:mt-1">ATTACK [H]</span>

                 <div
                    ref={el => { if(el) cooldownRefs.current['auto_attack'] = el }}
                    className="absolute bottom-0 left-0 right-0 bg-black/80 transition-none pointer-events-none"
                    style={{ height: '0%', opacity: 0 }}
                 ></div>
             </button>
          </div>
      </div>

      {/* Help text - only on desktop where keyboard is available */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 text-center text-medieval-500 text-[10px] opacity-0 sm:opacity-50 pointer-events-none hidden md:block">
          [A/D] Move • [H] Attack • [J,K,L] Skills • [U,I] Items
      </div>

      {/* Rotate device overlay - shows when in portrait orientation */}
      {isPortrait && (
        <div className="absolute inset-0 z-[100] bg-black flex flex-col items-center justify-center text-center p-8">
          <RotateCw size={64} className="text-medieval-300 mb-6 animate-pulse" />
          <h2 className="text-2xl font-serif text-medieval-200 mb-3">Rotate your device</h2>
          <p className="text-medieval-400 text-sm max-w-xs">
            Realm of the Trinity is best played in landscape mode. Turn your phone sideways to continue.
          </p>
        </div>
      )}
    </div>
  );
};

export default GameLoop;
