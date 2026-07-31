
import React, { useEffect, useRef, useState } from 'react';
import { Character, Enemy, Ability, AbilityType, Attribute, ItemSlot, Item, EnemyAbility, SpriteFrame, Buff, BuffType, OffHandType, ItemType } from '../types';
import { calculatePlayerDamage, generateEnemy, generateLoot, calculateTotalStats } from '../services/engine';
import { ABILITY_DB, getCritChance, getEvasion, POTION_COOLDOWN, SCROLL_DB, getExpForLevel, getHp, getCooldownReduction, SPRITE_LIBRARY, ARCHETYPE_BEHAVIORS, BOSS_FLEE_THRESHOLD } from '../constants';
import { draw as drawScene, CANVAS_WIDTH, CANVAS_HEIGHT, GROUND_Y, buildEnemyPalette, MAX_PARTICLES, ARENA_WIDTH, FLEE_ZONE_WIDTH, PLAYER_SPAWN_X, ENEMY_SPAWN_X } from '../render/canvas';
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
    playerX: PLAYER_SPAWN_X,
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
    enemyX: ENEMY_SPAWN_X,
    enemyVx: 0,
    enemyAI: {
        state: 'IDLE' as AIState,
        timer: 0,
        abilityToCast: null as EnemyAbility | null,
        isPursuing: false,
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
    enemyAbilityCooldowns: {} as Record<string, number>,
    enemyPaletteCache: null as Record<string, string> | null,
    cameraX: 0,
    fleeCountdown: -1,
    enemyFleeCountdown: -1,
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
    outcome?: 'victory' | 'enemyFled' | 'playerFled';
    xpPenalty?: number;
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
    gameState.current.enemyX = ENEMY_SPAWN_X;
    gameState.current.enemyAI = { state: 'IDLE', timer: 0, abilityToCast: null, isPursuing: false };
    gameState.current.enemyVx = 0;
    gameState.current.playerVx = 0;
    gameState.current.enemyAbilityCooldowns = {};
    gameState.current.projectiles = [];
    gameState.current.enemyFleeCountdown = -1;

    // Pre-bake the enemy's palette ONCE: apply hueShift (random per spawn)
    // and boss darken (0.5 = 50% darker) up front so the per-frame draw
    // loop does zero color math — just dict lookups via paletteOverride.
    // This was the main source of per-frame lag on modest tablets.
    const baseSprite = SPRITE_LIBRARY[enemy.sprite];
    gameState.current.enemyPaletteCache = baseSprite
        ? buildEnemyPalette(baseSprite.palette, enemy.hueShift ?? 0, enemy.isBoss ? 0.5 : 0)
        : null;

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
      // Cap total particles to MAX_PARTICLES. If we're over, drop the oldest
      // to make room for new ones. Prevents runaway counts during sustained
      // combat (each crit spawned 30 particles; a fast Rogue could hit
      // hundreds in seconds).
      const state = gameState.current;
      const overflow = (state.particles.length + count) - MAX_PARTICLES;
      if (overflow > 0) {
          state.particles.splice(0, overflow);
      }
      for(let i=0; i<count; i++) {
          state.particles.push({
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
      // Projectile travels toward targetX. vx sign matches sign of dx so
      // an enemy on the right shooting at a player on the left produces
      // a leftward (negative) vx. The old formula double-negated: cos(atan2)
      // already returns the sign, then multiplying by (dx<0 ? -1 : 1)
      // flipped it again — projectiles flew AWAY from the player.
      const vx = dx >= 0 ? speed : -speed;

      gameState.current.projectiles.push({
          id: Math.random(),
          x: startX,
          y: startY,
          vx,
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
          if (state.enemyAI.state === 'HEALING') {
              // First Aid has only 40% chance to be interrupted per hit.
              // 60% of the time the enemy "tanks through" the heal.
              if (Math.random() < 0.4) {
                  addFloatingText(state.enemyX, GROUND_Y - 100, "Interrupted!", "yellow");
                  state.enemyAI.state = 'IDLE';
                  state.enemyAI.timer = 500;
              }
          } else if (state.enemyAI.state === 'ATTACK' || state.enemyAI.state === 'PREPARE' || state.enemyAI.state === 'CASTING') {
              state.enemyAI.state = 'IDLE';
              state.enemyAI.timer = 500;
          }
      }
  };

  // Throttle updateUI to ~30fps (every 33ms) instead of 60fps. The HUD
  // (HP bars, cooldown overlays) doesn't need to update every frame —
  // 30fps is smooth enough for visual feedback and halves the DOM
  // querySelector/style-mutation work. The canvas draw loop still
  // runs at full 60fps via drawGame().
  let lastUITime = 0;
  const UI_THROTTLE_MS = 33;

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
        if (time - lastUITime >= UI_THROTTLE_MS) {
            updateUI();
            lastUITime = time;
        }
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
        if (state.playerX < 30) { state.playerX = 30; state.playerVx = 0; }
        if (state.playerX > ARENA_WIDTH - 30) { state.playerX = ARENA_WIDTH - 30; state.playerVx = 0; }
    }
    if (Math.abs(state.enemyVx) > 0.1) {
        state.enemyX += state.enemyVx;
        state.enemyVx *= 0.9;
        // Clamp enemy to arena bounds on BOTH sides. Previously only the
        // right side was clamped, so knockback could push the enemy past
        // the left wall (x < 0), trapping it off-screen where the player
        // couldn't reach it.
        if (state.enemyX < 30) { state.enemyX = 30; state.enemyVx = 0; }
        if (state.enemyX > ARENA_WIDTH - 30) { state.enemyX = ARENA_WIDTH - 30; state.enemyVx = 0; }
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
        state.playerX = Math.min(state.playerX + moveSpeed, ARENA_WIDTH - 30);
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
            state.playerX = Math.max(state.playerX - moveSpeed, 30);
            isMoving = true;
        }
    }

    state.playerState = state.castTimer > 0 ? 'CASTING' : (isDefending ? 'DEFENDING' : (isMoving ? 'MOVING' : (state.attackTimer > 0 ? 'ATTACKING' : 'IDLE')));

    // === Camera follows player, clamped to arena bounds ===
    const targetCameraX = state.playerX - CANVAS_WIDTH / 2;
    state.cameraX = Math.max(0, Math.min(ARENA_WIDTH - CANVAS_WIDTH, targetCameraX));

    // === Player flee countdown ===
    // When the player stands in the left flee zone (x <= FLEE_ZONE_WIDTH),
    // a 10-second countdown starts. Leaving the zone resets it. Reaching 0
    // triggers handleFlee() which returns to town with an XP penalty.
    if (state.playerX <= FLEE_ZONE_WIDTH && !state.isPaused) {
        if (state.fleeCountdown < 0) {
            state.fleeCountdown = 5000;
        }
        state.fleeCountdown -= dt;
        if (state.fleeCountdown <= 0) {
            handleFlee();
            return;
        }
    } else {
        state.fleeCountdown = -1;
    }

    if (state.enemy) {
        const ai = state.enemyAI;
        const dist = state.enemyX - state.playerX;
        const meleeRange = 110;
        const retreatDistance = 250;

        // Resolve archetype behavior (defaults to Aggressor if missing)
        const archetype = state.enemy.archetype || 'Aggressor';
        const behavior = ARCHETYPE_BEHAVIORS[archetype];

        if (ai.timer > 0) ai.timer -= dt;
        Object.keys(state.enemyAbilityCooldowns).forEach(k => {
             if(state.enemyAbilityCooldowns[k] > 0) state.enemyAbilityCooldowns[k] -= dt;
        });

        // === HP threshold checks (first aid + flee) ===
        // Run these BEFORE the state machine so they can override any state.
        const hpPct = state.enemy.hp / state.enemy.maxHp;
        const fleeThreshold = state.enemy.isBoss ? BOSS_FLEE_THRESHOLD : behavior.fleeThreshold;

        // Check flee first (highest priority — if fleeing, nothing else matters)
        if (fleeThreshold !== null && hpPct <= fleeThreshold && ai.state !== 'FLEEING' && ai.state !== 'STUNNED') {
            ai.state = 'FLEEING';
            ai.timer = 0;
            addFloatingText(state.enemyX, GROUND_Y - 140, "FLEEING!", "orange");
        }

        // Check first aid thresholds (only if not already healing/fleeing/stunned)
        if (ai.state !== 'HEALING' && ai.state !== 'FLEEING' && ai.state !== 'STUNNED') {
            for (let i = 0; i < behavior.firstAidThresholds.length; i++) {
                const threshold = behavior.firstAidThresholds[i];
                if (hpPct <= threshold && !state.enemy.firstAidTriggered?.[i]) {
                    if (!state.enemy.firstAidTriggered) state.enemy.firstAidTriggered = {};
                    state.enemy.firstAidTriggered[i] = true;
                    // 50% chance to activate first aid
                    if (Math.random() < 0.5) {
                        ai.state = 'HEALING';
                        ai.timer = 2000; // 2 second cast (like a normal ability)
                        addFloatingText(state.enemyX, GROUND_Y - 140, "First Aid!", "green");
                    }
                    break; // only one threshold per tick
                }
            }
        }

        if (state.impactTimer > 0) {
            // Do nothing during impact freeze
        } else if (ai.state === 'FLEEING') {
            // FLEEING runs even during knockback. Enemy moves toward the right
            // flee zone at normal speed. Once IN the zone, a 5-second countdown
            // starts (like the player's). If the enemy leaves the zone (pushed
            // back by the player), the countdown resets. When it reaches 0,
            // handleEnemyFlee() fires.
            state.enemyX += state.enemy.speed;
            if (state.enemyX > ARENA_WIDTH - 30) state.enemyX = ARENA_WIDTH - 30;

            const inFleeZone = state.enemyX >= ARENA_WIDTH - FLEE_ZONE_WIDTH;
            if (inFleeZone) {
                if (state.enemyFleeCountdown < 0) {
                    state.enemyFleeCountdown = 3000;
                }
                state.enemyFleeCountdown -= dt;
                if (state.enemyFleeCountdown <= 0) {
                    handleEnemyFlee();
                    return;
                }
            } else {
                state.enemyFleeCountdown = -1;
            }
        } else if (Math.abs(state.enemyVx) < 0.5) {
            switch (ai.state) {
                case 'IDLE':
                    if (dist < 1000) ai.state = 'ADVANCE';
                    break;

                case 'ADVANCE': {
                    if (behavior.isRanged) {
                        // === Skirmisher (ranged, maintains distance) ===
                        const rangedAbility = state.enemy.abilities.find(a => a.effect === 'ranged');
                        if (rangedAbility) {
                            const idealRange = Math.min(rangedAbility.range, 300);
                            const minRange = 150;
                            const canCast = (state.enemyAbilityCooldowns[rangedAbility.id] || 0) <= 0;

                            if (dist > idealRange) {
                                state.enemyX -= state.enemy.speed;
                            } else if (dist < minRange) {
                                state.enemyX += state.enemy.speed * 0.8;
                            } else if (canCast) {
                                ai.state = 'CASTING';
                                ai.abilityToCast = rangedAbility;
                                const castTime = state.enemy.isBoss ? rangedAbility.castTime * 0.75 : rangedAbility.castTime;
                                ai.timer = castTime;
                                addFloatingText(state.enemyX, GROUND_Y - 140, "CASTING!", "fuchsia");
                            } else {
                                ai.state = 'COOLDOWN';
                                ai.timer = 500;
                            }
                        } else {
                            // Skirmisher without ranged ability: fight as normal melee
                            if (dist > meleeRange) {
                                state.enemyX -= state.enemy.speed;
                            } else {
                                const readyAbilities = state.enemy.abilities.filter(a => a.effect !== 'ranged' && (state.enemyAbilityCooldowns[a.id] || 0) <= 0);
                                if (readyAbilities.length > 0 && Math.random() < 0.4) {
                                    const ability = readyAbilities[Math.floor(Math.random() * readyAbilities.length)];
                                    ai.state = 'CASTING';
                                    ai.abilityToCast = ability;
                                    ai.timer = state.enemy.isBoss ? ability.castTime * 0.75 : ability.castTime;
                                    addFloatingText(state.enemyX, GROUND_Y - 140, "CASTING!", "fuchsia");
                                } else {
                                    ai.state = 'PREPARE';
                                    ai.timer = Math.max(50, 300 + Math.random() * 150);
                                }
                            }
                        }
                    } else {
                        // === Melee archetype (Berzerker, Aggressor, Defender) ===
                        // Roll pursue chance when first entering ADVANCE from COOLDOWN.
                        if (!ai.isPursuing && behavior.pursueChance < 1.0) {
                            ai.isPursuing = Math.random() < behavior.pursueChance;
                            if (!ai.isPursuing) {
                                // Decided not to pursue — hold position briefly
                                ai.state = 'COOLDOWN';
                                ai.timer = 800 + Math.random() * 800;
                                break;
                            }
                        }

                        if (dist > meleeRange) {
                            state.enemyX -= state.enemy.speed;
                        } else {
                            // In melee range — attack or use ability
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
                    }
                    break;
                }

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
                    // Tactical retreat (from Fear/crit) — back away at +50% speed.
                    // Fear makes the enemy scramble away faster than normal movement.
                    if (ai.timer > 0 && dist < retreatDistance) {
                        state.enemyX += state.enemy.speed * 1.5;
                    } else {
                        ai.state = 'COOLDOWN';
                        ai.timer = 200 + Math.random() * 200;
                    }
                    break;

                case 'HEALING':
                    // First Aid: maintain distance from player while casting.
                    // If the player gets too close, back away. After the cast
                    // completes (2 seconds), heal 25% maxHp. Interruptible by
                    // knockback (applyKnockback resets enemy AI to IDLE, which
                    // cancels the heal — same as any player cast).
                    if (dist < 200) {
                        state.enemyX += state.enemy.speed * 0.8;
                    }
                    if (ai.timer <= 0) {
                        const healAmount = Math.floor(state.enemy.maxHp * 0.25);
                        state.enemy.hp = Math.min(state.enemy.maxHp, state.enemy.hp + healAmount);
                        addFloatingText(state.enemyX, GROUND_Y - 100, `+${healAmount}`, "green");
                        addVFX('BUFF', state.enemyX, GROUND_Y, "green");
                        ai.state = 'COOLDOWN';
                        ai.timer = 500;
                    }
                    break;

                case 'FLEEING':
                    // Handled above in the FLEEING special case (runs even
                    // during knockback). This case is unreachable but kept
                    // for completeness.
                    break;

                case 'COOLDOWN':
                    if (ai.timer <= 0) {
                        ai.state = 'ADVANCE';
                        ai.isPursuing = false; // reset pursue decision for next cycle
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

        // Prevent enemy from overlapping player (except when fleeing — it runs past)
        if (ai.state !== 'FLEEING' && state.enemyX < state.playerX + 30) {
            state.enemyX = state.playerX + 30;
        }

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

        if (hit || p.life <= 0 || p.x < 0 || p.x > ARENA_WIDTH) {
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
           const baseBlock = 0.20 + (state.enemy.archetype === 'Defender' ? 0.10 : 0);
           const levelBlock = (state.stage * 0.75) / 100; 
           const blockChance = Math.min(0.40, baseBlock + levelBlock);
           isBlocked = Math.random() < blockChance;
      }

      if (isBlocked) {
           finalDmg = Math.ceil(finalDmg * 0.2);
           state.enemy.hp -= finalDmg;
           addFloatingText(state.enemyX, GROUND_Y - 80, "Blocked!", "white");
           state.impactTimer = 45;
           applyKnockback('enemy', 1.5);
           addVFX('IMPACT', state.enemyX, GROUND_Y - 40, "blue");
      } else {
           state.enemy.hp -= finalDmg;
           applyKnockback('enemy', 0.5);
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
               applyKnockback('enemy', 0.5);
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
                  applyKnockback('player', 3.5);
                  applyKnockback('enemy', 3.5);
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
                       applyKnockback('player', 3.5);
                       state.impactTimer = 30;
                       addVFX('IMPACT', state.playerX, GROUND_Y - 40, "gray");
                  } else {
                       state.playerHp -= dmg;
                       applyKnockback('player', 1.5);
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
               applyKnockback('player', 1.5);
          } else {
               applyKnockback('player', 0.5);
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
               applyKnockback('player', 1.5);
           } else {
               applyKnockback('player', 0.5);
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
                   const baseBlock = 0.20 + (state.enemy.archetype === 'Defender' ? 0.10 : 0);
                   const levelBlock = (state.stage * 0.75) / 100; 
                   const blockChance = Math.min(0.40, baseBlock + levelBlock);
                   isBlocked = Math.random() < blockChance;
               }

               if (isBlocked) {
                   addFloatingText(state.enemyX, GROUND_Y - 80, "Blocked!", "white");
                   const blockedDmg = Math.ceil(result.damage * 0.2);
                   state.enemy.hp -= blockedDmg;
                   state.impactTimer = 45;
                   applyKnockback('enemy', 3.5);
                   applyKnockback('player', 3.5);
                   addFloatingText(state.enemyX, GROUND_Y - 60, `-${blockedDmg}`, "gray");
                   addVFX('IMPACT', state.enemyX, GROUND_Y - 40, "blue");
               } else {
                   state.enemy.hp -= Math.floor(result.damage);
                   applyKnockback('enemy', 1.5);
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
                     const baseBlock = 0.20 + (state.enemy.archetype === 'Defender' ? 0.10 : 0);
                     const levelBlock = (state.stage * 0.75) / 100; 
                     const blockChance = Math.min(0.40, baseBlock + levelBlock);
                     isBlocked = Math.random() < blockChance;
                 }

                 if (isBlocked) {
                     const blockedDmg = Math.ceil(dmg * 0.2);
                     state.enemy.hp -= blockedDmg;
                     addFloatingText(state.enemyX, GROUND_Y - 80, "Blocked!", "white");
                     state.impactTimer = 45;
                     applyKnockback('enemy', 1.5);
                     applyKnockback('player', 1.5); 
                 } else {
                     state.enemy.hp -= Math.floor(dmg);
                     applyKnockback('enemy', 0.5);
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
                state.enemyX = Math.min(ARENA_WIDTH - 30, state.enemyX + dashDistance);
                applyKnockback('enemy', 0.5);
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
                 state.enemyX = Math.min(ARENA_WIDTH - 30, state.enemyX + pushDist);
                 applyKnockback('enemy', 0.5);
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

    // Apply level up immediately so HP refills right when the player
    // levels up (not only when they return to town). Update both the
    // gameState (so the next fight starts at full HP) and characterRef
    // (so calculateExitState doesn't re-apply the level up).
    if (isLevelUp) {
        let remainingExp = currentExp;
        let lvl = character.level;
        let attributePoints = character.attributePoints;
        let skillPoints = character.skillPoints;
        let needed = getExpForLevel(lvl);
        while (remainingExp >= needed) {
            remainingExp -= needed;
            lvl++;
            attributePoints = (attributePoints || 0) + 1;
            skillPoints = (skillPoints || 0) + 1;
            needed = getExpForLevel(lvl);
        }
        // Update characterRef so calculateExitState sees the new level
        const updatedChar = {
            ...characterRef.current,
            level: lvl,
            exp: remainingExp,
            attributePoints,
            skillPoints,
        };
        const newStats = calculateTotalStats(updatedChar);
        const newMaxHp = Math.max(10, getHp(newStats[Attribute.HT]));
        updatedChar.currentHp = newMaxHp;
        characterRef.current = updatedChar;
        // Refill playerHp in the gameState so the next fight starts at full
        state.playerHp = newMaxHp;
        state.playerMaxHp = newMaxHp;
    }

    setBattleSummary({ show: true, exp, gold, drops, isLevelUp });
    state.isPaused = true;
    state.enemy = null;
    drawGame();
  };

  // Enemy fled the battle by reaching the right flee zone. The player
  // "wins" the stage (it advances) but gets NO rewards — no exp, no gold,
  // no loot. The enemy escaped. No XP penalty for the player (unlike when
  // the player flees). Shows a battle summary with the enemyFled outcome
  // so the BattleSummary component can render the appropriate messaging.
  const handleEnemyFlee = () => {
    const state = gameState.current;
    addFloatingText(state.enemyX, GROUND_Y - 80, "ESCAPED!", "orange");
    addParticles(state.enemyX, GROUND_Y - 50, 20, 'orange');
    if (enemyContainerRef.current) enemyContainerRef.current.style.opacity = '0';
    setBattleSummary({ show: true, exp: 0, gold: 0, drops: [], isLevelUp: false, outcome: 'enemyFled' });
    state.isPaused = true;
    state.enemy = null;
    drawGame();
  };

  const handleContinueJourney = () => {
      const state = gameState.current;
      state.stage++;
      // Reset positions for the new arena: player at left spawn, camera at 0.
      state.playerX = PLAYER_SPAWN_X;
      state.cameraX = 0;
      state.fleeCountdown = -1;
      setHudStatic(prev => ({ ...prev, stage: state.stage }));
      setBattleSummary(null);
      state.isPaused = false;
      state.lastTime = performance.now();
      spawnEnemy();
  };

  const calculateExitState = () => {
      // Level up (if any) was already applied in handleEnemyDeath, which
      // updated characterRef.current with the new level/exp/HP. Here we
      // just merge in the accumulated rewards (exp/gold/loot from fights
      // that didn't trigger a level up, plus the stage number) and sync
      // currentHp from the gameState.
      const updatedChar = { ...characterRef.current };
      updatedChar.gold += gameState.current.goldGained;
      updatedChar.stash = [...updatedChar.stash, ...gameState.current.lootFound];
      updatedChar.maxStage = gameState.current.stage;
      updatedChar.currentHp = gameState.current.playerHp;
      return updatedChar;
  };

  const handleExit = () => {
      // If the player fled, use the pre-computed penalized character
      // stashed by handleFlee(). Otherwise compute normal exit state.
      const pending = (gameState.current as any).pendingFleeChar;
      if (pending) {
          (gameState.current as any).pendingFleeChar = null;
          onExit(pending);
      } else {
          onExit(calculateExitState());
      }
  };

  // Player fled the battle by staying in the left flee zone for 5 seconds.
  // Returns to town WITHOUT the current fight's rewards (exp/gold/loot are
  // discarded) and applies a 10% XP penalty on the current level's progress.
  // The penalty cannot cause a level-down: XP is floored at 0 (since
  // character.exp is "progress since last level up", not total XP).
  // No gold penalty. Stage does NOT advance (player stays on the same stage).
  // Shows a "You ran to fight another day" summary with only a Town button.
  const handleFlee = () => {
      const state = gameState.current;
      const updatedChar = { ...characterRef.current };
      updatedChar.currentHp = state.playerHp;
      updatedChar.maxStage = state.stage; // don't advance

      // XP penalty: lose 10% of current level progress, floored at 0
      const penalty = Math.floor(updatedChar.exp * 0.10);
      updatedChar.exp = Math.max(0, updatedChar.exp - penalty);

      // Show the "player fled" summary BEFORE exiting. The summary's Town
      // button calls onExit(updatedChar) to actually return to town.
      setBattleSummary({ show: true, exp: 0, gold: 0, drops: [], isLevelUp: false, outcome: 'playerFled', xpPenalty: penalty });
      state.isPaused = true;
      // Store the updated char so the BattleSummary's Town button can call onExit
      // with the penalized character. We stash it on the gameState ref.
      (state as any).pendingFleeChar = updatedChar;
      drawGame();
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
